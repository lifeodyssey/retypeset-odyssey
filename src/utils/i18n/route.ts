import type { CollectionEntry } from 'astro:content'
import { themeConfig } from '@/config'

// 获取默认语言
const defaultLocale = themeConfig.global.locale

export function generateLanguagePaths() {
  return themeConfig.global.moreLocale.map(lang => ({
    params: { lang },
  }))
}

export function generatePostPaths(posts: CollectionEntry<'posts'>[]) {
  return posts.map(post => ({
    params: {
      slug: post.data.abbrlink || post.slug,
    },
    props: { post },
  }))
}

export function generateMultiLangPostPaths(posts: CollectionEntry<'posts'>[]) {
  interface PathResult {
    params: {
      lang: string
      slug: string
    }
    props: {
      post: CollectionEntry<'posts'>
    }
  }

  const result: PathResult[] = []

  posts.forEach((post) => {
    // 确定这篇文章应该生成哪些语言版本
    let postLangs: string[] = themeConfig.global.moreLocale

    if (post.data.lang && typeof post.data.lang === 'string' && post.data.lang.trim() !== '') {
      // 如果lang是单个字符串，转为数组
      postLangs = [post.data.lang]
    }

    // 处理非默认语言的路径
    postLangs.forEach((lang) => {
      // 跳过默认语言，它将通过 generatePostPaths 生成
      if (lang !== defaultLocale) {
        result.push({
          params: {
            lang,
            slug: post.data.abbrlink || post.slug,
          },
          props: { post },
        })
      }
    })

    // 如果文章支持默认语言，则生成无语言代码的路径
    // 默认语言条件：未指定lang属性，或lang属性等于defaultLocale
    const supportsDefaultLang = !post.data.lang
      || (typeof post.data.lang === 'string' && post.data.lang === defaultLocale)

    if (supportsDefaultLang) {
      // 默认语言的路径不包含语言代码，在这里用特殊参数标记
      // 这将由 [slug].astro 页面处理，不在URL中显示语言代码
      result.push({
        params: {
          lang: 'default',
          slug: post.data.abbrlink || post.slug,
        },
        props: { post },
      })
    }
  })

  return result
}

export function generateMultiLangTagPaths(tags: string[]) {
  return themeConfig.global.moreLocale.flatMap(lang =>
    // 跳过默认语言，它将通过其他路径生成
    lang !== defaultLocale
      ? tags.map(tag => ({
          params: { lang, tag },
          props: { tag },
        }))
      : [],
  )
}
