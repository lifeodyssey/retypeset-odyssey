import themeConfig from '@/config'

const defaultLocale = themeConfig.global.locale
const moreLocales = themeConfig.global.moreLocale

// Get the language code in the path
export function getLangFromPath(path: string) {
  const lang = path.split('/')[1]
  return moreLocales.includes(lang) ? lang : defaultLocale
}

// Get the localized path
export function getLocalizedPath(path: string, currentLang?: string) {
  const pathWithoutSlashes = path.replace(/^\/+|\/+$/g, '')
  const lang = currentLang || getLangFromPath(path)

  if (pathWithoutSlashes === '') {
    return lang === defaultLocale ? '/' : `/${lang}/`
  }

  return lang === defaultLocale ? `/${pathWithoutSlashes}/` : `/${lang}/${pathWithoutSlashes}/`
}

export function isHomePage(path: string) {
  return path === '/' || moreLocales.some(lang => path === `/${lang}/`)
}

export function isPostPage(path: string) {
  // 简化：检查路径是否包含posts
  return path.includes('/posts/')
}

export function isTagPage(path: string) {
  // 简化：检查路径是否包含tags
  return path.includes('/tags/')
}

export function isAboutPage(path: string) {
  // 简化：检查路径是否包含about
  return path.includes('/about/')
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
