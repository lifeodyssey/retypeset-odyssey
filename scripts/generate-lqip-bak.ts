/**
 * Generate LQIP (Low-Quality Image Placeholders) mapping for images
 * Usage: pnpm generate-lqip
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import quantize from '@lokesh.dhakar/quantize'
import glob from 'fast-glob'
import { getPixels } from 'ndarray-pixels'
import sharp from 'sharp'

// Convert RGB colors to OKLab color space
// https://github.com/Kalabasa/leanrada.com/blob/7b6739c7c30c66c771fcbc9e1dc8942e628c5024/main/scripts/update/lib/color/convert.mjs
export function rgbToOkLab(rgb) {
  return rgb_to_oklab(rgb)
}

function rgb_to_oklab(c) {
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

function gamma_inv(x) {
  return x >= 0.04045 ? ((x + 0.055) / (1.055)) ** 2.4 : x / 12.92
}

// Extract dominant colors from images
// https://github.com/Kalabasa/leanrada.com/blob/7b6739c7c30c66c771fcbc9e1dc8942e628c5024/main/scripts/update/lib/color/thief.mjs
function createPixelArray(pixels: Uint8Array, pixelCount: number, quality: number): number[][] {
  const pixelArray: number[][] = []

  for (let i = 0; i < pixelCount; i += quality) {
    const offset = i * 4
    const r = pixels[offset] ?? 0
    const g = pixels[offset + 1] ?? 0
    const b = pixels[offset + 2] ?? 0

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

// LQIP
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, '..')
const distDir = path.join(rootDir, 'dist')
const assetsDir = path.join(rootDir, 'src', 'assets')

function packLqipBits(values: number[], ll: number, aaa: number, bbb: number): number {
  const [ca, cb, cc, cd, ce, cf] = values.map(v => Math.round(v * 0b11))

  return -(2 ** 19)
    + ((ca & 0b11) << 18)
    + ((cb & 0b11) << 16)
    + ((cc & 0b11) << 14)
    + ((cd & 0b11) << 12)
    + ((ce & 0b11) << 10)
    + ((cf & 0b11) << 8)
    + ((ll & 0b11) << 6)
    + ((aaa & 0b111) << 3)
    + (bbb & 0b111)
}

async function generateLqipValue(imagePath: string): Promise<number | null> {
  let theSharp: sharp.Sharp | null = null

  try {
    theSharp = sharp(imagePath)
    const stats = await theSharp.stats()

    if (!stats.isOpaque) {
      return null
    }

    const [previewBuffer, dominantColor] = await Promise.all([
      theSharp
        .resize(3, 2, { fit: 'fill' })
        .sharpen({ sigma: 1 })
        .removeAlpha()
        .toFormat('raw', { bitdepth: 8 })
        .toBuffer(),
      getPalette(imagePath, 4, 10).then((palette) => {
        if (!palette || palette.length === 0) {
          throw new Error('Failed to extract color palette')
        }
        return palette[0]
      }),
    ])

    const [r, g, b] = dominantColor
    const { L: rawBaseL, a: rawBaseA, b: rawBaseB } = rgbToOkLab({ r, g, b })

    const { ll, aaa, bbb } = findOklabBits(rawBaseL, rawBaseA, rawBaseB)

    const { L: baseL } = bitsToLab(ll, aaa, bbb)

    const cells = Array.from({ length: 6 }, (_, index) => {
      const offset = index * 3
      if (offset + 2 >= previewBuffer.length) {
        console.warn(`Buffer insufficient for 6 pixels (${previewBuffer.length} bytes)`)
        return rgbToOkLab({ r: 0, g: 0, b: 0 })
      }
      const r = previewBuffer.readUint8(offset)
      const g = previewBuffer.readUint8(offset + 1)
      const b = previewBuffer.readUint8(offset + 2)
      return rgbToOkLab({ r, g, b })
    })

    const values = cells.map(({ L }) => clamp(0.5 + L - baseL, 0, 1))

    const lqip = packLqipBits(values, ll, aaa, bbb)

    return lqip
  }
  catch (error) {
    console.error(`Error processing ${imagePath}:`, error)
    return null
  }
  finally {
    theSharp?.destroy?.()
  }
}

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

function logProgress(current: number, total: number, success: number, failed: number) {
  console.log(`🔄 Processed: ${current}/${total} (Success: ${success}, Failed: ${failed})`)
}

async function main() {
  console.log('🔍 Scanning webp files...')

  const webpFiles = await glob('_astro/**/*.webp', {
    cwd: distDir,
    absolute: true,
  })

  console.log(`📁 Found ${webpFiles.length} webp files`)

  if (webpFiles.length === 0) {
    console.log('⚠️ No webp files found')
    return
  }

  const lqipMap: Record<string, number> = {}
  let processed = 0
  let failed = 0

  for (let i = 0; i < webpFiles.length; i += 10) {
    const batch = webpFiles.slice(i, i + 10)

    const batchResults = await Promise.allSettled(
      batch.map(async (filePath) => {
        const relativePath = path.relative(distDir, filePath)
        const lqipValue = await generateLqipValue(filePath)
        return { relativePath, lqipValue }
      }),
    )

    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const { relativePath, lqipValue } = result.value
        if (lqipValue !== null) {
          lqipMap[relativePath] = lqipValue
          processed++
        }
        else {
          failed++
        }
      }
      else {
        failed++
        const filePath = batch[index]
        console.error(`❌ Processing failed: ${filePath}`)
      }
    })

    logProgress(processed + failed, webpFiles.length, processed, failed)
  }

  try {
    await fs.mkdir(assetsDir, { recursive: true })
  }
  catch {
  }

  const mapFilePath = path.join(assetsDir, 'lqip-mapping.json')
  await fs.writeFile(mapFilePath, JSON.stringify(lqipMap, null, 2))

  console.log(`✅ Done! Processed ${webpFiles.length} images (Success: ${processed}, Failed: ${failed})`)
  console.log(`📁 LQIP mapping saved to: ${mapFilePath}`)

  if (failed > 0) {
    console.log(`⚠️ ${failed} files failed to process`)
  }
}

main().catch((error) => {
  console.error('❌ Execution failed:', error)
  process.exit(1)
})
