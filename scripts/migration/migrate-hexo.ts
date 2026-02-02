/**
 * ONE-TIME MIGRATION SCRIPT
 *
 * Migrates blog posts from Hexo (Blog-src) to Astro format.
 * Run once at the start of the migration project.
 *
 * Usage: pnpm tsx scripts/migration/migrate-hexo.ts
 */

import fs from 'node:fs'
import path from 'node:path'

// Configuration - adjust paths as needed
const HEXO_POSTS_DIR = '../Blog-src/source/_posts'
const ASTRO_POSTS_DIR = './content/posts'

interface HexoFrontmatter {
  title: string
  date: string
  tags?: string | string[]
  categories?: string | string[]
  abbrlink?: string
  mathjax?: boolean
  copyright?: string
}

function parseHexoFrontmatter(content: string): { frontmatter: HexoFrontmatter; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) {
    throw new Error('Invalid frontmatter format')
  }

  const yamlContent = match[1]
  const body = match[2]

  // Simple YAML parsing for common fields
  const frontmatter: HexoFrontmatter = {
    title: '',
    date: '',
  }

  const lines = yamlContent.split('\n')
  let currentKey = ''
  let inArray = false
  let arrayValues: string[] = []

  for (const line of lines) {
    if (line.match(/^(\w+):/)) {
      // Save previous array if exists
      if (inArray && currentKey) {
        (frontmatter as any)[currentKey] = arrayValues
        arrayValues = []
        inArray = false
      }

      const [key, ...valueParts] = line.split(':')
      currentKey = key.trim()
      const value = valueParts.join(':').trim()

      if (value) {
        (frontmatter as any)[currentKey] = value
      }
    } else if (line.match(/^\s+-\s+/)) {
      // Array item
      inArray = true
      const value = line.replace(/^\s+-\s+/, '').trim()
      arrayValues.push(value)
    }
  }

  // Save final array if exists
  if (inArray && currentKey) {
    (frontmatter as any)[currentKey] = arrayValues
  }

  return { frontmatter, body }
}

function convertToAstroFrontmatter(hexo: HexoFrontmatter): string {
  const lines: string[] = ['---']

  // Required fields
  lines.push(`title: "${hexo.title.replace(/"/g, '\\"')}"`)
  lines.push(`date: ${hexo.date}`)

  // Optional abbrlink (critical for URL preservation)
  if (hexo.abbrlink) {
    lines.push(`abbrlink: ${hexo.abbrlink}`)
  }

  // Tags
  if (hexo.tags) {
    const tags = Array.isArray(hexo.tags) ? hexo.tags : [hexo.tags]
    lines.push('tags:')
    tags.forEach(tag => lines.push(`  - ${tag}`))
  }

  // Categories (converted to tags in Astro/Retypeset)
  if (hexo.categories) {
    const categories = Array.isArray(hexo.categories) ? hexo.categories : [hexo.categories]
    lines.push('categories:')
    categories.forEach(cat => lines.push(`  - ${cat}`))
  }

  // Math support
  if (hexo.mathjax) {
    lines.push('math: true')
  }

  lines.push('---')
  return lines.join('\n')
}

function migratePost(hexoPath: string, astroPath: string): void {
  const content = fs.readFileSync(hexoPath, 'utf-8')

  try {
    const { frontmatter, body } = parseHexoFrontmatter(content)
    const astroFrontmatter = convertToAstroFrontmatter(frontmatter)

    // Convert Hexo excerpt marker to Astro
    const convertedBody = body.replace(/<!-- more -->/g, '<!-- excerpt -->')

    const astroContent = `${astroFrontmatter}\n${convertedBody}`

    fs.writeFileSync(astroPath, astroContent)
    console.log(`✓ Migrated: ${path.basename(hexoPath)}`)
  } catch (error) {
    console.error(`✗ Failed: ${path.basename(hexoPath)} - ${error}`)
  }
}

function main(): void {
  console.log('='.repeat(60))
  console.log('Hexo → Astro Migration Script (ONE-TIME)')
  console.log('='.repeat(60))

  // Resolve paths relative to project root
  const projectRoot = process.cwd()
  const hexoDir = path.resolve(projectRoot, HEXO_POSTS_DIR)
  const astroDir = path.resolve(projectRoot, ASTRO_POSTS_DIR)

  if (!fs.existsSync(hexoDir)) {
    console.error(`Error: Hexo posts directory not found: ${hexoDir}`)
    console.log('Please adjust HEXO_POSTS_DIR in the script.')
    process.exit(1)
  }

  // Create output directory if needed
  if (!fs.existsSync(astroDir)) {
    fs.mkdirSync(astroDir, { recursive: true })
  }

  // Get all markdown files
  const files = fs.readdirSync(hexoDir).filter(f => f.endsWith('.md'))

  console.log(`Found ${files.length} posts to migrate`)
  console.log('')

  let success = 0
  let failed = 0

  for (const file of files) {
    const hexoPath = path.join(hexoDir, file)
    const astroPath = path.join(astroDir, file)

    try {
      migratePost(hexoPath, astroPath)
      success++
    } catch {
      failed++
    }
  }

  console.log('')
  console.log('='.repeat(60))
  console.log(`Migration complete: ${success} succeeded, ${failed} failed`)
  console.log('='.repeat(60))

  if (failed > 0) {
    process.exit(1)
  }
}

main()
