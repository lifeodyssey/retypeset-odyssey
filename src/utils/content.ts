import type { CollectionEntry } from 'astro:content'
import themeConfig from '@/config'
import { langPath } from '@/utils/i18n/ui'
import { getCollection } from 'astro:content'

// Type definitions
export type Post = CollectionEntry<'posts'> & {
  remarkPluginFrontmatter?: {
    minutes?: number
  }
}
export type PostData = Post['data']
export type PostsGroupByYear = Map<number, Post[]>

// Get post metadata including reading time
async function getPostMeta(post: CollectionEntry<'posts'>): Promise<Post> {
  const { remarkPluginFrontmatter } = await post.render()
  return { ...post, remarkPluginFrontmatter }
}

// Check if the slug is duplicated under the same language
export async function checkSlugDuplication(posts: Post[]): Promise<string[]> {
  const slugMap = new Map<string, Set<string>>()
  const duplicates: string[] = []

  posts.forEach((post) => {
    const lang = post.data.lang || ''
    const slug = post.data.slug || post.slug

    if (!slugMap.has(lang)) {
      slugMap.set(lang, new Set())
    }

    const slugSet = slugMap.get(lang)!
    if (slugSet.has(slug)) {
      duplicates.push(`Duplicate slug "${slug}" found in language "${lang || 'default'}"`)
    }
    else {
      slugSet.add(slug)
    }
  })

  return duplicates
}

// Get all posts except drafts (include pinned)
export async function getPosts(lang?: string) {
  const defaultLocale = themeConfig.global.locale
  const currentLang = lang || defaultLocale

  const posts = await getCollection(
    'posts',
    ({ data }: Post) => {
      const shouldInclude = import.meta.env.DEV || !data.draft
      if (!langPath.includes(currentLang)) {
        return shouldInclude && data.lang === ''
      }
      return shouldInclude && (data.lang === currentLang || data.lang === '')
    },
  )

  const postsWithMeta = await Promise.all(posts.map(getPostMeta))

  return postsWithMeta.sort((a: Post, b: Post) =>
    b.data.published.valueOf() - a.data.published.valueOf(),
  )
}

// Get all posts except drafts (not pinned)
export async function getRegularPosts(lang?: string) {
  const posts = await getPosts(lang)
  return posts.filter(post => !post.data.pin)
}

// Get pinned posts
export async function getPinnedPosts(lang?: string) {
  const posts = await getPosts(lang)
  return posts.filter(post => post.data.pin)
}

// Get posts grouped by year (not pinned)
export async function getPostsByYear(lang?: string): Promise<PostsGroupByYear> {
  const posts = await getRegularPosts(lang)
  const yearMap = new Map<number, Post[]>()

  posts.forEach((post: Post) => {
    const year = post.data.published.getFullYear()
    if (!yearMap.has(year)) {
      yearMap.set(year, [])
    }
    yearMap.get(year)?.push(post)
  })

  yearMap.forEach((yearPosts) => {
    yearPosts.sort((a: Post, b: Post) => {
      const aDate = a.data.published
      const bDate = b.data.published
      const monthDiff = bDate.getMonth() - aDate.getMonth()

      if (monthDiff !== 0) {
        return monthDiff
      }
      return bDate.getDate() - aDate.getDate()
    })
  })

  return new Map([...yearMap.entries()].sort((a, b) => b[0] - a[0]))
}

// Get all tags
export async function getAllTags(lang?: string) {
  const posts = await getPosts(lang)
  const tags = new Set<string>()

  posts.forEach((post: Post) => {
    post.data.tags?.forEach((tag: string) =>
      tags.add(tag),
    )
  })

  return Array.from(tags)
}

// Get posts grouped by tags
export async function getPostsGroupByTags(lang?: string) {
  const posts = await getRegularPosts(lang)
  const tagMap = new Map<string, Post[]>()

  posts.forEach((post: Post) => {
    if (post.data.tags && post.data.tags.length > 0) {
      post.data.tags.forEach((tag: string) => {
        if (!tagMap.has(tag)) {
          tagMap.set(tag, [])
        }
        tagMap.get(tag)?.push(post)
      })
    }
  })

  return tagMap
}

// Get all posts by specific tag
export async function getPostsByTag(tag: string, lang?: string) {
  const posts = await getPosts(lang)
  return posts.filter((post: Post) =>
    post.data.tags?.includes(tag),
  )
}
