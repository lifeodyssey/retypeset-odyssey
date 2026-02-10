import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import process from 'node:process'
import fg from 'fast-glob'
import { allLocales, defaultLocale } from '../../src/config'

type RouteKind = 'posts' | 'notes' | 'journals'

interface CollectionSpec {
  kind: RouteKind
  baseDir: string
}

interface ContentEntry {
  kind: RouteKind
  id: string
  baseId: string
  lang: string
  abbrlink: string
  title: string
  draft: boolean
}

const COLLECTIONS: CollectionSpec[] = [
  { kind: 'posts', baseDir: 'content/posts' },
  { kind: 'journals', baseDir: 'content/journals' },
  { kind: 'notes', baseDir: 'content/notes' },
]

const OUTPUT_FILE = 'public/_redirects'
const EOL = '\n'
const conflicts: string[] = []
const skippedDrafts: string[] = []

function stripQuotes(value: string): string {
  const trimmed = value.trim()
  const singleQuoted = trimmed.match(/^'(.*)'$/)
  if (singleQuoted) {
    return singleQuoted[1].trim()
  }

  const doubleQuoted = trimmed.match(/^"(.*)"$/)
  if (doubleQuoted) {
    return doubleQuoted[1].trim()
  }

  return trimmed
}

function parseBoolean(value: string): boolean {
  return /^(true|1|yes)$/i.test(value.trim())
}

function getFrontmatter(content: string): string {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  return match?.[1] ?? ''
}

function getFrontmatterField(frontmatter: string, field: string): string {
  const escapedField = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`^${escapedField}\\s*:\\s*(.*)$`, 'm')
  const match = frontmatter.match(regex)
  if (!match) {
    return ''
  }

  return stripQuotes(match[1] ?? '')
}

function isLegacyAbbrlink(value: string): boolean {
  return /^[0-9a-f]{6,8}$/i.test(value.trim())
}

function slugifyPathSegment(input: string): string {
  const slug = input
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return slug
}

function getBaseId(id: string): string {
  const normalizedId = id.trim()
  for (const lang of allLocales) {
    const suffix = `.${lang}`
    if (normalizedId.endsWith(suffix)) {
      return normalizedId.slice(0, -suffix.length)
    }
  }

  return normalizedId
}

function getLangFromId(id: string): string {
  for (const lang of allLocales) {
    const suffix = `.${lang}`
    if (id.endsWith(suffix)) {
      return lang
    }
  }

  return ''
}

function buildPath(kind: RouteKind, slug: string, lang: string): string {
  return lang === defaultLocale ? `/${kind}/${slug}` : `/${lang}/${kind}/${slug}`
}

function addRedirect(
  redirectMap: Map<string, string>,
  sourcePath: string,
  targetPath: string,
  context: string,
) {
  const existing = redirectMap.get(sourcePath)
  if (existing && existing !== targetPath) {
    conflicts.push(`conflict: ${sourcePath} => ${existing} (ignored ${targetPath}, ${context})`)
    return
  }

  redirectMap.set(sourcePath, targetPath)
}

function getPreferredAbbrlink(entries: ContentEntry[]): string {
  const nonEmptyAbbrlinks = entries
    .map(entry => entry.abbrlink.trim())
    .filter(Boolean)

  if (nonEmptyAbbrlinks.length === 0) {
    return ''
  }

  const uniqueAbbrlinks = [...new Set(nonEmptyAbbrlinks)]
  if (uniqueAbbrlinks.length === 1) {
    return uniqueAbbrlinks[0]
  }

  const baseEntry = entries.find(entry => !entry.lang && entry.abbrlink)
  if (baseEntry) {
    return baseEntry.abbrlink
  }

  const defaultLocaleEntry = entries.find(entry => entry.lang === defaultLocale && entry.abbrlink)
  if (defaultLocaleEntry) {
    return defaultLocaleEntry.abbrlink
  }

  return uniqueAbbrlinks[0]
}

function buildByLang(entries: ContentEntry[]): Partial<Record<string, ContentEntry>> {
  const byLangExplicit: Partial<Record<string, ContentEntry>> = {}
  const baseEntry = entries.find(entry => !entry.lang)

  for (const locale of allLocales) {
    byLangExplicit[locale] = entries.find(entry => entry.lang === locale)
  }

  // Keep language inference aligned with src/utils/content.ts
  if (baseEntry) {
    const zhEntry = byLangExplicit.zh
    const enEntry = byLangExplicit.en

    if (allLocales.includes('zh') && !zhEntry) {
      byLangExplicit.zh = baseEntry
    }

    if (allLocales.includes('en') && !enEntry && zhEntry) {
      byLangExplicit.en = baseEntry
    }

    // Generic fallback for projects where default locale is not zh.
    if (!byLangExplicit[defaultLocale]) {
      byLangExplicit[defaultLocale] = baseEntry
    }
  }

  return byLangExplicit
}

