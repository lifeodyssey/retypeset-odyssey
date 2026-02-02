import type { CollectionEntry } from 'astro:content'
import type { Language } from '@/i18n/config'
import type { Post } from '@/types'
import { getCollection, render } from 'astro:content'
import { defaultLocale } from '@/config'
import { memoize } from '@/utils/cache'

const metaCache = new Map<string, { minutes: number }>()

// Tags that indicate science/research content (checked first, highest priority)
const SCIENCE_TAGS = new Set([
  'ocean color', 'remote sensing', 'oceanography', 'research',
  'satellite', 'gis', 'earth observation',
  'climate', 'environmental science', 'geospatial',
])

// Tags that indicate technical content
const TECH_TAGS = new Set([
  // Programming & Development
  'python', 'java', 'javascript', 'typescript', 'golang', 'rust',
  'algorithm', 'leetcode', 'data structure',
  'software engineering', 'programming', 'coding',
  // AI & Machine Learning
  'deep learning', 'machine learning', 'tensorflow', 'pytorch',
  'ai', 'artificial intelligence', 'neural network',
  'large language model', 'llm', 'agentic ai', 'claude code',
  // DevOps & Tools
  'docker', 'kubernetes', 'aws', 'cloud', 'devops',
  'git', 'linux', 'database', 'sql',
])

export type PostCategory = 'tech' | 'life' | 'science'

/**
 * Get the URL slug for a post
 * Priority: slug > abbrlink > post.id
 */
export function getPostSlug(post: CollectionEntry<'posts'>): string {
  return post.data.slug || post.data.abbrlink || post.id
}

/**
 * Determine the category of a post based on its tags
 * Priority: Science > Tech > Life
 * Science posts go to /science/, Tech posts go to /tech/, life posts go to /life/
 */
export function getPostCategory(post: CollectionEntry<'posts'>): PostCategory {
  const tags = post.data.tags || []
  const normalizedTags = tags.map((t: string) => t.toLowerCase())

  // Check science tags first (highest priority)
  for (const tag of normalizedTags) {
    if (SCIENCE_TAGS.has(tag)) {
      return 'science'
    }
  }

  // Then check tech tags
  for (const tag of normalizedTags) {
    if (TECH_TAGS.has(tag)) {
      return 'tech'
    }
  }

  return 'life'
}

/**
 * Get the URL path for a post including its category subdirectory
 */
export function getPostPath(post: CollectionEntry<'posts'>, langPrefix?: string): string {
  const category = getPostCategory(post)
  const slug = getPostSlug(post)
  const prefix = langPrefix ? `/${langPrefix}` : ''
  return `${prefix}/${category}/posts/${slug}.html`
}

/**
 * Add metadata including reading time to a post
 *
 * @param post The post to enhance with metadata
 * @returns Enhanced post with reading time information
 */
async function addMetaToPost(post: CollectionEntry<'posts'>): Promise<Post> {
  const cacheKey = `${post.id}-${post.data.lang || 'universal'}`
  const cachedMeta = metaCache.get(cacheKey)
  if (cachedMeta) {
    return {
      ...post,
      remarkPluginFrontmatter: cachedMeta,
    }
  }

  const { remarkPluginFrontmatter } = await render(post)
  const meta = remarkPluginFrontmatter as { minutes: number }
  metaCache.set(cacheKey, meta)

  return {
    ...post,
    remarkPluginFrontmatter: meta,
  }
}

/**
 * Find duplicate post slugs within the same language
 *
 * @param posts Array of blog posts to check
 * @returns Array of descriptive error messages for duplicate slugs
 */
export async function checkPostSlugDuplication(posts: CollectionEntry<'posts'>[]): Promise<string[]> {
  const slugMap = new Map<string, Set<string>>()
  const duplicates: string[] = []

  posts.forEach((post) => {
    const lang = post.data.lang
    const slug = getPostSlug(post)

    let slugSet = slugMap.get(lang)
    if (!slugSet) {
      slugSet = new Set()
      slugMap.set(lang, slugSet)
    }

    if (!slugSet.has(slug)) {
      slugSet.add(slug)
      return
    }

    if (!lang) {
      duplicates.push(`Duplicate slug "${slug}" found in universal post (applies to all languages)`)
    }
    else {
      duplicates.push(`Duplicate slug "${slug}" found in "${lang}" language post`)
    }
  })

  return duplicates
}

/**
 * Get all posts (including pinned ones, excluding drafts in production)
 *
 * @param lang The language code to filter by, defaults to site's default language
 * @returns Posts filtered by language, enhanced with metadata, sorted by date
 */
