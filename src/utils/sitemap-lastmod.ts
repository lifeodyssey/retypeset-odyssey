import { readFileSync } from 'node:fs'
import { relative, resolve as resolvePath } from 'node:path'
import fg from 'fast-glob'
import yaml from 'yaml'

/**
 * Build a URL-pathname -> ISO date string map for the sitemap's `lastmod`,
 * by reading content frontmatter directly off disk.
 *
 * This runs inside `astro:config:setup`, before `astro:content` collections
 * exist, so it can't reuse `getCollection()` / `src/utils/content.ts`. It
 * mirrors those files' id/lang-grouping/slug derivation instead — same
 * approach as `scripts/seo/generate-legacy-redirects.ts` (including its
 * `buildByLang` inference for a base file that implicitly represents
 * whichever locale isn't otherwise claimed) — reading each frontmatter
 * block with the `yaml` package (already a theme dependency) rather than
 * pulling in a new one.
 *
 * Never uses build time — a URL with no `updated`/`published` frontmatter
 * simply gets no entry in the map, and the caller leaves `lastmod` unset.
 */

interface BuildLastmodMapOptions {
  /** Consumer project root (or theme root in standalone mode). */
  projectRoot: string
  /** Built-in collections to scan, e.g. ['posts', 'notes', 'journals']. */
  enabledBuiltIns: readonly string[]
  /** Dynamic `content/<folder>` collections to scan. */
  dynamicFolders: readonly string[]
  allLocales: readonly string[]
  defaultLocale: string
  /** Theme-internal base path (`''` when site.base is `/`). */
  base: string
}

interface ContentEntry {
  baseId: string
  lang: string
  slug: string
  updated?: string
  published?: string
}

function getFrontmatter(content: string): string {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  return match?.[1] ?? ''
}

function slugifyPathSegment(input: string): string {
  return input
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Parse a frontmatter date value the same way Astro's own `z.coerce.date()`
 * sees it. Astro's frontmatter YAML parser resolves a bare timestamp with
 * no explicit UTC offset (e.g. `2022-07-22 22:56:18`, the common Hexo
 * style) as UTC — but a plain `new Date(str)` in Node treats a
 * space-separated (non-"T") datetime as *local* time instead, which would
 * silently shift every lastmod by the build machine's UTC offset. Detect
 * that bare-timestamp shape and normalize it to an explicit `Z` offset
 * before parsing, so this matches what actually ends up in datePublished /
 * dateModified regardless of which timezone the build runs in.
 */
function toISODate(value: unknown): string | undefined {
  if (!value) {
    return undefined
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value.toISOString()
  }

  const str = String(value).trim()
  const bareTimestamp = str.match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?))?$/)
  const normalized = bareTimestamp
    ? `${bareTimestamp[1]}T${bareTimestamp[2] ?? '00:00:00'}Z`
    : str

  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

/**
 * Strip a known language suffix (e.g. `foo.en` -> `foo`) the same way
 * `src/utils/content.ts`'s `get*BaseId()` helpers do. This only decides the
 * grouping key — which locale a file actually represents is decided by its
 * frontmatter `lang`, mirrored in `buildByLang` below.
 */
function getBaseId(id: string, allLocales: readonly string[]): string {
  for (const lang of allLocales) {
    const suffix = `.${lang}`
    if (id.endsWith(suffix)) {
      return id.slice(0, -suffix.length)
    }
  }
  return id
}

/**
 * Resolve which entry represents each locale within a same-baseId group.
 * Mirrors `buildByLang` in scripts/seo/generate-legacy-redirects.ts (itself
 * a generalization of the zh/en inference in `_getPostGroups` /
 * `_getNoteGroups` / `_getJournalGroups`): a file with no frontmatter
 * `lang` is the "base" entry, and implicitly represents the default locale
 * unless that's already explicitly claimed, in which case it falls back to
 * `en` (if `en` isn't itself explicitly claimed either).
 */
