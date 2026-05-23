/**
 * Generic accessors for dynamically-registered content collections.
 *
 * Every folder discovered under `content/` (excluding built-ins and
 * underscore-prefixed folders) is registered with the same schema as `posts`.
 * Templates in `src/pages/_dynamic/` use these helpers to fetch and group
 * entries the same way the posts/notes/journals utilities do — minus the
 * tag/category bookkeeping that only makes sense for posts.
 */

import type { CollectionEntry } from 'astro:content'
import type { Language } from '@/i18n/config'
import { getCollection, render } from 'astro:content'
import { allLocales, defaultLocale } from '@/config'

// All dynamic collections share the same loader+schema as `posts`, so a
// CollectionEntry<'posts'> is structurally identical. Cast through the
// `posts` slot so the rest of the codebase's types still line up.
export type DynamicEntry = CollectionEntry<'posts'>

export interface DynamicEntryWithMeta extends DynamicEntry {
  remarkPluginFrontmatter: { minutes: number }
}

export interface DynamicGroup {
  baseId: string
  slug: string
  supportedLangs: Language[]
  byLang: Partial<Record<Language, DynamicEntry>>
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

function getBaseId(entry: DynamicEntry): string {
  const id = entry.id.trim()
  for (const lang of allLocales) {
    const suffix = `.${lang}`
    if (id.endsWith(suffix))
      return id.slice(0, -suffix.length)
  }
  return id
}

/**
 * Read entries from a dynamic collection. Returns `[]` if the collection
 * is not registered (no folder, or `enabled: false`) instead of crashing —
 * this matches the behaviour of the built-in note/journal utilities.
 */
async function safeGetCollection(name: string): Promise<DynamicEntry[]> {
  try {
    const entries = await getCollection(
      name as 'posts',
      ({ data }: DynamicEntry) => !data.draft,
    )
    return entries
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (
      message.includes(`The collection "${name}" does not exist`)
      || message.includes(`The collection "${name}" is empty`)
    ) {
      return []
    }
    throw error
  }
}

export async function getDynamicGroups(collection: string): Promise<DynamicGroup[]> {
  const entries = await safeGetCollection(collection)

  const buckets = new Map<string, DynamicEntry[]>()
  for (const entry of entries) {
    const baseId = getBaseId(entry)
    const list = buckets.get(baseId) ?? []
    list.push(entry)
    buckets.set(baseId, list)
  }

  const slugToBaseId = new Map<string, string>()
  const results: DynamicGroup[] = []

  for (const [baseId, members] of buckets) {
    const slug = slugifyPathSegment(baseId) || baseId
    const existing = slugToBaseId.get(slug)
    if (existing && existing !== baseId) {
      throw new Error(
        `Duplicate slug "${slug}" in collection "${collection}" `
        + `from "${existing}" and "${baseId}"`,
      )
    }
    slugToBaseId.set(slug, baseId)

    const baseEntry = members.find(e => !e.data.lang)
    const zhEntry = members.find(e => e.data.lang === 'zh')
    const enEntry = members.find(e => e.data.lang === 'en')
    const jaEntry = members.find(e => e.data.lang === 'ja')

    // Best-effort base-language inference, mirroring the post/note logic:
    // a sole base file alongside an explicit `zh` translation is taken as en.
    const inferredEnFromBase = !enEntry && !!zhEntry ? baseEntry : undefined
    const inferredZhFromBase = !zhEntry ? baseEntry : undefined

    const byLang: DynamicGroup['byLang'] = {
      zh: zhEntry ?? inferredZhFromBase,
      en: enEntry ?? inferredEnFromBase,
      ja: jaEntry,
    }

    const supportedLangs = allLocales.filter(lang => byLang[lang])

    results.push({ baseId, slug, supportedLangs, byLang })
  }

  return results
}

export function getDynamicSlug(entry: DynamicEntry): string {
  return slugifyPathSegment(getBaseId(entry)) || getBaseId(entry)
}

async function attachMeta(entry: DynamicEntry): Promise<DynamicEntryWithMeta> {
  const { remarkPluginFrontmatter } = await render(entry)
  return {
    ...entry,
    remarkPluginFrontmatter: remarkPluginFrontmatter as { minutes: number },
  }
}

export async function getDynamicEntries(
  collection: string,
  lang?: Language,
): Promise<DynamicEntryWithMeta[]> {
  const currentLang = lang && allLocales.includes(lang) ? lang : defaultLocale
  const groups = await getDynamicGroups(collection)
  const selected = groups
    .map(group => group.byLang[currentLang])
    .filter(Boolean) as DynamicEntry[]

  const enhanced = await Promise.all(selected.map(attachMeta))

  const sortKey = (entry: DynamicEntry) =>
    (entry.data.updated ?? entry.data.published).valueOf()

  return enhanced.sort((a, b) => sortKey(b) - sortKey(a))
}
