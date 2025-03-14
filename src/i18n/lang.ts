import { allLocales, defaultLocale, moreLocales } from '@/i18n/config'
import { walineLocaleMap } from '@/i18n/ui'

/**
 * 获取下一个语言代码
 * @param currentLang 当前语言代码
 * @returns 下一个语言代码
 */
export function getNextLang(currentLang: string): string {
  // 获取默认语言和所有支持的语言
  // 直接使用导入的变量

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
  // 直接使用导入的变量
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
  // 直接使用导入的变量
  let currentLang = ''

  // 检查路径是否以/xx/开始，其中xx是支持的语言代码
  for (const lang of moreLocales) {
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
 * 获取文章支持的语言
 * @param lang 文章的语言属性
 * @returns 支持的语言数组
 */
export function getSupportedLangs(lang?: string): string[] {
  // 直接使用导入的变量

  // 如果指定了语言且不为空
  if (lang && typeof lang === 'string' && lang.trim() !== '') {
    return [lang]
  }

  // 否则返回所有支持的语言
  return allLocales
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

/**
 * 根据支持的语言列表获取下一个语言的URL
 * @param currentPath 当前路径
 * @param supportedLangs 文章支持的语言列表
 * @returns 下一个可用语言的URL
 */
export function getPostNextLangUrl(currentPath: string, supportedLangs: string[]): string {
  // 从路径提取当前语言
  const currentLang = getLangFromPath(currentPath)

  // 如果没有提供支持的语言或列表为空，使用普通的语言切换
  if (!supportedLangs || supportedLangs.length === 0) {
    return getNextLangUrl(currentPath)
  }

  // 找到当前语言在支持的语言中的索引
  const currentIndex = supportedLangs.indexOf(currentLang)

  // 如果当前语言不在支持的语言中，或者路径是根路径，返回第一个支持的语言
  if (currentIndex === -1 || currentPath === '/') {
    const nextLang = supportedLangs[0]
    // 如果下一个语言是默认语言，返回根路径
    return nextLang === defaultLocale ? '/' : `/${nextLang}/`
  }

  // 计算下一个语言的索引
  const nextIndex = (currentIndex + 1) % supportedLangs.length
  const nextLang = supportedLangs[nextIndex]

  // 构建下一个语言的URL
  return buildNextLangUrl(currentPath, currentLang, nextLang)
}

/**
 * Get the language code of Waline
 * @param currentPath Current page path
 * @param defaultLocale Default language
 * @returns Corresponding Waline language code
 */
export function getWalineLang(currentPath: string, defaultLocale: string): string {
  // Extract language code from path
  const pathLang = Object.keys(walineLocaleMap).find(code =>
    currentPath.startsWith(`/${code}/`),
  )
  // Return found path language or default language
  const lang = pathLang || defaultLocale
  return walineLocaleMap[lang as keyof typeof walineLocaleMap]
}
