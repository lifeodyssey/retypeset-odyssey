/**
 * Add LQIP (Low-Quality Image Placeholders) styles to images in built HTML files
 * Usage: pnpm apply-lqip
 */
import fs from 'node:fs/promises'
import { exit } from 'node:process'
import glob from 'fast-glob'
import { parse as parseHTML } from 'node-html-parser'

const distDir = 'dist'
const lqipMapPath = 'src/assets/lqip-mapping.json'

async function applyLqipStyles() {
  console.log('🔍 Adding LQIP styles...')

  // Load LQIP mapping data
  let lqipMap: Record<string, number>

  try {
    lqipMap = JSON.parse(await fs.readFile(lqipMapPath, 'utf-8'))
  }
  catch (error) {
    // If the file does not exist, return
    if ((error as { code?: string })?.code === 'ENOENT')
      return

    console.error('❌ Failed to parse LQIP mapping file')
    exit(1)
  }

  // Find all HTML files
  const htmlFiles = await glob('**/*.html', { cwd: distDir })
  console.log(`📋 Found ${htmlFiles.length} HTML files`)

  let totalImages = 0
  let updatedImages = 0

  // Iterate through each HTML file
  for (const htmlFile of htmlFiles) {
    const filePath = `${distDir}/${htmlFile}`

    // Parse HTML content
    const root = parseHTML(await fs.readFile(filePath, 'utf-8'))
    const images = root.querySelectorAll('img')

    totalImages += images.length
    let hasChanges = false

    // Process each image in the HTML file
    for (const img of images) {
      const src = img.getAttribute('src')
      if (!src)
        continue

      // Check if image has a corresponding LQIP value
      const imagePath = src
      const lqipValue = lqipMap[imagePath]
      if (!lqipValue)
        continue

      // Skip if LQIP style already exists
      const currentStyle = img.getAttribute('style') ?? ''
      if (currentStyle.includes('--lqip:'))
        continue

      // Create new style with LQIP value
      const newStyle = currentStyle
        ? `${currentStyle}; --lqip:${lqipValue}`
        : `--lqip:${lqipValue}`

      // Apply the new style to the image
      img.setAttribute('style', newStyle)
      updatedImages++
      hasChanges = true
    }

    // Skip writing if no changes were made
    if (!hasChanges)
      continue

    // Write changes to file
    await fs.writeFile(filePath, root.toString())
  }

  // Log summary based on updates
  if (updatedImages === 0) {
    console.log(`✅ Done! Found ${totalImages} images, no updates needed`)
    return
  }

  console.log(`✨ Done! Found ${totalImages} images, updated ${updatedImages} with LQIP styles`)
}

applyLqipStyles().catch((error) => {
  console.error('❌ Execution failed:', (error as Error)?.message ?? String(error))
  exit(1)
})
