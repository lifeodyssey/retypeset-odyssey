/**
 * ONE-TIME VALIDATION SCRIPT
 *
 * Validates that all abbrlinks from the original Hexo blog are preserved
 * in the Astro migration. Critical for URL compatibility.
 *
 * Usage: pnpm tsx scripts/migration/validate-abbrlinks.ts
 */

import fs from 'node:fs'
import path from 'node:path'

// Configuration
const HEXO_POSTS_DIR = '../Blog-src/source/_posts'
const ASTRO_POSTS_DIR = './content/posts'

interface ValidationResult {
  file: string
  hexoAbbrlink?: string
  astroAbbrlink?: string
  status: 'match' | 'mismatch' | 'missing_hexo' | 'missing_astro'
}

function extractAbbrlink(content: string): string | undefined {
  const match = content.match(/abbrlink:\s*([a-f0-9]+)/i)
  return match ? match[1] : undefined
}

function validateAbbrlinks(): void {
  console.log('='.repeat(60))
  console.log('Abbrlink Validation Script (ONE-TIME)')
  console.log('='.repeat(60))

  const projectRoot = process.cwd()
  const hexoDir = path.resolve(projectRoot, HEXO_POSTS_DIR)
  const astroDir = path.resolve(projectRoot, ASTRO_POSTS_DIR)

  // Build map of Hexo abbrlinks
  const hexoAbbrlinks = new Map<string, string>()

  if (fs.existsSync(hexoDir)) {
    const hexoFiles = fs.readdirSync(hexoDir).filter(f => f.endsWith('.md'))
    for (const file of hexoFiles) {
      const content = fs.readFileSync(path.join(hexoDir, file), 'utf-8')
      const abbrlink = extractAbbrlink(content)
      if (abbrlink) {
        hexoAbbrlinks.set(file, abbrlink)
      }
    }
    console.log(`Found ${hexoAbbrlinks.size} abbrlinks in Hexo posts`)
  } else {
    console.log('⚠ Hexo directory not found - validating Astro posts only')
  }

  // Build map of Astro abbrlinks
  const astroAbbrlinks = new Map<string, string>()

  if (fs.existsSync(astroDir)) {
    const astroFiles = fs.readdirSync(astroDir).filter(f => f.endsWith('.md'))
    for (const file of astroFiles) {
      const content = fs.readFileSync(path.join(astroDir, file), 'utf-8')
      const abbrlink = extractAbbrlink(content)
      if (abbrlink) {
        astroAbbrlinks.set(file, abbrlink)
      }
    }
    console.log(`Found ${astroAbbrlinks.size} abbrlinks in Astro posts`)
  } else {
    console.error('Error: Astro posts directory not found')
    process.exit(1)
  }

  // Validate
  console.log('')
  console.log('Validation Results:')
  console.log('-'.repeat(60))

  const results: ValidationResult[] = []
  const allFiles = new Set([...hexoAbbrlinks.keys(), ...astroAbbrlinks.keys()])

  for (const file of allFiles) {
    const hexoAbbrlink = hexoAbbrlinks.get(file)
    const astroAbbrlink = astroAbbrlinks.get(file)

    let status: ValidationResult['status']

    if (!hexoAbbrlink && !astroAbbrlink) {
      continue // Neither has abbrlink, skip
    } else if (!hexoAbbrlink) {
      status = 'missing_hexo'
    } else if (!astroAbbrlink) {
      status = 'missing_astro'
    } else if (hexoAbbrlink === astroAbbrlink) {
      status = 'match'
    } else {
      status = 'mismatch'
    }

    results.push({ file, hexoAbbrlink, astroAbbrlink, status })
  }

  // Summary
  const matches = results.filter(r => r.status === 'match')
  const mismatches = results.filter(r => r.status === 'mismatch')
  const missingHexo = results.filter(r => r.status === 'missing_hexo')
  const missingAstro = results.filter(r => r.status === 'missing_astro')

  console.log(`✓ Matching: ${matches.length}`)
  console.log(`⚠ Missing in Hexo (new posts): ${missingHexo.length}`)

  if (mismatches.length > 0) {
    console.log(`✗ Mismatched: ${mismatches.length}`)
    console.log('')
    console.log('MISMATCH DETAILS:')
    for (const r of mismatches) {
      console.log(`  ${r.file}: Hexo=${r.hexoAbbrlink}, Astro=${r.astroAbbrlink}`)
    }
  }

  if (missingAstro.length > 0) {
    console.log(`✗ Missing in Astro: ${missingAstro.length}`)
    console.log('')
    console.log('MISSING IN ASTRO:')
    for (const r of missingAstro) {
      console.log(`  ${r.file}: ${r.hexoAbbrlink}`)
    }
  }

  // Check for duplicate abbrlinks
  console.log('')
  console.log('Checking for duplicates...')
  const abbrlinkCounts = new Map<string, string[]>()
  for (const [file, abbrlink] of astroAbbrlinks) {
    const files = abbrlinkCounts.get(abbrlink) || []
    files.push(file)
    abbrlinkCounts.set(abbrlink, files)
  }

  const duplicates = [...abbrlinkCounts.entries()].filter(([, files]) => files.length > 1)
  if (duplicates.length > 0) {
    console.log(`✗ Found ${duplicates.length} duplicate abbrlinks:`)
    for (const [abbrlink, files] of duplicates) {
      console.log(`  ${abbrlink}: ${files.join(', ')}`)
    }
  } else {
    console.log('✓ No duplicate abbrlinks found')
  }

  console.log('')
  console.log('='.repeat(60))

  // Exit with error if validation failed
  if (mismatches.length > 0 || missingAstro.length > 0 || duplicates.length > 0) {
    console.log('Validation FAILED - please fix the issues above')
    process.exit(1)
  } else {
    console.log('Validation PASSED')
  }
}

validateAbbrlinks()
