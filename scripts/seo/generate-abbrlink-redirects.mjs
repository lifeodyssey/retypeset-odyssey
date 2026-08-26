#!/usr/bin/env node
/**
 * Generate functions/abbrlinks.js — the legacy Hexo `abbrlink` -> new ASCII
 * slug 301 map for the Cloudflare Pages middleware.
 *
 * Hexo served every article (post/note/journal) at /posts/:abbrlink[.html]
 * regardless of its real collection or language, so each abbrlink here 301s
 * to a single canonical destination irrespective of which locale prefix
 * (none / en / ja) the old link used — the destination locale comes from
 * this map, not from the request's own prefix.
 *
 * Ownership resolution (which article "owns" an abbrlink reused across
 * multiple articles via Hexo copy/paste) mirrors
 * scripts/seo/generate-legacy-redirects.ts, the reference generator for
 * public/_redirects (never deployed): an explicit override wins, else
 * priority is posts > notes > journals, then the group key sorts
 * alphabetically.
 *
 * Where this differs from generate-legacy-redirects.ts: the destination slug
 * here reads frontmatter `slug` first (the field retypeset-odyssey's
 * src/utils/content.ts actually routes on --
 * slugifyPathSegment(post.data.slug || baseId) -- see e.g. buildPostPermalink),
 * falling back to the slugified filename only when `slug` is absent.
 * generate-legacy-redirects.ts never reads `slug` at all, so for a
 * CJK-filename article with an explicit ASCII `slug:`, its public/_redirects
 * output 301s to the CJK filename-derived path instead of the real live URL
 * (that stale intermediate path only becomes correct once SLUG_MAP,
 * generated separately by generate-slug-redirects.mjs, is also consulted).
 * Reading `slug` directly here skips that extra hop.
 *
 * Run from the Blog-src root: node <theme>/scripts/seo/generate-abbrlink-redirects.mjs
 * Env: CONTENT_DIR (default ./content), OUT (default ./functions/abbrlinks.js)
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import fg from 'fast-glob'

const CONTENT_DIR = resolve(process.env.CONTENT_DIR || 'content')
const OUT = resolve(process.env.OUT || 'functions/abbrlinks.js')
const LOCALES = ['zh', 'en', 'ja']
const DEFAULT_LOCALE = 'zh'
const COLLECTIONS = ['posts', 'notes', 'journals']
const KIND_PRIORITY = { posts: 0, notes: 1, journals: 2 }

// Explicit owner mapping for known legacy collisions, mirrored 1:1 from
// generate-legacy-redirects.ts's LEGACY_ABBRLINK_OWNER_OVERRIDES (verified
// against old-site URLs there).
const OWNER_OVERRIDES = {
  fbd0b1b0: 'posts:Mixture-Density-Network',
  fc1cc4fb: 'notes:Leetcode面试高频题分类刷题总结',
}

function slugify(input) {
  return input
    .normalize('NFKC').trim().toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function isLegacyAbbrlink(value) {
  return /^[0-9a-f]{6,8}$/i.test(value.trim())
}

function stripQuotes(value) {
  const trimmed = value.trim()
  const single = trimmed.match(/^'(.*)'$/)
  if (single) return single[1].trim()
  const double = trimmed.match(/^"(.*)"$/)
  if (double) return double[1].trim()
  return trimmed
}

function getFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  return match?.[1] ?? ''
}

function getField(frontmatter, field) {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`^${escaped}\\s*:[ \\t]*(.*)$`, 'm')
  const match = frontmatter.match(re)
  if (!match) return ''
  return stripQuotes(match[1] ?? '')
}

function parseBoolean(value) {
  return /^(true|1|yes)$/i.test(value.trim())
}

function getBaseId(id) {
  for (const lang of LOCALES) {
    const suffix = `.${lang}`
    if (id.endsWith(suffix)) return id.slice(0, -suffix.length)
  }
  return id
}

function getLangFromId(id) {
  for (const lang of LOCALES) {
    if (id.endsWith(`.${lang}`)) return lang
  }
  return ''
}

// --- parse entries -----------------------------------------------------------

const entries = []
for (const collection of COLLECTIONS) {
  const files = await fg(`${collection}/**/*.{md,mdx}`, { cwd: CONTENT_DIR })
  for (const rel of files) {
    const raw = readFileSync(`${CONTENT_DIR}/${rel}`, 'utf8')
    const fm = getFrontmatter(raw)
    // rel is relative to CONTENT_DIR (e.g. "posts/Foo.md"); id should be
    // relative to the collection dir instead (e.g. "Foo"), matching
    // generate-legacy-redirects.ts's `relative(collection.baseDir, ...)`.
    const id = rel.slice(collection.length + 1).replace(/\.(md|mdx)$/i, '')
    const lang = getField(fm, 'lang') || getLangFromId(id)
    const abbrlink = getField(fm, 'abbrlink')
    const slugField = getField(fm, 'slug')
    const title = getField(fm, 'title')
    const draft = parseBoolean(getField(fm, 'draft'))
    entries.push({ collection, id, baseId: getBaseId(id), lang, abbrlink, slugField, title, draft })
  }
}

// --- group + resolve ownership ------------------------------------------------

function legacyAbbrlinksOf(groupEntries) {
  const set = new Set()
  for (const e of groupEntries) {
    const v = e.abbrlink.trim().toLowerCase()
    if (isLegacyAbbrlink(v)) set.add(v)
  }
  return [...set].sort()
}

function compareGroupKeys(a, b) {
  const ak = a.slice(0, a.indexOf(':'))
  const bk = b.slice(0, b.indexOf(':'))
  const diff = (KIND_PRIORITY[ak] ?? 99) - (KIND_PRIORITY[bk] ?? 99)
  return diff !== 0 ? diff : a.localeCompare(b)
}

const grouped = new Map()
const skippedDrafts = []
for (const e of entries) {
  if (e.draft || !e.title.trim()) {
    if (e.abbrlink && isLegacyAbbrlink(e.abbrlink)) skippedDrafts.push(`${e.collection}:${e.id}:${e.abbrlink}`)
    continue
  }
  const key = `${e.collection}:${e.baseId}`
  if (!grouped.has(key)) grouped.set(key, [])
  grouped.get(key).push(e)
}

const candidatesByAbbrlink = new Map()
for (const [key, groupEntries] of grouped) {
  for (const abbrlink of legacyAbbrlinksOf(groupEntries)) {
    if (!candidatesByAbbrlink.has(abbrlink)) candidatesByAbbrlink.set(abbrlink, new Set())
    candidatesByAbbrlink.get(abbrlink).add(key)
  }
}

const owners = new Map()
const ownershipWarnings = []
for (const [abbrlink, candidateSet] of candidatesByAbbrlink) {
  const candidates = [...candidateSet]
  let owner = ''
  const override = OWNER_OVERRIDES[abbrlink]
  if (override) {
    if (candidateSet.has(override)) owner = override
    else ownershipWarnings.push(`override_miss: ${abbrlink} => ${override} (candidates: ${candidates.join(', ')})`)
  }
  if (!owner) {
    const sorted = [...candidates].sort(compareGroupKeys)
    owner = sorted[0] ?? ''
    if (sorted.length > 1) ownershipWarnings.push(`owner_inferred: ${abbrlink} => ${owner} (candidates: ${sorted.join(', ')})`)
  }
  if (owner) owners.set(abbrlink, owner)
}

// --- build ABBRLINK_MAP --------------------------------------------------------

function buildByLang(groupEntries) {
  const baseEntry = groupEntries.find(e => !e.lang)
  const byLang = {}
  for (const locale of LOCALES) byLang[locale] = groupEntries.find(e => e.lang === locale)

  // Keep language inference aligned with generate-legacy-redirects.ts's
  // buildByLang (which itself mirrors src/utils/content.ts): snapshot the
  // *explicit* zh/en entries before falling back, so a lang-less base file
  // fills zh first without then also masquerading as an explicit en entry.
  if (baseEntry) {
    const zhEntry = byLang.zh
    const enEntry = byLang.en
    if (!zhEntry) byLang.zh = baseEntry
    if (!enEntry && zhEntry) byLang.en = baseEntry
    if (!byLang[DEFAULT_LOCALE]) byLang[DEFAULT_LOCALE] = baseEntry
  }

  return byLang
}

const ABBRLINK_MAP = {}
let mapped = 0
for (const [key, groupEntries] of grouped) {
  const collection = key.slice(0, key.indexOf(':'))
  const baseId = key.slice(key.indexOf(':') + 1)
  const ownedAbbrlinks = legacyAbbrlinksOf(groupEntries).filter(a => owners.get(a) === key)
  if (ownedAbbrlinks.length === 0) continue

  const byLang = buildByLang(groupEntries)
  const supportedLangs = LOCALES.filter(l => byLang[l])
  if (supportedLangs.length === 0) continue

  const targetLang = supportedLangs.includes(DEFAULT_LOCALE) ? DEFAULT_LOCALE : supportedLangs[0]
  const targetEntry = byLang[targetLang]
  const slug = slugify(targetEntry.slugField || baseId) || targetEntry.abbrlink || slugify(baseId) || baseId

  for (const abbrlink of ownedAbbrlinks) {
    ABBRLINK_MAP[abbrlink] = {
      collection,
      locale: targetLang === DEFAULT_LOCALE ? '' : targetLang,
      slug,
    }
    mapped++
  }
}

// --- write ---------------------------------------------------------------------

const sortedMap = Object.fromEntries(Object.keys(ABBRLINK_MAP).sort().map(k => [k, ABBRLINK_MAP[k]]))

const header = `// AUTO-GENERATED by scripts/seo/generate-abbrlink-redirects.mjs — do not edit by hand.
//
// Legacy Hexo \`abbrlink\` -> new ASCII slug 301 map for the retypeset-odyssey
// theme's Cloudflare Pages middleware. Hexo served every post/note/journal at
// /posts/:abbrlink[.html] regardless of its real collection or language, so
// each abbrlink here 301s to one canonical destination irrespective of which
// locale prefix (none / en / ja) the old link used -- the destination locale
// comes from this map, not from the request's own prefix.
//
// Ownership for an abbrlink reused across multiple articles (Hexo copy/paste)
// follows scripts/seo/generate-legacy-redirects.ts: an explicit override
// wins, else priority is posts > notes > journals, then group key sorts
// alphabetically. The destination slug reads frontmatter \`slug\` (the field
// retypeset-odyssey's src/utils/content.ts actually routes on), falling back
// to the slugified filename.
`

const body = `
export const ABBRLINK_MAP = ${JSON.stringify(sortedMap, null, 2)}

