import { allLocales, defaultLocale, moreLocales } from '@/config'

// Gets the language code from the current path
export function getLangFromPath(path: string) {
  const secondaryLang = moreLocales.find(
    lang =>
      path.startsWith(`/${lang}/`),
  )
  return secondaryLang || defaultLocale
}

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
