import { allLocales, base, defaultLocale, moreLocales } from '@/config'
import { langMap } from './config'

/**
 * Get the internal language code (path) that corresponding to the given locale.
 *
 * @param locale Locale value in Astro.config.i18n.locales.[].codes
 * @returns Corresponding internal langguage code or the default one
 */
export function getLangFromLocale(locale: string | undefined): string {
  if (!locale) {
    return defaultLocale
  }
  return Object.keys(langMap).find(lang => langMap[lang].includes(locale))
    || defaultLocale
}

/**
 * Gets the language code from the current path
 *
 * @param path Current page path
 * @returns Language code detected from path or default locale
 */
export function getLangFromPath(path: string) {
  const pathWithoutBase = base && path.startsWith(base)
    ? path.slice(base.length)
    : path

  return moreLocales.find(lang =>
    pathWithoutBase.startsWith(`/${lang}/`)) ?? defaultLocale
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