const ABBRLINK_RE = /^\\/(?:(?:en|ja)\\/)?posts\\/([0-9a-f]{6,8})(?:\\.html)?$/i

/**
 * Given a decoded request pathname, return the canonical new path to 301 to
 * for a legacy Hexo abbrlink URL, or null if no mapping applies. Any locale
 * prefix on the request (none / en / ja) is accepted but ignored for
 * matching -- the destination locale is whatever the abbrlink's owning
 * article's target locale was, per ABBRLINK_MAP.
 */
export function resolveAbbrlinkRedirect(pathname) {
  const trimmed = pathname.length > 1 ? pathname.replace(/\\/+$/, '') : pathname
  const match = trimmed.match(ABBRLINK_RE)
  if (!match) return null
  const entry = ABBRLINK_MAP[match[1].toLowerCase()]
  if (!entry) return null
  return \`\${entry.locale ? \`/\${entry.locale}\` : ''}/\${entry.collection}/\${entry.slug}\`
}
`

writeFileSync(OUT, header + body)
console.log(`Wrote ${OUT}`)
console.log(`Abbrlinks mapped: ${mapped} (entries=${entries.length}, groups=${grouped.size})`)
if (skippedDrafts.length) {
  console.warn(`Skipped ${skippedDrafts.length} draft/untitled entries with legacy abbrlink`)
}
if (ownershipWarnings.length) {
  console.warn(`${ownershipWarnings.length} ownership warnings:`)
  for (const w of ownershipWarnings.slice(0, 10)) console.warn(`  - ${w}`)
  if (ownershipWarnings.length > 10) console.warn(`  - ... and ${ownershipWarnings.length - 10} more`)
}
