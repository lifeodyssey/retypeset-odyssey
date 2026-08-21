/**
 * Sitemap inclusion rules for @astrojs/sitemap.
 *
 * Keep content URLs (posts, notes, journals, about, collection indexes,
 * home, timeline). Drop search, pagination, and tag/category taxonomies —
 * those are crawlable via internal links but waste sitemap budget.
 */
export function shouldIncludeInSitemap(page: string, moreLocales: readonly string[]): boolean {
  let path: string
  try {
    path = new URL(page).pathname
  }
  catch {
    path = page
  }

  path = path.replace(/\/+$/, '') || '/'

  if (/(?:^|\/)search$/.test(path)) {
    return false
  }

  if (/\/page\/\d+$/.test(path)) {
    return false
  }

  if (/^\/\d+$/.test(path)) {
    return false
  }

  const localeAlt = moreLocales.map(escapeRegExp).join('|')
  if (localeAlt && new RegExp(`^/(?:${localeAlt})/\\d+$`).test(path)) {
    return false
  }

  if (/(?:^|\/)tags(?:\/|$)/.test(path)) {
    return false
  }

  if (/(?:^|\/)categories(?:\/|$)/.test(path)) {
    return false
  }

  // Journals are typically default-locale only; the empty /en/journals
  // and /ja/journals list pages should not be advertised.
  if (localeAlt && new RegExp(`^/(?:${localeAlt})/journals$`).test(path)) {
    return false
  }

  return true
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
