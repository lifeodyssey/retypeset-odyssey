import type { CollectionEntry } from 'astro:content'
import { defaultLocale, themeConfig } from '@/config'
import { getPostPath } from '@/i18n/path'
import { getPosts, getPostSlug } from '@/utils/content'

export async function getLlmsPosts(): Promise<CollectionEntry<'posts'>[]> {
  const featured = themeConfig.seo?.llms?.featured ?? []
  const posts = await getPosts()

  if (!featured.length) {
    return posts
  }

  const order = new Map(featured.map((slug, index) => [slug, index]))

  return posts
    .filter(post => order.has(getPostSlug(post)))
    .sort((a, b) => (order.get(getPostSlug(a)) ?? 0) - (order.get(getPostSlug(b)) ?? 0))
}

export function publicPostUrl(
  post: CollectionEntry<'posts'>,
  site: URL | string | undefined,
): string {
  const path = getPostPath(getPostSlug(post), defaultLocale)
  if (!site) {
    return path
  }

  const origin = typeof site === 'string' ? site : site.href
  const base = origin.endsWith('/') ? origin : `${origin}/`

  return new URL(path.replace(/^\//, ''), base).href
}
