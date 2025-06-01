/**
 * Add LQIP (Low-Quality Image Placeholders) styles to images in built HTML files
 * Usage: pnpm apply-lqip
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { exit } from 'node:process'
import { fileURLToPath } from 'node:url'
import glob from 'fast-glob'
import { parse as parseHTML } from 'node-html-parser'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.join(__dirname, '..', 'dist')
const lqipMapPath = path.join(__dirname, '..', 'src', 'assets', 'lqip-map.json')

/**
 * Extract image file path from src attribute
 * Handles both direct paths and _image URLs with href parameter
 */
function extractPathFromSrc(src: string): string | null {
  const hrefMatch = src.match(/href=([^&]+)/)
  if (hrefMatch) {
    try {
      return path.basename(decodeURIComponent(hrefMatch[1]))
    }
    catch {
      return null
    }
  }
  return path.basename(src)
}

/**
 * Find matching LQIP value using multi-level matching strategy
 * 1. Try direct match with original src
 * 2. Try match with extracted file path
 * 3. Try match by comparing basenames
 */
function findLqipValue(src: string, filePath: string, lqipMap: Record<string, number>): number | null {
  if (lqipMap[src])
    return lqipMap[src]

  if (lqipMap[filePath])
    return lqipMap[filePath]

  for (const key in lqipMap) {
    if (path.basename(key) === filePath) {
      return lqipMap[key]
    }
  }

  return null
}

async function main() {
  console.log('🔍 Adding LQIP styles...')

  // Load LQIP mapping data
  let lqipMap: Record<string, number>
  try {
    lqipMap = JSON.parse(await fs.readFile(lqipMapPath, 'utf-8'))
  }
  catch {
    console.error('❌ Failed to read or parse LQIP map')
    exit(1)
  }

  // Find all HTML files in build directory
  const htmlFiles = await glob('**/*.html', { cwd: distDir, absolute: true })
  console.log(`📋 Found ${htmlFiles.length} HTML files`)

  let totalImages = 0
  let updatedImages = 0

  // Process each HTML file
  for (const htmlFile of htmlFiles) {
    const content = await fs.readFile(htmlFile, 'utf-8')
    const root = parseHTML(content)
    const images = root.querySelectorAll('img')

    totalImages += images.length
    let hasChanges = false

    // Process each image in the HTML file
    for (const img of images) {
      const src = img.getAttribute('src')
      if (!src)
        continue

      const filePath = extractPathFromSrc(src)
      if (!filePath)
        continue

      // Try to find a matching LQIP value
      const lqipValue = findLqipValue(src, filePath, lqipMap)

      if (lqipValue) {
        // Add or update the style attribute with LQIP value
        const currentStyle = img.getAttribute('style') || ''
        if (!currentStyle.includes('--lqip:')) {
          const newStyle = currentStyle
            ? `${currentStyle}; --lqip:${lqipValue}`
            : `--lqip:${lqipValue}`
          img.setAttribute('style', newStyle)
          updatedImages++
          hasChanges = true
        }
      }
    }

    // Only write changes back to disk if needed
    if (hasChanges) {
      await fs.writeFile(htmlFile, root.toString())
    }
  }

  if (updatedImages > 0) {
    console.log(`✨ Done! Found ${totalImages} images, updated ${updatedImages} with LQIP styles`)
  }
  else {
    console.log(`✅ Done! Found ${totalImages} images, no updates needed`)
  }
}

main().catch((err) => {
  console.error('❌ Execution failed:', err)
  exit(1)
})
