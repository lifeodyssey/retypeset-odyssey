import type { Buffer } from 'node:buffer'
import fs from 'node:fs/promises'
import quantize from '@lokesh.dhakar/quantize'
import glob from 'fast-glob'
import { getPixels } from 'ndarray-pixels'
import sharp from 'sharp'

/**
 * Convert RGB color to OKLab color space
 * https://github.com/Kalabasa/leanrada.com/blob/7b6739c7c30c66c771fcbc9e1dc8942e628c5024/main/scripts/update/lib/color/convert.mjs
 */
function rgbToOkLab(rgb: { r: number, g: number, b: number }) {
  // Convert to linear RGB
  const toLinear = (c: number) => {
    const normalized = Math.max(0, Math.min(255, c)) / 255
    return normalized >= 0.04045
      ? ((normalized + 0.055) / 1.055) ** 2.4
      : normalized / 12.92
  }

  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(toLinear)

  // Transform to LMS color space
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)

  // Transform to OKLab
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  }
}

/**
 * Extract dominant colors from images
 * https://github.com/Kalabasa/leanrada.com/blob/7b6739c7c30c66c771fcbc9e1dc8942e628c5024/main/scripts/update/lib/color/thief.mjs
 */

// Sample image pixels at quality intervals
function createPixelArray(pixels: Uint8Array | Uint8ClampedArray, pixelCount: number, quality: number): number[][] {
  const pixelArray: number[][] = []
  const maxOffset = pixels.length - 3

  for (let i = 0; i < pixelCount; i += quality) {
    const offset = i * 4
    if (offset > maxOffset)
      break

    pixelArray.push([
      pixels[offset], // r
      pixels[offset + 1], // g
      pixels[offset + 2], // b
    ])
  }

  return pixelArray
}

// Validate and normalize color extraction options
function validateOptions({ colorCount = 10, quality = 10 } = {}) {
  if (colorCount === 1) {
    throw new Error('colorCount should be between 2 and 20. Use getColor() for single color extraction')
  }

  return {
    colorCount: Math.max(2, Math.min(20, Number.isInteger(colorCount) ? colorCount : 10)),
    quality: Math.max(1, Number.isInteger(quality) && quality > 0 ? quality : 10),
  }
}

// Process image into pixel array format
async function loadImg(img: Buffer | string) {
  try {
    const instance = sharp(img)
    const [buffer, { format }] = await Promise.all([
      instance.toBuffer(),
      instance.metadata(),
    ])

    if (!format)
      throw new Error('Invalid image format')
    return await getPixels(buffer, format)
  }
  catch (error) {
    throw new Error(`Image processing failed: ${(error as Error)?.message ?? 'unknown error'}`)
  }
}

// Extract the dominant color from image
export async function getColor(img: Buffer | string, quality = 10): Promise<number[] | null> {
  const palette = await getPalette(img, 5, quality)
  return palette.length > 0 ? palette[0] : null
}

// Extract color palette using quantization
export async function getPalette(img: Buffer | string, colorCount = 10, quality = 10): Promise<number[][]> {
  try {
    const options = validateOptions({ colorCount, quality })
    const imgData = await loadImg(img)
    const pixelCount = imgData.shape[0] * imgData.shape[1]
    const pixelArray = createPixelArray(imgData.data, pixelCount, options.quality)

    return quantize(pixelArray, options.colorCount)?.palette() ?? []
  }
  catch (error) {
    if (error instanceof Error && error.message.includes('colorCount')) {
      throw error
    }
    return []
  }
}

/**
 * LQIP core algorithm
 * Compresses images into compact 19-bit integers representing dominant colors and tiny previews
 * https://github.com/Kalabasa/leanrada.com/blob/7b6739c7c30c66c771fcbc9e1dc8942e628c5024/main/scripts/update/lqip.mjs#L118-L159
 */

const distDir = 'dist'
const assetsDir = 'src/assets'
const mapFilePath = `${assetsDir}/lqip-mapping.json`

