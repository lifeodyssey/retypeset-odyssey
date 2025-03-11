import themeConfig from '@/config'

const defaultLocale = themeConfig.global.locale
const moreLocales = themeConfig.global.moreLocale

// Get the language code from the path
export function getLangFromPath(path: string) {
  const lang = path.split('/')[1]
  return moreLocales.includes(lang) ? lang : defaultLocale
}

// Get the localized path
export function getLocalizedPath(path: string) {
  const pathWithoutSlashes = path.replace(/^\/+|\/+$/g, '')
  const lang = getLangFromPath(path)

  if (pathWithoutSlashes === '') {
    return lang === defaultLocale ? '/' : `/${lang}/`
  }

  return lang === defaultLocale ? `/${pathWithoutSlashes}/` : `/${lang}/${pathWithoutSlashes}/`
}

// Checking the current path to the page
export function isHomePage(path: string) {
  return path === '/' || moreLocales.some(lang => path === `/${lang}/`)
}

export function isPostPage(path: string) {
  return path.includes('/posts/')
}

export function isTagPage(path: string) {
  return path.includes('/tags/')
}

export function isAboutPage(path: string) {
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
    getLocalizedPath: (targetPath: string) => getLocalizedPath(targetPath),
  }
}