async function _getPosts(lang?: Language) {
  const currentLang = lang || defaultLocale

  const filteredPosts = await getCollection(
    'posts',
    ({ data }: CollectionEntry<'posts'>) => {
      // Show drafts in dev mode only
      const shouldInclude = import.meta.env.DEV || !data.draft
      return shouldInclude && (data.lang === currentLang || data.lang === '')
    },
  )

  const enhancedPosts = await Promise.all(filteredPosts.map(addMetaToPost))

  return enhancedPosts.sort((a, b) =>
    b.data.published.valueOf() - a.data.published.valueOf(),
  )
}

export const getPosts = memoize(_getPosts)

/**
 * Get all non-pinned posts
 *
 * @param lang The language code to filter by, defaults to site's default language
 * @returns Regular posts (non-pinned), filtered by language
 */
async function _getRegularPosts(lang?: Language) {
  const posts = await getPosts(lang)
  return posts.filter(post => !post.data.pin)
}

export const getRegularPosts = memoize(_getRegularPosts)

/**
 * Get pinned posts sorted by pin priority
 *
 * @param lang The language code to filter by, defaults to site's default language
 * @returns Pinned posts sorted by pin value in descending order
 */
async function _getPinnedPosts(lang?: Language) {
  const posts = await getPosts(lang)
  return posts
    .filter(post => post.data.pin && post.data.pin > 0)
    .sort((a, b) => (b.data.pin ?? 0) - (a.data.pin ?? 0))
}

export const getPinnedPosts = memoize(_getPinnedPosts)

/**
 * Group posts by year and sort within each year
 *
 * @param lang The language code to filter by, defaults to site's default language
 * @returns Map of posts grouped by year (descending), sorted by date within each year
 */
async function _getPostsByYear(lang?: Language): Promise<Map<number, Post[]>> {
  const posts = await getRegularPosts(lang)
  const yearMap = new Map<number, Post[]>()

  posts.forEach((post: Post) => {
    const year = post.data.published.getFullYear()
    let yearPosts = yearMap.get(year)
    if (!yearPosts) {
      yearPosts = []
      yearMap.set(year, yearPosts)
    }
    yearPosts.push(post)
  })

  // Sort posts within each year by date
  yearMap.forEach((yearPosts) => {
    yearPosts.sort((a, b) => {
      const aDate = a.data.published
      const bDate = b.data.published
      return bDate.getMonth() - aDate.getMonth() || bDate.getDate() - aDate.getDate()
    })
  })

  return new Map([...yearMap.entries()].sort((a, b) => b[0] - a[0]))
}

export const getPostsByYear = memoize(_getPostsByYear)

/**
 * Group posts by their tags
 *
 * @param lang The language code to filter by, defaults to site's default language
 * @returns Map where keys are tag names and values are arrays of posts with that tag
 */
async function _getPostsGroupByTags(lang?: Language) {
  const posts = await getPosts(lang)
  const tagMap = new Map<string, Post[]>()

  posts.forEach((post: Post) => {
    post.data.tags?.forEach((tag: string) => {
      let tagPosts = tagMap.get(tag)
      if (!tagPosts) {
        tagPosts = []
        tagMap.set(tag, tagPosts)
      }
      tagPosts.push(post)
    })
  })

  return tagMap
}

export const getPostsGroupByTags = memoize(_getPostsGroupByTags)

/**
 * Get all tags sorted by post count
 *
 * @param lang The language code to filter by, defaults to site's default language
 * @returns Array of tags sorted by popularity (most posts first)
 */
async function _getAllTags(lang?: Language) {
  const tagMap = await getPostsGroupByTags(lang)
  const tagsWithCount = Array.from(tagMap.entries())

  tagsWithCount.sort((a, b) => b[1].length - a[1].length)
  return tagsWithCount.map(([tag]) => tag)
}

export const getAllTags = memoize(_getAllTags)

/**
 * Tag with post count interface
 */
export interface TagWithCount {
  name: string
  count: number
}

/**
 * Get all tags with their post counts
 *
 * @param lang The language code to filter by
 * @returns Array of tags with counts, sorted by popularity
 */
async function _getTagsWithCounts(lang?: Language): Promise<TagWithCount[]> {
  const tagMap = await getPostsGroupByTags(lang)
  return Array.from(tagMap.entries())
    .map(([name, posts]) => ({ name, count: posts.length }))
    .sort((a, b) => b.count - a.count)
}

export const getTagsWithCounts = memoize(_getTagsWithCounts)

/**
 * Get all posts that contain a specific tag
 *
 * @param tag The tag name to filter posts by
 * @param lang The language code to filter by, defaults to site's default language
 * @returns Array of posts that contain the specified tag
 */
async function _getPostsByTag(tag: string, lang?: Language) {
  const tagMap = await getPostsGroupByTags(lang)
  return tagMap.get(tag) ?? []
}

export const getPostsByTag = memoize(_getPostsByTag)

/**
 * Check which languages support a specific tag
 *
 * @param tag The tag name to check language support for
 * @returns Array of language codes that support the specified tag
 */
