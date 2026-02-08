import { base, moreLocales } from '@/config'
import { getLangFromPath } from '@/i18n/lang'
import { getLocalizedPath } from '@/i18n/path'

function stripHtmlExtension(path: string): string {
  return path.endsWith('.html') ? path.slice(0, -'.html'.length) : path
}

// Determine if the path matches a specific page type
function matchPageType(path: string, prefix: string = '') {
  // Remove base path if configured
  const pathWithoutBase = base && path.startsWith(base)
    ? path.slice(base.length)
    : path

  // Remove leading and trailing slashes from the path
  const normalizedPath = stripHtmlExtension(pathWithoutBase.replace(/^\/|\/$/g, ''))

  // Homepage check: matches root path ('') or language code ('en')
  if (prefix === '') {
    if (normalizedPath === '') {
      return true
    }

    const locales = moreLocales as readonly string[]
    if (locales.includes(normalizedPath)) {
      return true
    }

    // Pagination pages: /2, /3 ... and /en/2, /ja/3 ...
    if (/^\d+$/.test(normalizedPath)) {
      return true
    }

    return locales.some((lang) => {
      if (!normalizedPath.startsWith(`${lang}/`)) {
        return false
      }
      const rest = normalizedPath.slice(lang.length + 1)
      return /^\d+$/.test(rest)
    })
  }

  // Ensure strict segment boundary matching to prevent partial matches
  const startsWithSegment = (target: string, segment: string) =>
    target === segment || target.startsWith(`${segment}/`)

  // Match both default language paths and localized paths
  return startsWithSegment(normalizedPath, prefix)
    || moreLocales.some(lang => startsWithSegment(normalizedPath, `${lang}/${prefix}`))
}

export function isHomePage(path: string) {
  return matchPageType(path)
}

export function isPostPage(path: string) {
  return matchPageType(path, 'posts')
}

export function isNotePage(path: string) {
  return matchPageType(path, 'notes')
}

export function isJournalPage(path: string) {
  return matchPageType(path, 'journals')
}

export function isTagPage(path: string) {
  return matchPageType(path, 'tags')
}

export function isAboutPage(path: string) {
  return matchPageType(path, 'about')
}

// Returns page context with language, page types and localization helper
export function getPageInfo(path: string) {
  const currentLang = getLangFromPath(path)
  const isHome = isHomePage(path)
  const isPost = isPostPage(path)
  const isNote = isNotePage(path)
  const isJournal = isJournalPage(path)
  const isTag = isTagPage(path)
  const isAbout = isAboutPage(path)

  return {
    currentLang,
    isHome,
    isPost,
    isNote,
    isJournal,
    isTag,
    isAbout,
    getLocalizedPath: (targetPath: string) =>
      getLocalizedPath(targetPath, currentLang),
  }
}
