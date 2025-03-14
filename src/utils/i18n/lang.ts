import { themeConfig } from '@/config'

/**
 * 获取下一个语言代码
 * @param currentLang 当前语言代码
 * @returns 下一个语言代码
 */
export function getNextLang(currentLang: string): string {
  // 获取默认语言和所有支持的语言
  const defaultLocale = themeConfig.global.locale
  const allLocales = [defaultLocale, ...themeConfig.global.moreLocale]

  // 找到当前语言在列表中的索引
  const currentIndex = allLocales.indexOf(currentLang)

  // 如果当前语言不在列表中，返回默认语言
  if (currentIndex === -1) {
    return defaultLocale
  }

  // 计算下一个语言的索引（循环）
  const nextIndex = (currentIndex + 1) % allLocales.length

  // 返回下一个语言代码
  return allLocales[nextIndex]
}

/**
 * 构建下一个语言的URL
 * @param currentPath 当前页面路径
 * @param currentLang 当前语言代码
 * @param nextLang 下一个语言代码
 * @returns 下一个语言的URL
 */
export function buildNextLangUrl(currentPath: string, currentLang: string, nextLang: string): string {
  const defaultLocale = themeConfig.global.locale
  let nextUrl = ''

  if (nextLang === defaultLocale) {
    // 如果下一个是默认语言，移除语言代码
    nextUrl = currentPath.replace(`/${currentLang}`, '') || '/'
  }
  else {
    // 如果当前是默认语言（没有语言代码在路径中）
    if (currentLang === defaultLocale) {
      // 在路径前添加新的语言代码
      nextUrl = `/${nextLang}${currentPath}`
    }
    else {
      // 替换当前语言代码为新的语言代码
      nextUrl = currentPath.replace(`/${currentLang}`, `/${nextLang}`)
    }
  }

  // 确保URL格式正确
  if (nextUrl === '')
    nextUrl = '/'

  // 确保非根路径的URL末尾有斜杠
  if (nextUrl !== '/' && !nextUrl.endsWith('/')) {
    nextUrl = `${nextUrl}/`
  }

  return nextUrl
}

/**
 * 从当前路径中提取语言代码
 * @param currentPath 当前页面路径
 * @returns 当前语言代码
 */
export function getLangFromPath(currentPath: string): string {
  const defaultLocale = themeConfig.global.locale
  let currentLang = ''

  // 检查路径是否以/xx/开始，其中xx是支持的语言代码
  for (const lang of themeConfig.global.moreLocale) {
    if (currentPath.startsWith(`/${lang}/`) || currentPath === `/${lang}`) {
      currentLang = lang
      break
    }
  }

  // 如果没有找到语言代码，则认为是默认语言
  if (!currentLang) {
    currentLang = defaultLocale
  }

  return currentLang
}

/**
 * 直接从当前路径获取下一个语言的URL
 * @param currentPath 当前页面路径
 * @returns 下一个语言的URL
 */
export function getNextLangUrl(currentPath: string): string {
  // 从路径提取当前语言
  const currentLang = getLangFromPath(currentPath)

  // 获取下一个语言
  const nextLang = getNextLang(currentLang)

  // 构建下一个语言的URL
  return buildNextLangUrl(currentPath, currentLang, nextLang)
}
