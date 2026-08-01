import type { Language } from '@/i18n/config'
import { base, defaultLocale } from '@/config'
import { getNextLangPath } from '@/i18n/path'

/**
 * Astro's `build.format: 'file'` exposes output filenames such as
 * `/index.html` and `/posts/example.html` through `Astro.url` while the
 * public site serves their clean-URL equivalents. SEO signals must point at
 * the final public URL, not at a filename that redirects there.
 */
export function getCanonicalPath(pathname: string): string {
  const withoutIndex = pathname.replace(/\/index\.html$/, '/')
  const withoutHtml = withoutIndex.replace(/\.html$/, '')

  return withoutHtml || '/'
}

export function getAlternatePath(
  pathname: string,
  currentLang: Language,
  targetLang: Language,
): string {
  return getNextLangPath(getCanonicalPath(pathname), currentLang, targetLang)
}

export function getDefaultAlternatePath(
  pathname: string,
  currentLang: Language,
  supportedLangs: Language[],
): string | undefined {
  if (!supportedLangs.includes(defaultLocale)) {
    return undefined
  }

  return getAlternatePath(pathname, currentLang, defaultLocale)
}

export function getSiteRootPath(): string {
  return base || '/'
}

/** Escape `<` so author-controlled titles cannot terminate the script tag. */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}
