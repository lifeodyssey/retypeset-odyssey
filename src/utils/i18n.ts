import type { CollectionEntry } from 'astro:content'
import { themeConfig } from '@/config'

export function generateLanguagePaths() {
  return themeConfig.global.moreLocale.map(lang => ({
    params: { lang },
  }))
}

export function generatePostPaths(posts: CollectionEntry<'posts'>[]) {
  return posts.map(post => ({
    params: {
      slug: post.data.slug || post.slug,
    },
    props: { post },
  }))
}

export function generateMultiLangPostPaths(posts: CollectionEntry<'posts'>[]) {
  return themeConfig.global.moreLocale.flatMap(lang =>
    posts.map(post => ({
      params: {
        lang,
        slug: post.data.slug || post.slug,
      },
      props: { post },
    })),
  )
}

export function generateMultiLangTagPaths(tags: string[]) {
  return themeConfig.global.moreLocale.flatMap(lang =>
    tags.map(tag => ({
      params: { lang, tags: tag },
      props: { tags: tag },
    })),
  )
}
