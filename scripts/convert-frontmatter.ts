import fs from 'fs/promises'
import { glob } from 'glob'
import matter from 'gray-matter'
import path from 'path'

interface FrontmatterData {
  title: string
  date?: Date
  published?: Date
  tags?: string[]
  categories?: string | string[]
  abbrlink?: string
  slug?: string
  lang?: 'zh' | 'en' | 'ja'
  [key: string]: any
}

const POSTS_DIR = 'src/content/posts'

async function convertFrontmatter() {
  const files = await glob('**/*.md', {
    cwd: POSTS_DIR,
    absolute: true,
  })

  console.log(`📝 Found ${files.length} markdown files\n`)

  let converted = 0
  let skipped = 0
  let errors = 0

  for (const filePath of files) {
    try {
      await processFile(filePath)
      converted++
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error)
      errors++
    }
  }

  console.log(`\n✅ Conversion completed!`)
  console.log(`   Converted: ${converted}`)
  console.log(`   Skipped: ${skipped}`)
  console.log(`   Errors: ${errors}`)
}

async function processFile(filePath: string) {
  const content = await fs.readFile(filePath, 'utf-8')
  const { data, content: body } = matter(content)
  
  let changed = false
  const filename = path.basename(filePath)

  // 1. Convert abbrlink to slug
  if (data.abbrlink && !data.slug) {
    data.slug = data.abbrlink
    delete data.abbrlink
    changed = true
    console.log(`🔄 ${filename}: abbrlink → slug`)
  }

  // 2. Detect and add language if missing
  if (!data.lang) {
    if (filename.endsWith('.en.md')) {
      data.lang = 'en'
    } else if (filename.endsWith('.ja.md')) {
      data.lang = 'ja'
    } else {
      data.lang = 'zh'
    }
    changed = true
    console.log(`🌍 ${filename}: added lang = ${data.lang}`)
  }

  // 3. Convert image paths (optional - uncomment if needed)
  // const basename = filename.replace(/\.(en|ja)?\.md$/, '')
  // let newBody = body.replace(
  //   /!\[(.*?)\]\((.*?)\.assets\/(.*?)\)/g,
  //   `![$1](/images/posts/${basename}/$3)`
  // )
  // if (newBody !== body) {
  //   changed = true
  //   console.log(`🖼️  ${filename}: updated image paths`)
  //   body = newBody
  // }

  // 4. Only write if changes were made
  if (changed) {
    const newContent = matter.stringify(body, data)
    await fs.writeFile(filePath, newContent)
  } else {
    console.log(`⏭️  ${filename}: no changes needed`)
  }
}

convertFrontmatter().catch(console.error)
