import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import quantize from '@lokesh.dhakar/quantize'
import glob from 'fast-glob'
import { getPixels } from 'ndarray-pixels'
import sharp from 'sharp'

// 从color-convert.mjs内联的代码pnpm depcheck
function rgbToOkLab(rgb: { r: number, g: number, b: number }) {
  return rgb_to_oklab(rgb)
}

function rgb_to_oklab(c: { r: number, g: number, b: number }) {
  const r = gamma_inv(c.r / 255)
  const g = gamma_inv(c.g / 255)
  const b = gamma_inv(c.b / 255)

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)

  return {
    L: l * +0.2104542553 + m * +0.793617785 + s * -0.0040720468,
    a: l * +1.9779984951 + m * -2.428592205 + s * +0.4505937099,
    b: l * +0.0259040371 + m * +0.7827717662 + s * -0.808675766,
  }
}

function gamma_inv(x: number): number {
  return x >= 0.04045 ? ((x + 0.055) / (1.055)) ** 2.4 : x / 12.92
}

// 从thief.mjs内联的代码
function createPixelArray(pixels: Uint8Array, pixelCount: number, quality: number): number[][] {
  const pixelArray: number[][] = []

  for (let i = 0; i < pixelCount; i += quality) {
    const offset = i * 4
    const r = pixels[offset]!
    const g = pixels[offset + 1]!
    const b = pixels[offset + 2]!

    // MODIFIED FROM ORIGINAL: REMOVE FILTER
    // If pixel is mostly opaque and not white
    // if ((typeof a === 'undefined' || a >= 125) && !(r > 250 && g > 250 && b > 250))
    pixelArray.push([r, g, b])
  }

  return pixelArray
}

function validateOptions(options: { colorCount?: number, quality?: number }) {
  let { colorCount, quality } = options

  if (typeof colorCount === 'undefined' || !Number.isInteger(colorCount)) {
    colorCount = 10
  }
  else if (colorCount === 1) {
    throw new Error(
      '`colorCount` should be between 2 and 20. To get one color, call `getColor()` instead of `getPalette()`',
    )
  }
  else {
    colorCount = Math.max(colorCount, 2)
    colorCount = Math.min(colorCount, 20)
  }

  if (
    typeof quality === 'undefined'
    || !Number.isInteger(quality)
    || quality < 1
  ) {
    quality = 10
  }

  return { colorCount, quality }
}

interface NdArray {
  data: Uint8Array
  shape: number[]
}

async function loadImg(img: string): Promise<NdArray> {
  const buffer = await sharp(img).toBuffer()
  const metadata = await sharp(buffer).metadata()
  const result = await getPixels(buffer, metadata.format as string)
  return result
}

function getPalette(img: string, colorCount = 10, quality = 10): Promise<number[][]> {
  const options = validateOptions({ colorCount, quality })

  return loadImg(img).then((imgData) => {
    const pixelCount = imgData.shape[0] * imgData.shape[1]
    const pixelArray = createPixelArray(
      imgData.data,
      pixelCount,
      options.quality,
    )

    const cmap = quantize(pixelArray, options.colorCount)
    const palette = cmap ? cmap.palette() : null

    return palette || []
  })
}

// 获取项目根目录
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, '..')
const distDir = path.join(rootDir, 'dist')
const assetsDir = path.join(rootDir, 'src', 'assets')

