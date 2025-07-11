/**
 * Apply LQIP (Low-Quality Image Placeholders) styles to HTML images from LQIP mapping
 * Usage: pnpm apply-lqip
 */

import fs from 'node:fs/promises'
import { exit } from 'node:process'
import glob from 'fast-glob'
import { parse as parseHTML } from 'node-html-parser'

const distDir = 'dist'
const lqipMapPath = 'src/assets/lqip-map.json'

interface ProcessingStats {
  totalImages: number
  updatedImages: number
}
interface LqipMap {
  [path: string]: number
}

// Load LQIP mapping data from JSON file
async function loadLqipMap(): Promise<LqipMap | null> {
  try {
    const content = await fs.readFile(lqipMapPath, 'utf-8')
    return JSON.parse(content)
  }
  catch (error) {
    // If the file does not exist, return null
    if ((error as { code?: string })?.code === 'ENOENT') {
      return null
    }

    console.error('⚠️ Failed to parse LQIP mapping file:', error)
    exit(1)
  }
}

// Get all HTML files from dist directory
async function getHtmlFiles(): Promise<string[]> {
  console.log('🔍 Scanning HTML files in dist/...')
  const htmlFiles = await glob('**/*.html', { cwd: distDir })
  return htmlFiles
}

// Process a single image element, applying LQIP style if needed
function processImage(img: any, lqipMap: LqipMap): boolean {
  const src = img.getAttribute('src')
  if (!src) {
    return false
  }

  // Check if image has a corresponding LQIP value
  const lqipValue = lqipMap[src]
  if (lqipValue === undefined) {
    return false
  }

  // Skip if LQIP style already exists
  const currentStyle = img.getAttribute('style') ?? ''
  if (currentStyle.includes('--lqip:')) {
    return false
  }

  // Create new style with LQIP value
  const newStyle = currentStyle
    ? `${currentStyle}; --lqip:${lqipValue}`
    : `--lqip:${lqipValue}`

  // Apply the new style to the image
  img.setAttribute('style', newStyle)
  return true
}

// Process a single HTML file
async function processHtmlFile(
  htmlFile: string,
  lqipMap: LqipMap,
): Promise<{ totalImages: number, updatedImages: number }> {
  const filePath = `${distDir}/${htmlFile}`

  // Parse HTML content
  const root = parseHTML(await fs.readFile(filePath, 'utf-8'))
  const images = root.querySelectorAll('img')

  let updatedImages = 0
  let hasChanges = false

  // Process each image in the HTML file
  for (const img of images) {
    const wasUpdated = processImage(img, lqipMap)
    if (wasUpdated) {
      updatedImages++
      hasChanges = true
    }
  }

  // Write changes to file if any updates were made
  if (hasChanges) {
    await fs.writeFile(filePath, root.toString())
  }

  return {
    totalImages: images.length,
    updatedImages,
  }
}

// Report processing results
function reportResults(stats: ProcessingStats, htmlFileCount: number) {
  console.log(`📦 Found ${stats.totalImages} images in ${htmlFileCount} HTML files`)

  if (stats.updatedImages === 0) {
    console.log(`✅ All ${stats.totalImages} images already have LQIP styles`)
  }
  else {
    console.log(`✨ Successfully applied LQIP styles to ${stats.updatedImages} images`)
  }
}

// Main function to apply LQIP styles to all HTML files
async function applyLqipStyles(): Promise<void> {
  // Load LQIP mapping data
  const lqipMap = await loadLqipMap()
  if (!lqipMap) {
    return
  }

  // Get all HTML files to process
  const htmlFiles = await getHtmlFiles()

  // Process all HTML files
  const stats: ProcessingStats = { totalImages: 0, updatedImages: 0 }

  for (const htmlFile of htmlFiles) {
    const fileStats = await processHtmlFile(htmlFile, lqipMap)
    stats.totalImages += fileStats.totalImages
    stats.updatedImages += fileStats.updatedImages
  }

  // Report results
  reportResults(stats, htmlFiles.length)
}

applyLqipStyles().catch((error) => {
  console.error('❌ Failed to apply LQIP styles:', error)
  exit(1)
})
