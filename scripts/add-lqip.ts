// scripts/add-lqip.ts
import fs from 'node:fs/promises'
import path from 'node:path'
import { exit } from 'node:process'
import { fileURLToPath } from 'node:url'
import glob from 'fast-glob'
import { parse as parseHTML } from 'node-html-parser'

// 获取项目根目录
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, '..')
const distDir = path.join(rootDir, 'dist')
const lqipMapPath = path.join(rootDir, 'src', 'assets', 'lqip-map.json')

// 辅助函数：检查文件是否存在
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  }
  catch {
    return false
  }
}

// 辅助函数：从 URL 中提取路径
function extractPathFromSrc(src: string): string | null {
  // 处理 /_image/?href= 类型的 URL
  const hrefMatch = src.match(/href=([^&]+)/)
  if (hrefMatch) {
    try {
      const decoded = decodeURIComponent(hrefMatch[1])
      return path.basename(decoded)
    }
    catch {
      return null
    }
  }

  // 处理普通路径
  return path.basename(src)
}

// 辅助函数：查找最匹配的 LQIP 值
function findBestMatch(filePath: string, lqipMap: Record<string, number>): number | null {
  // 直接匹配
  if (lqipMap[filePath])
    return lqipMap[filePath]

  // 文件名匹配
  const fileName = path.basename(filePath)
  if (lqipMap[fileName])
    return lqipMap[fileName]

  // 简单包含匹配
  for (const key in lqipMap) {
    if (key.includes(fileName) || fileName.includes(path.basename(key))) {
      return lqipMap[key]
    }
  }

  return null
}

async function main() {
  console.log('开始添加 LQIP 样式...')

  // 检查 LQIP 映射表是否存在
  if (!await fileExists(lqipMapPath)) {
    console.error(`错误: LQIP 映射表不存在 (${lqipMapPath})`)
    console.error('请先运行 "pnpm generate-lqip" 命令生成映射表')
    exit(1)
  }

  // 检查 dist 目录是否存在
  if (!await fileExists(distDir)) {
    console.error(`错误: 构建目录不存在 (${distDir})`)
    console.error('请先运行构建命令')
    exit(1)
  }

  // 读取 LQIP 映射表
  let lqipMap: Record<string, number>
  try {
    const lqipMapContent = await fs.readFile(lqipMapPath, 'utf-8')
    lqipMap = JSON.parse(lqipMapContent)
  }
  catch (err) {
    console.error(`解析 LQIP 映射表失败: ${err instanceof Error ? err.message : String(err)}`)
    exit(1)
  }

  // 查找所有 HTML 文件
  const htmlFiles = await glob('**/*.html', {
    cwd: distDir,
    absolute: true,
  })

  console.log(`找到 ${htmlFiles.length} 个 HTML 文件`)

  let totalImages = 0
  let updatedImages = 0

  // 处理每个 HTML 文件
  for (const htmlFile of htmlFiles) {
    const content = await fs.readFile(htmlFile, 'utf-8')
    const root = parseHTML(content)
    const images = root.querySelectorAll('img')

    totalImages += images.length
    let fileUpdated = false

    // 处理每个图片
    for (const img of images) {
      const src = img.getAttribute('src')
      if (!src)
        continue

      const filePath = extractPathFromSrc(src)
      if (!filePath)
        continue

      const lqipValue = findBestMatch(filePath, lqipMap)
      if (lqipValue) {
        // 添加或更新 style 属性
        const currentStyle = img.getAttribute('style') || ''
        if (!currentStyle.includes('--lqip:')) {
          const newStyle = currentStyle
            ? `${currentStyle}; --lqip:${lqipValue}`
            : `--lqip:${lqipValue}`
          img.setAttribute('style', newStyle)
          updatedImages++
          fileUpdated = true
        }
      }
    }

    // 只有在文件有更改时才写回
    if (fileUpdated) {
      await fs.writeFile(htmlFile, root.toString())
    }
  }

  console.log(`处理完成！总共找到 ${totalImages} 张图片，更新了 ${updatedImages} 张图片的 LQIP 样式。`)
}

main().catch((err) => {
  console.error('执行过程中出错:', err)
  exit(1)
})
