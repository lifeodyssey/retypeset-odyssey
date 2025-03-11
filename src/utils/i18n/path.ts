import themeConfig from '@/config'

const defaultLocale = themeConfig.global.locale
const moreLocales = themeConfig.global.moreLocale

export function cleanPath(path: string) {
  return path.replace(/^\/+|\/+$/g, '')
}

export function getLangFromPath(path: string) {
  const secondaryLang = moreLocales.find(
    lang =>
      path.startsWith(`/${lang}/`)
      || path === `/${lang}`
      || path === `/${lang}/`,
  )
  return secondaryLang || defaultLocale
}

export function getLocalizedPath(path: string, currentLang?: string) {
  const clean = cleanPath(path)
  const lang = currentLang || getLangFromPath(path)

  // 如果是根目录（clean为空），则返回/
  if (clean === '') {
    return lang === defaultLocale ? '/' : `/${lang}/`
  }

  // 其他路径正常处理
  return lang === defaultLocale ? `/${clean}/` : `/${lang}/${clean}/`
}

export function isHomePage(path: string) {
  const clean = cleanPath(path)
  return clean === '' || moreLocales.includes(clean)
}

export function isPostPage(path: string) {
  const clean = cleanPath(path)
  return clean.startsWith('posts') || moreLocales.some(lang => clean.startsWith(`${lang}/posts`))
}

export function isTagPage(path: string) {
  const clean = cleanPath(path)
  return clean.startsWith('tags') || moreLocales.some(lang => clean.startsWith(`${lang}/tags`))
}

export function isAboutPage(path: string) {
  const clean = cleanPath(path)
  return clean.startsWith('about') || moreLocales.some(lang => clean.startsWith(`${lang}/about`))
}

export function getPagePath(path: string) {
  const currentLang = getLangFromPath(path)

  return {
    currentLang,
    isHome: isHomePage(path),
    isPost: isPostPage(path),
    isTag: isTagPage(path),
    isAbout: isAboutPage(path),
    getLocalizedPath: (targetPath: string) => getLocalizedPath(targetPath, currentLang),
  }
}

/**
 * 获取特定文章支持的语言列表
 * @param post 文章对象
 * @returns 该文章支持的语言数组，如果未指定则返回所有配置语言
 */
export function getAvailableLanguages(post?: { data?: { lang?: string } }) {
  // 默认支持所有配置的语言
  const defaultLangs = ['', ...themeConfig.global.moreLocale]

  // 如果没有提供文章对象，返回所有语言
  if (!post || !post.data) {
    return defaultLangs
  }

  // 确定文章支持的语言
  if (post.data.lang && typeof post.data.lang === 'string' && post.data.lang.trim() !== '') {
    // 如果lang是字符串
    return ['', post.data.lang]
  }

  // 如果没有指定或格式不对，返回所有语言
  return defaultLangs
}