const LQIP_BASE_VALUE = -(2 ** 19)
const PIXEL_MAX_VALUE = 0b11
const L_MAX_VALUE = 0b11
const A_MAX_VALUE = 0b111
const B_MAX_VALUE = 0b111
const MAX_COLOR_SCALE = 0b1000

const BIT_SHIFTS = {
  PIXEL_A: 18,
  PIXEL_B: 16,
  PIXEL_C: 14,
  PIXEL_D: 12,
  PIXEL_E: 10,
  PIXEL_F: 8,
  L: 6,
  A: 3,
  B: 0,
}

// Generate LQIP value from image
async function generateLqipValue(imagePath: string): Promise<number | null> {
  try {
    const theSharp = sharp(imagePath)
    const [stats, previewBuffer, dominantColor] = await Promise.all([
      theSharp.stats(),
      theSharp
        .resize(3, 2, { fit: 'fill' })
        .sharpen({ sigma: 1 })
        .removeAlpha()
        .toFormat('raw', { bitdepth: 8 })
        .toBuffer(),
      getPalette(imagePath, 4, 10).then((palette) => {
        if (!palette?.length) {
          throw new Error('Failed to extract color palette')
        }
        return palette[0]
      }),
    ])

    if (!stats.isOpaque) {
      return null
    }

    const { L: rawBaseL, a: rawBaseA, b: rawBaseB } = rgbToOkLab({
      r: dominantColor[0],
      g: dominantColor[1],
      b: dominantColor[2],
    })

    const { ll, aaa, bbb } = findOklabBits(rawBaseL, rawBaseA, rawBaseB)
    const { L: baseL } = bitsToLab(ll, aaa, bbb)
    const pixelValues = Array.from({ length: 6 }, (_, i) => {
      const offset = i * 3
      const { L } = rgbToOkLab({
        r: previewBuffer[offset],
        g: previewBuffer[offset + 1],
        b: previewBuffer[offset + 2],
      })
      const clampedValue = Math.min(1, Math.max(0, 0.5 + L - baseL))
      return Math.round(clampedValue * PIXEL_MAX_VALUE)
    })

    const lqip = LQIP_BASE_VALUE
      + ((pixelValues[0] & PIXEL_MAX_VALUE) << BIT_SHIFTS.PIXEL_A)
      + ((pixelValues[1] & PIXEL_MAX_VALUE) << BIT_SHIFTS.PIXEL_B)
      + ((pixelValues[2] & PIXEL_MAX_VALUE) << BIT_SHIFTS.PIXEL_C)
      + ((pixelValues[3] & PIXEL_MAX_VALUE) << BIT_SHIFTS.PIXEL_D)
      + ((pixelValues[4] & PIXEL_MAX_VALUE) << BIT_SHIFTS.PIXEL_E)
      + ((pixelValues[5] & PIXEL_MAX_VALUE) << BIT_SHIFTS.PIXEL_F)
      + ((ll & L_MAX_VALUE) << BIT_SHIFTS.L)
      + ((aaa & A_MAX_VALUE) << BIT_SHIFTS.A)
      + (bbb & B_MAX_VALUE)

    return lqip
  }
  catch (error) {
    console.error(`Error processing image ${imagePath}:`, error)
    return null
  }
}

