import type { ThemeConfig } from '@/types'
import { ThemeConfigSchema } from './config-schema'

/**
 * Theme configuration entry point.
 *
 * Two modes:
 *
 * 1. **Theme dev mode** (this file is read directly via `@/config`).
 *    Happens when developing retypeset-odyssey itself or when no consumer
 *    project is in play. The inline `defaults` object below acts as the
 *    fallback configuration.
 *
 * 2. **Consumer mode** (this file is replaced by `virtual:retypeset/config`).
 *    The integration installs a Vite `resolveId` hook that re-routes `@/config`
 *    to a virtual module whose contents are computed from the consumer's
 *    `retypeset.config.yaml` deep-merged on top of `default-config.yaml`. The
 *    inline defaults below are therefore never read in consumer builds.
 *
 * Why inline TS defaults instead of `readFileSync('default-config.yaml')`?
 * Vite 7 / Astro 6 bundles this file into the prerender chunk; any runtime
 * filesystem lookup relative to `import.meta.url` resolves to a path inside
 * `dist/.prerender/` which doesn't exist, and the build crashes. Inlining
 * defaults as TS keeps this module side-effect-free and safe to bundle.
 *
 * **Keep in sync with `default-config.yaml` at the package root.** The YAML
 * file remains the authoritative source for the integration's runtime
 * merge logic; this object only kicks in when the virtual module is not
 * installed (i.e. theme-dev mode). If the two ever drift, the integration
 * (consumer mode) is the truth.
 */

const defaults = {
  site: {
    title: 'Life Odyssey',
    subtitle: '',
    description: 'A personal blog about life, technology, and reflections.',
    i18nTitle: true,
    author: 'Zhenjia',
    url: 'https://zhenjia.dev',
    base: '/',
    favicon: '/icons/favicon.svg',
  },
  color: {
    mode: 'light' as const,
    light: {
      primary: 'oklch(25% 0.005 298)',
      secondary: 'oklch(40% 0.005 298)',
      background: 'oklch(96% 0.005 298)',
      highlight: 'oklch(0.93 0.195089 103.2532 / 0.5)',
    },
    dark: {
      primary: 'oklch(92% 0.005 298)',
      secondary: 'oklch(77% 0.005 298)',
      background: 'oklch(22% 0.005 298)',
      highlight: 'oklch(0.93 0.195089 103.2532 / 0.2)',
    },
  },
  global: {
    locale: 'zh',
    moreLocales: ['en', 'ja'],
    fontStyle: 'sans' as const,
    dateFormat: 'YYYY-MM-DD' as const,
    toc: true,
    katex: true,
    reduceMotion: false,
  },
  comment: {
    enabled: false,
    giscus: {
      repo: '',
      repoId: '',
      category: '',
      categoryId: '',
      mapping: 'pathname' as const,
      strict: '0' as const,
      reactionsEnabled: '1' as const,
      emitMetadata: '0' as const,
      inputPosition: 'bottom' as const,
    },
    twikoo: { envId: '' },
    waline: {
      serverURL: 'https://retypeset-comment.radishzz.cc',
      emoji: ['https://unpkg.com/@waline/emojis@1.2.0/tw-emoji'],
      search: false,
      imageUploader: false,
    },
  },
  seo: {
    twitterID: '',
    verification: { google: '', bing: '', yandex: '', baidu: '' },
    googleAnalyticsID: '',
    umamiAnalyticsID: '',
    cloudflareAnalyticsToken: 'b73119196a9f488289a1214cc86f0df8',
    follow: { feedID: '', userID: '' },
    apiflashKey: '',
  },
  footer: {
    links: [
      { name: 'RSS', url: '/atom.xml' },
      { name: 'GitHub', url: 'https://github.com/lifeodyssey' },
    ],
    startYear: 2016,
  },
  collections: {
    posts: { enabled: true },
    notes: { enabled: true },
    journals: { enabled: true },
  },
  preload: {
    imageHostURL: '',
    customGoogleAnalyticsJS: '',
    customUmamiAnalyticsJS: '',
  },
}

export const themeConfig: ThemeConfig = ThemeConfigSchema.parse(defaults) as ThemeConfig

export const base = themeConfig.site.base === '/' ? '' : themeConfig.site.base.replace(/\/$/, '')
export const defaultLocale = themeConfig.global.locale
export const moreLocales = themeConfig.global.moreLocales
export const allLocales = [defaultLocale, ...moreLocales]

// Pagination
// Used by posts/notes/journals list pages.
export const POSTS_PER_PAGE = 7
export const NOTES_PER_PAGE = 7
export const JOURNALS_PER_PAGE = 7
