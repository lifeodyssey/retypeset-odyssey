import { defaultLocale, moreLocales } from '@/config'
import { getLangFromPath, getNextLang } from '@/i18n/lang'
import { cleanPath } from '@/utils/page'

// Generates a localized path based on current language
export function getLocalizedPath(path: string, currentLang?: string) {
  const clean = cleanPath(path)
  const lang = currentLang || getLangFromPath(path)

  if (clean === '') {
    return lang === defaultLocale ? '/' : `/${lang}/`
  }

  return lang === defaultLocale ? `/${clean}/` : `/${lang}/${clean}/`
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
export function getNextSupportedLangUrl(currentPath: string, supportedLangs: string[]): string {
  // 从路径提取当前语言
  const currentLang = getLangFromPath(currentPath)

  // 如果没有提供支持的语言或列表为空，使用普通的语言切换
  if (!supportedLangs || supportedLangs.length === 0) {
    return getNextLangUrl(currentPath)
  }

  // 确保supportedLangs按照allLocales的顺序排序
  const sortedLangs = [...supportedLangs].sort((a, b) => {
    // 使用导入的allLocales变量
    const allLocales = [defaultLocale, ...moreLocales]
    return allLocales.indexOf(a) - allLocales.indexOf(b)
  })

  // 找到当前语言在支持的语言中的索引
  const currentIndex = sortedLangs.indexOf(currentLang)

  // 如果当前语言不在支持的语言中，或者路径是根路径，返回第一个支持的语言
  if (currentIndex === -1 || currentPath === '/') {
    const nextLang = sortedLangs[0]
    // 如果下一个语言是默认语言，返回根路径
    return nextLang === defaultLocale ? '/' : `/${nextLang}/`
  }

  // 计算下一个语言的索引
  const nextIndex = (currentIndex + 1) % sortedLangs.length
  const nextLang = sortedLangs[nextIndex]

  // 构建下一个语言的URL
  return buildNextLangUrl(currentPath, currentLang, nextLang)
}