function parseEntries(): ContentEntry[] {
  const entries: ContentEntry[] = []

  for (const collection of COLLECTIONS) {
    const files = fg.sync(`${collection.baseDir}/**/*.{md,mdx}`, { dot: false })

    for (const file of files) {
      const absoluteFilePath = resolve(file)
      const raw = readFileSync(absoluteFilePath, 'utf8')
      const frontmatter = getFrontmatter(raw)
      const relPath = relative(resolve(collection.baseDir), absoluteFilePath).replaceAll('\\', '/')
      const id = relPath.replace(/\.(md|mdx)$/i, '')
      const lang = getFrontmatterField(frontmatter, 'lang') || getLangFromId(id)
      const abbrlink = getFrontmatterField(frontmatter, 'abbrlink')
      const title = getFrontmatterField(frontmatter, 'title')
      const draft = parseBoolean(getFrontmatterField(frontmatter, 'draft'))

      entries.push({
        kind: collection.kind,
        id,
        baseId: getBaseId(id),
        lang,
        abbrlink,
        title,
        draft,
      })
    }
  }

  return entries
}

function generateRedirectLines(entries: ContentEntry[]): string[] {
  const groupedEntries = new Map<string, ContentEntry[]>()

  for (const entry of entries) {
    if (entry.draft || !entry.title.trim()) {
      if (entry.abbrlink && isLegacyAbbrlink(entry.abbrlink)) {
        skippedDrafts.push(`${entry.kind}:${entry.id}:${entry.abbrlink}`)
      }
      continue
    }

    const groupKey = `${entry.kind}:${entry.baseId}`
    const bucket = groupedEntries.get(groupKey) ?? []
    bucket.push(entry)
    groupedEntries.set(groupKey, bucket)
  }

  const redirectMap = new Map<string, string>()

  for (const [groupKey, groupEntries] of groupedEntries) {
    const [kindString, baseId] = groupKey.split(':')
    const kind = kindString as RouteKind
    const slug = slugifyPathSegment(baseId) || baseId
    const abbrlink = getPreferredAbbrlink(groupEntries)
    if (!abbrlink || !isLegacyAbbrlink(abbrlink)) {
      continue
    }

    const byLang = buildByLang(groupEntries)
    const supportedLangs = allLocales.filter(locale => Boolean(byLang[locale]))
    if (supportedLangs.length === 0) {
      continue
    }

    const fallbackLang = supportedLangs[0] ?? defaultLocale
    const targetLang = supportedLangs.includes(defaultLocale) ? defaultLocale : fallbackLang
    const defaultTargetPath = buildPath(kind, slug, targetLang)

    const context = `${kind}:${baseId}`

    // Legacy Hexo links were /posts/:abbrlink.html for every article.
    addRedirect(redirectMap, `/posts/${abbrlink}.html`, defaultTargetPath, context)
    addRedirect(redirectMap, `/posts/${abbrlink}`, defaultTargetPath, context)

    // Normalize accidental .html variants of current slug URLs.
    addRedirect(redirectMap, buildPath(kind, `${slug}.html`, targetLang), defaultTargetPath, context)

    for (const lang of supportedLangs) {
      if (lang === defaultLocale) {
        continue
      }

      const localizedTargetPath = buildPath(kind, slug, lang)
      addRedirect(redirectMap, `/${lang}/posts/${abbrlink}.html`, localizedTargetPath, context)
      addRedirect(redirectMap, `/${lang}/posts/${abbrlink}`, localizedTargetPath, context)
      addRedirect(redirectMap, buildPath(kind, `${slug}.html`, lang), localizedTargetPath, context)
    }
  }

  return [...redirectMap.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([sourcePath, targetPath]) => `${sourcePath} ${targetPath} 301`)
}

function main() {
  if (process.env.ENABLE_LEGACY_REDIRECTS === 'false') {
    console.log('[generate-legacy-redirects] skipped because ENABLE_LEGACY_REDIRECTS=false')
    return
  }

  const entries = parseEntries()
  const redirectLines = generateRedirectLines(entries)

  const output = [
    '# AUTO-GENERATED FILE. DO NOT EDIT MANUALLY.',
    '# Generated by: pnpm generate-legacy-redirects',
    ...redirectLines,
    '',
  ].join(EOL)

  mkdirSync(dirname(OUTPUT_FILE), { recursive: true })
  writeFileSync(OUTPUT_FILE, output, 'utf8')

  if (conflicts.length > 0) {
    const sample = conflicts.slice(0, 10)
    console.warn(`[generate-legacy-redirects] ${conflicts.length} redirect conflicts detected`)
    for (const item of sample) {
      console.warn(`  - ${item}`)
    }
    if (conflicts.length > sample.length) {
      console.warn(`  - ... and ${conflicts.length - sample.length} more`)
    }
  }

  if (skippedDrafts.length > 0) {
    console.warn(`[generate-legacy-redirects] skipped ${skippedDrafts.length} draft/unpublished entries with legacy abbrlink`)
  }

  console.log(`[generate-legacy-redirects] entries=${entries.length}, redirects=${redirectLines.length}, output=${OUTPUT_FILE}`)
}

main()
