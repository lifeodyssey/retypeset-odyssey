/**
 * Add LQIP (Low-Quality Image Placeholders) styles to images in built HTML files
 * Usage: pnpm apply-lqip
 */
import fs from 'node:fs/promises'
import { exit } from 'node:process'
import glob from 'fast-glob'
import { parse as parseHTML } from 'node-html-parser'

const distDir = 'dist'
const lqipMappingPath = 'src/assets/lqip-mapping.json'

async function applyLqipStyles() {
  console.log('🔍 Adding LQIP styles...')

  // Load LQIP mapping data
  let lqipMapping: Record<string, number>

  try {
    lqipMapping = JSON.parse(await fs.readFile(lqipMappingPath, 'utf-8'))
  }
  catch (error) {
    if (error.code === 'ENOENT')
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
    const root = parseHTML(await fs.readFile(filePath, 'utf-8'))
    const images = root.querySelectorAll('img')

    totalImages += images.length
    let hasChanges = false

    // Iterate through each image
    for (const img of images) {
      const src = img.getAttribute('src')
      if (!src)
        continue

      const imagePath = src.startsWith('/') ? src.slice(1) : src
      const lqipValue = lqipMapping[imagePath]

      if (lqipValue) {
        const currentStyle = img.getAttribute('style') || ''

        // Only add LQIP if not already present
        if (!currentStyle.includes('--lqip:')) {
          const newStyle = currentStyle
            ? `${currentStyle}; --lqip:${lqipValue}`
            : `--lqip:${lqipValue}`

          // Apply updated style and track changes
          img.setAttribute('style', newStyle)
          updatedImages++
          hasChanges = true
        }
      }
    }

    // Write changes to file if needed
    if (hasChanges) {
      await fs.writeFile(filePath, root.toString())
    }
  }

  // Log summary based on updates
  if (updatedImages > 0) {
    console.log(`✨ Done! Found ${totalImages} images, updated ${updatedImages} with LQIP styles`)
  }
  else {
    console.log(`✅ Done! Found ${totalImages} images, no updates needed`)
  }
}

applyLqipStyles().catch((error) => {
  console.error('❌ Execution failed:', error)
  exit(1)
})
