import type { CollectionEntry } from 'astro:content'
import { allLocales, defaultLocale, moreLocales } from '@/i18n/config'

// 生成默认语言标签页面的路由配置
export function getTagRoutes(tags: string[]) {
  return tags.map(tag => ({
    params: { tag },
    props: { tag },
  }))
}

// 生成默认语言文章页面的路由配置
export function getPostRoutes(posts: CollectionEntry<'posts'>[]) {
  // 创建slug到语言的映射
  const slugToLangs: Record<string, string[]> = {}

  // 填充映射
  posts.forEach((post) => {
    const slug = post.data.abbrlink || post.slug
    const lang = post.data.lang || defaultLocale

    // 如果文章没有指定语言，初始化为所有支持的语言
    if (!slugToLangs[slug]) {
      if (!post.data.lang) {
        slugToLangs[slug] = [...allLocales] // 文章支持所有语言
      }
      else {
        slugToLangs[slug] = [defaultLocale] // 仅默认语言和指定语言
      }
    }

    if (!slugToLangs[slug].includes(lang)) {
      slugToLangs[slug].push(lang)
    }
  })

  return posts.map(post => ({
    params: {
      slug: post.data.abbrlink || post.slug,
    },
    props: {
      post,
      supportedLangs: slugToLangs[post.data.abbrlink || post.slug] || [],
    },
  }))
}

// 生成更多语言静态路由
export function getMultiLangRoutes() {
  return moreLocales.map(lang => ({
    params: { lang },
  }))
}

// 生成更多语言标签页面的路由配置
export function getMultiLangTagRoutes(tags: string[]) {
  return moreLocales.flatMap(lang => (
    tags.map(tag => ({
      params: { lang, tag },
      props: { tag },
    }))
  ))
}

// 生成更多语言文章页面的路由配置
export function getMultiLangPostRoutes(posts: CollectionEntry<'posts'>[]) {
  // 创建slug到语言的映射
  const slugToLangs: Record<string, string[]> = {}

  // 填充映射
  posts.forEach((post) => {
    const slug = post.data.abbrlink || post.slug
    const lang = post.data.lang || defaultLocale

    // 如果文章没有指定语言，初始化为所有支持的语言
    if (!slugToLangs[slug]) {
      if (!post.data.lang) {
        slugToLangs[slug] = [...allLocales] // 文章支持所有语言
      }
      else {
        slugToLangs[slug] = [defaultLocale] // 仅默认语言和指定语言
      }
    }

    if (!slugToLangs[slug].includes(lang)) {
      slugToLangs[slug].push(lang)
    }
  })

  interface PathResult {
    params: {
      lang: string
      slug: string
    }
    props: {
      post: CollectionEntry<'posts'>
      supportedLangs: string[]
    }
  }

  return posts.flatMap((post) => {
    const result: PathResult[] = []
    const slug = post.data.abbrlink || post.slug

    // 确定文章的语言支持
    const postLang = post.data.lang && typeof post.data.lang === 'string' && post.data.lang.trim() !== ''
      ? [post.data.lang]
      : moreLocales

    // 获取这篇文章支持的所有语言
    const supportedLangs = slugToLangs[slug] || []

    // 添加非默认语言路径
    postLang.forEach((lang) => {
      if (lang !== defaultLocale) {
        result.push({
          params: { lang, slug },
          props: { post, supportedLangs },
        })
      }
    })

    return result
  })
}