async function _getTagSupportedLangs(tag: string): Promise<Language[]> {
  const posts = await getCollection(
    'posts',
    ({ data }) => !data.draft,
  )
  const { allLocales } = await import('@/config')

  return allLocales.filter(locale =>
    posts.some(post =>
      post.data.tags?.includes(tag)
      && (post.data.lang === locale || post.data.lang === ''),
    ),
  )
}

export const getTagSupportedLangs = memoize(_getTagSupportedLangs)

/**
 * Get posts filtered by category (tech, life, or science)
 *
 * @param category The category to filter by ('tech', 'life', or 'science')
 * @param lang The language code to filter by, defaults to site's default language
 *             Note: Science category ignores language filtering and shows all posts
 * @returns Posts filtered by category (and language for non-science), sorted by date
 */
async function _getPostsByCategory(category: PostCategory, lang?: Language) {
  // Science category shows all posts regardless of language
  if (category === 'science') {
    const allPosts = await getCollection(
      'posts',
      ({ data }: CollectionEntry<'posts'>) => {
        return import.meta.env.DEV || !data.draft
      },
    )
    const enhancedPosts = await Promise.all(allPosts.map(addMetaToPost))
    return enhancedPosts
      .filter(post => getPostCategory(post) === category)
      .sort((a, b) => b.data.published.valueOf() - a.data.published.valueOf())
  }

  // Tech and Life categories filter by language
  const posts = await getPosts(lang)
  return posts.filter(post => getPostCategory(post) === category)
}

export const getPostsByCategory = memoize(_getPostsByCategory)

/**
 * Category with post count interface
 */
export interface CategoryWithCount {
  name: PostCategory
  count: number
}

/**
 * Get all categories with their post counts
 */
async function _getCategoriesWithCounts(lang?: Language): Promise<CategoryWithCount[]> {
  const categories: PostCategory[] = ['tech', 'life', 'science']
  const results = await Promise.all(
    categories.map(async cat => ({
      name: cat,
      count: (await getPostsByCategory(cat, lang)).length,
    })),
  )
  return results.sort((a, b) => b.count - a.count)
}

export const getCategoriesWithCounts = memoize(_getCategoriesWithCounts)

/**
 * Check which languages support a specific category
 *
 * @param category The category to check language support for
 * @returns Array of language codes that have posts in the specified category
 */
async function _getCategorySupportedLangs(category: PostCategory): Promise<Language[]> {
  const posts = await getCollection(
    'posts',
    ({ data }) => !data.draft,
  )
  const { allLocales } = await import('@/config')

  return allLocales.filter(locale =>
    posts.some((post) => {
      const postCategory = getPostCategory(post)
      return postCategory === category
        && (post.data.lang === locale || post.data.lang === '')
    }),
  )
}

export const getCategorySupportedLangs = memoize(_getCategorySupportedLangs)

/**
 * User-defined category with post count interface
 * These are categories defined in post frontmatter, not computed categories
 */
export interface UserCategoryWithCount {
  name: string
  count: number
}

/**
 * Group posts by their user-defined categories (from frontmatter)
 *
 * @param lang The language code to filter by
 * @returns Map where keys are category names and values are arrays of posts
 */
async function _getPostsGroupByUserCategories(lang?: Language) {
  const posts = await getPosts(lang)
  const categoryMap = new Map<string, Post[]>()

  posts.forEach((post: Post) => {
    const categories = post.data.categories || []
    // Handle both string and array formats
    const categoryList = Array.isArray(categories) ? categories : [categories]

    categoryList.forEach((category: string) => {
      if (!category) return
      let categoryPosts = categoryMap.get(category)
      if (!categoryPosts) {
        categoryPosts = []
        categoryMap.set(category, categoryPosts)
      }
      categoryPosts.push(post)
    })
  })

  return categoryMap
}

export const getPostsGroupByUserCategories = memoize(_getPostsGroupByUserCategories)

/**
 * Get all user-defined categories with their post counts
 *
 * @param lang The language code to filter by
 * @returns Array of categories with counts, sorted by popularity
 */
async function _getUserCategoriesWithCounts(lang?: Language): Promise<UserCategoryWithCount[]> {
  const categoryMap = await getPostsGroupByUserCategories(lang)
  return Array.from(categoryMap.entries())
    .map(([name, posts]) => ({ name, count: posts.length }))
    .sort((a, b) => b.count - a.count)
}

export const getUserCategoriesWithCounts = memoize(_getUserCategoriesWithCounts)

/**
 * Get all posts that belong to a specific user-defined category
 *
 * @param category The category name to filter posts by
 * @param lang The language code to filter by
 * @returns Array of posts in the specified category
 */
async function _getPostsByUserCategory(category: string, lang?: Language) {
  const categoryMap = await getPostsGroupByUserCategories(lang)
  return categoryMap.get(category) ?? []
}

export const getPostsByUserCategory = memoize(_getPostsByUserCategory)