// Find optimal bit representation for OKLab colors
function findOklabBits(targetL: number, targetA: number, targetB: number) {
  const targetChroma = Math.hypot(targetA, targetB)
  const scaledTargetA = targetA / (1e-6 + targetChroma ** 0.5)
  const scaledTargetB = targetB / (1e-6 + targetChroma ** 0.5)

  let bestBits = [0, 0, 0]
  let bestDifference = Infinity

  for (let lli = 0; lli <= L_MAX_VALUE; lli++) {
    for (let aaai = 0; aaai <= A_MAX_VALUE; aaai++) {
      for (let bbbi = 0; bbbi <= B_MAX_VALUE; bbbi++) {
        const { L, a, b } = bitsToLab(lli, aaai, bbbi)
        const chroma = Math.hypot(a, b)
        const scaledA = a / (1e-6 + chroma ** 0.5)
        const scaledB = b / (1e-6 + chroma ** 0.5)

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

// Convert bit representation to OKLab color
function bitsToLab(ll: number, aaa: number, bbb: number) {
  const L = (ll / L_MAX_VALUE) * 0.6 + 0.2
  const a = (aaa / MAX_COLOR_SCALE) * 0.7 - 0.35
  const b = ((bbb + 1) / MAX_COLOR_SCALE) * 0.7 - 0.35
  return { L, a, b }
}

/**
 * LQIP映射生成主函数
 * 功能：查找网站中的WebP图片，为每张图片生成Low-Quality Image Placeholder值，
 * 并将结果保存到映射文件中，用于网站加载优化
 */

// 加载并清理LQIP映射
async function loadAndCleanLqipMap(webpFiles: string[]) {
  try {
    // 读取现有映射文件
    const existingMapData = await fs.readFile(mapFilePath, 'utf-8')
      .catch(() => null)

    // 解析为映射对象
    const existingLqipMap = JSON.parse(existingMapData ?? '{}') as Record<string, number>

    // 创建当前路径集合
    const currentPaths = new Set(
      webpFiles.map(path => path.replace(`${distDir}/`, '')),
    )

    // 过滤出仍然存在的映射项
    return Object.fromEntries(
      Object.entries(existingLqipMap)
        .filter(([path]) => currentPaths.has(path)),
    )
  }
  catch {
    return {}
  }
}

// 处理图片生成LQIP数据
async function processImages(webpFiles: string[], existingLqipMap: Record<string, number>) {
  const lqipMap: Record<string, number> = {}
  let processed = 0
  let reused = 0
  let newGenerated = 0
  let failed = 0

  for (const filePath of webpFiles) {
    const cleanPath = filePath.replace(`${distDir}`, '')

    // 复用已有LQIP值
    if (existingLqipMap[cleanPath] !== undefined) {
      lqipMap[cleanPath] = existingLqipMap[cleanPath]
      reused++

      processed++
      if (processed % 10 === 0)
        console.log(`进度: ${processed}/${webpFiles.length} 图片处理中`)
      continue
    }

    // 生成新LQIP值
    const lqipValue = await generateLqipValue(filePath)
    if (lqipValue === null) {
      failed++
      console.log(`警告：图片处理失败 ${filePath}`)
    }
    else {
      lqipMap[cleanPath] = lqipValue
      newGenerated++
    }

    processed++
    if (processed % 10 === 0)
      console.log(`进度: ${processed}/${webpFiles.length} 图片处理中`)
  }

  return { lqipMap, stats: { processed, reused, newGenerated, failed } }
}

// 主函数整合所有步骤
async function main() {
  console.log('开始生成LQIP映射...')

  // 确保assets目录存在，不存在则创建
  try {
    await fs.access(assetsDir)
  }
  catch {
    await fs.mkdir(assetsDir, { recursive: true })
  }

  // 查找所有生成的WebP图片
  const webpFiles = await glob(`${distDir}/_astro/**/*.webp`)
  console.log(`找到${webpFiles.length}个webp文件`)

  const existingLqipMap = await loadAndCleanLqipMap(webpFiles)
  const { lqipMap, stats } = await processImages(webpFiles, existingLqipMap)

  // 保存LQIP映射
  try {
    await fs.writeFile(mapFilePath, JSON.stringify(lqipMap, null, 2))
    console.log(`LQIP映射已保存至: ${mapFilePath}`)
  }
  catch (error) {
    console.error(`保存LQIP映射文件失败: ${(error as Error)?.message ?? '未知错误'}`)
  }

  // 输出最终统计信息
  console.log(`成功处理图片：${stats.processed}/${webpFiles.length}`)
  console.log(`复用现有LQIP值: ${stats.reused}，新生成LQIP值: ${stats.newGenerated}，处理失败: ${stats.failed}`)
}

main().catch(console.error)
