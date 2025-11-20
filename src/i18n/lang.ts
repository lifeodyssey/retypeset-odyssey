import { allLocales, base, defaultLocale, moreLocales } from '@/config'
import { langMap } from '@/i18n/config'

/**
 * Get the corresponding short language code from the complete current locale value
 *
 * @param locale Current locale value (e.g. 'en-US')
 * @returns Corresponding language code (e.g. 'en') or default locale
 */
export function getLangFromLocale(locale: string | undefined): string {
  if (!locale) {
    return defaultLocale
  }
  return Object.entries(langMap).find(([, codes]) => codes.includes(locale))?.[0] ?? defaultLocale
}

/**
 * Get the language code from the current path
 *
 * @param path Current page path
 * @returns Language code detected from path or default locale
 */
export function getLangFromPath(path: string) {
  const pathWithoutBase = base && path.startsWith(base)
    ? path.slice(base.length)
    : path

  return moreLocales.find(lang => pathWithoutBase.startsWith(`/${lang}/`)) ?? defaultLocale
}

/**
 * Get the next language code in the global language cycle
 *
 * @param currentLang Current language code
 * @returns Next language code in the global cycle
 */
export function getNextGlobalLang(currentLang: string): string {
  // Get index of current language
  const currentIndex = allLocales.indexOf(currentLang)
  if (currentIndex === -1) {
    return defaultLocale
  }

  // Calculate and return next language in cycle
  const nextIndex = (currentIndex + 1) % allLocales.length
  return allLocales[nextIndex]
}