// LQIP生成逻辑从src/plugins/lqip/lqip.mjs中提取的核心算法
async function generateLqipValue(imagePath: string): Promise<number | null> {
  try {
    const theSharp = sharp(imagePath)
    const stats = await theSharp.stats()

    // 不透明检查
    if (!stats.isOpaque) {
      return null
    }

    // 提取主色调和低分辨率预览
    const [previewBuffer, dominantColor] = await Promise.all([
      theSharp
        .resize(3, 2, { fit: 'fill' })
        .sharpen({ sigma: 1 })
        .removeAlpha()
        .toFormat('raw', { bitdepth: 8 })
        .toBuffer(),
      getPalette(imagePath, 4, 10).then((palette) => {
        if (!palette || palette.length === 0) {
          throw new Error('无法提取颜色调色板')
        }
        return palette[0]
      }),
    ])

    // 计算基础颜色Lab值
    const { L: rawBaseL, a: rawBaseA, b: rawBaseB } = rgbToOkLab({
      r: dominantColor[0],
      g: dominantColor[1],
      b: dominantColor[2],
    })

    // 找到最合适的位表示
    const { ll, aaa, bbb } = findOklabBits(rawBaseL, rawBaseA, rawBaseB)

    // 计算低分辨率图亮度值
    const { L: baseL } = bitsToLab(ll, aaa, bbb)
    const cells = Array.from({ length: 6 }, (_, index) => {
      const r = previewBuffer.readUint8(index * 3)
      const g = previewBuffer.readUint8(index * 3 + 1)
      const b = previewBuffer.readUint8(index * 3 + 2)
      return rgbToOkLab({ r, g, b })
    })
    const values = cells.map(({ L }) => clamp(0.5 + L - baseL, 0, 1))

    // 位打包
    const ca = Math.round(values[0] * 0b11)
    const cb = Math.round(values[1] * 0b11)
    const cc = Math.round(values[2] * 0b11)
    const cd = Math.round(values[3] * 0b11)
    const ce = Math.round(values[4] * 0b11)
    const cf = Math.round(values[5] * 0b11)

    // 生成最终的LQIP值
    const lqip = -(2 ** 19)
      + ((ca & 0b11) << 18)
      + ((cb & 0b11) << 16)
      + ((cc & 0b11) << 14)
      + ((cd & 0b11) << 12)
      + ((ce & 0b11) << 10)
      + ((cf & 0b11) << 8)
      + ((ll & 0b11) << 6)
      + ((aaa & 0b111) << 3)
      + (bbb & 0b111)

    return lqip
  }
  catch (error) {
    console.error(`Error processing ${imagePath}:`, error)
    return null
  }
}

// 辅助函数从lqip.mjs复制
function findOklabBits(targetL: number, targetA: number, targetB: number) {
  const targetChroma = Math.hypot(targetA, targetB)
  const scaledTargetA = scaleComponentForDiff(targetA, targetChroma)
  const scaledTargetB = scaleComponentForDiff(targetB, targetChroma)

  let bestBits = [0, 0, 0]
  let bestDifference = Infinity

  for (let lli = 0; lli <= 0b11; lli++) {
    for (let aaai = 0; aaai <= 0b111; aaai++) {
      for (let bbbi = 0; bbbi <= 0b111; bbbi++) {
        const { L, a, b } = bitsToLab(lli, aaai, bbbi)
        const chroma = Math.hypot(a, b)
        const scaledA = scaleComponentForDiff(a, chroma)
        const scaledB = scaleComponentForDiff(b, chroma)

        const difference = Math.hypot(
          L - targetL,
          scaledA - scaledTargetA,
          scaledB - scaledTargetB,
        )

        if (difference < bestDifference) {
          bestDifference = difference
          bestBits = [lli, aaai, bbbi]
        }
      }
    }
  }

  return { ll: bestBits[0], aaa: bestBits[1], bbb: bestBits[2] }
}

function scaleComponentForDiff(x: number, chroma: number) {
  return x / (1e-6 + chroma ** 0.5)
}

function bitsToLab(ll: number, aaa: number, bbb: number) {
  const L = (ll / 0b11) * 0.6 + 0.2
  const a = (aaa / 0b1000) * 0.7 - 0.35
  const b = ((bbb + 1) / 0b1000) * 0.7 - 0.35
  return { L, a, b }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

// 主函数
async function main() {
  console.log('开始生成LQIP映射...')

  // 查找所有webp图片
  const webpFiles = await glob('_astro/**/*.webp', {
    cwd: distDir,
    absolute: true,
  })

  console.log(`找到${webpFiles.length}个webp文件`)

  // 生成映射表
  const lqipMap: Record<string, number> = {}
  let processed = 0

  for (const filePath of webpFiles) {
    const relativePath = path.relative(distDir, filePath)
    const lqipValue = await generateLqipValue(filePath)

    if (lqipValue !== null) {
      lqipMap[relativePath] = lqipValue
      processed++

      if (processed % 10 === 0)
        console.log(`已处理: ${processed}/${webpFiles.length}`)
    }
  }

  // 确保assets目录存在
  try {
    await fs.mkdir(assetsDir, { recursive: true })
  }
  catch {
    // 目录已存在时忽略错误
  }

  // 保存映射表到src/assets
  const mapFilePath = path.join(assetsDir, 'lqip-map.json')
  await fs.writeFile(mapFilePath, JSON.stringify(lqipMap, null, 2))

  console.log(`LQIP映射已保存至: ${mapFilePath}`)
  console.log(`成功处理了${processed}/${webpFiles.length}个图片`)
}

main().catch(console.error)