function buildByLang(
  entries: ContentEntry[],
  allLocales: readonly string[],
  defaultLocale: string,
): Partial<Record<string, ContentEntry>> {
  const byLang: Partial<Record<string, ContentEntry>> = {}
  const baseEntry = entries.find(entry => !entry.lang)

  for (const locale of allLocales) {
    byLang[locale] = entries.find(entry => entry.lang === locale)
  }

  if (baseEntry) {
    const zhEntry = byLang.zh
    const enEntry = byLang.en

    if (allLocales.includes('zh') && !zhEntry) {
      byLang.zh = baseEntry
    }
    if (allLocales.includes('en') && !enEntry && zhEntry) {
      byLang.en = baseEntry
    }
    if (!byLang[defaultLocale]) {
      byLang[defaultLocale] = baseEntry
    }
  }

  return byLang
}

export function buildLastmodMap(options: BuildLastmodMapOptions): Map<string, string> {
  const { projectRoot, enabledBuiltIns, dynamicFolders, allLocales, defaultLocale, base } = options
  const map = new Map<string, string>()

  const collections = [
    ...enabledBuiltIns.map(kind => ({ kind, dir: `content/${kind}` })),
    ...dynamicFolders.map(folder => ({ kind: folder, dir: `content/${folder}` })),
  ]

  for (const { kind, dir } of collections) {
    const absDir = resolvePath(projectRoot, dir)
    const files = fg.sync('**/*.{md,mdx}', { cwd: absDir, dot: false })

    const groups = new Map<string, ContentEntry[]>()

    for (const file of files) {
      const absPath = resolvePath(absDir, file)
      let raw: string
      try {
        raw = readFileSync(absPath, 'utf8')
      }
      catch {
        continue
      }

      let data: Record<string, unknown> = {}
      try {
        data = (yaml.parse(getFrontmatter(raw)) ?? {}) as Record<string, unknown>
      }
      catch {
        continue
      }

      // Mirror content.config.ts's draft transform: no title -> draft.
      if (data.draft === true || !data.title) {
        continue
      }

      const relPath = relative(absDir, absPath).replace(/\\/g, '/')
      const id = relPath.replace(/\.(md|mdx)$/i, '')
      const baseId = getBaseId(id, allLocales)
      const lang = typeof data.lang === 'string' ? data.lang : ''
      const explicitSlug = typeof data.slug === 'string' ? data.slug : ''

      const entry: ContentEntry = {
        baseId,
        lang,
        slug: explicitSlug,
        updated: toISODate(data.updated),
        published: toISODate(data.published ?? data.date),
      }

      const bucket = groups.get(baseId) ?? []
      bucket.push(entry)
      groups.set(baseId, bucket)
    }

    for (const [baseId, groupEntries] of groups) {
      const byLang = buildByLang(groupEntries, allLocales, defaultLocale)

      // The slug is resolved once per baseId group, not per language: any
      // entry's frontmatter `slug` wins for every language variant in the
      // group (mirrors `_getPostGroups`'s `entries.map(e => e.data.slug)
      // .find(Boolean)` in src/utils/content.ts) — a translation typically
      // sets `slug` while the untranslated base file doesn't, and both
      // must resolve to the same URL slug.
      const explicitSlug = groupEntries.map(entry => entry.slug).find(Boolean) ?? ''
      const slug = slugifyPathSegment(explicitSlug || baseId) || baseId

      for (const lang of allLocales) {
        const entry = byLang[lang]
        if (!entry) {
          continue
        }

        const lastmod = entry.updated ?? entry.published
        if (!lastmod) {
          continue
        }

        const pathSegment = lang === defaultLocale ? `/${kind}/${slug}` : `/${lang}/${kind}/${slug}`
        const fullPath = base ? `${base}${pathSegment}` : pathSegment
        map.set(fullPath, lastmod)
      }
    }
  }

  return map
}
