import { z } from 'zod'

/**
 * Theme configuration schema.
 *
 * Mirrors the structure of `default-config.yaml`. Both the default YAML and
 * any user-provided `retypeset.config.yaml` are deep-merged and validated
 * against this schema before being exposed to the theme via the
 * `virtual:retypeset/config` module.
 *
 * Optional groups (`comment`, `seo`, `preload`) default to empty objects so
 * downstream code can safely read nested fields with `?.`.
 */

const LanguageCode = z.enum([
  'de',
  'en',
  'es',
  'fr',
  'ja',
  'ko',
  'pl',
  'pt',
  'ru',
  'zh',
  'zh-tw',
])

export const ThemeConfigSchema = z.object({
  site: z.object({
    title: z.string(),
    subtitle: z.string().optional().default(''),
    description: z.string().optional().default(''),
    i18nTitle: z.boolean().default(true),
    author: z.string(),
    url: z.string().url(),
    base: z.string().default('/'),
    favicon: z.string().default('/icons/favicon.svg'),
  }),
  color: z.object({
    mode: z.enum(['light', 'dark', 'auto']).default('light'),
    light: z.object({
      primary: z.string(),
      secondary: z.string(),
      background: z.string(),
      highlight: z.string(),
    }),
    dark: z.object({
      primary: z.string(),
      secondary: z.string(),
      background: z.string(),
      highlight: z.string(),
    }),
  }),
  global: z.object({
    locale: LanguageCode,
    moreLocales: z.array(LanguageCode).default([]),
    fontStyle: z.enum(['sans', 'serif']).default('sans'),
    dateFormat: z
      .enum(['YYYY-MM-DD', 'MM-DD-YYYY', 'DD-MM-YYYY', 'MMM D YYYY', 'D MMM YYYY'])
      .default('YYYY-MM-DD'),
    toc: z.boolean().default(true),
    katex: z.boolean().default(true),
    reduceMotion: z.boolean().default(false),
  }),
  comment: z
    .object({
      enabled: z.boolean().default(false),
      giscus: z
        .object({
          repo: z.string().optional().default(''),
          repoId: z.string().optional().default(''),
          category: z.string().optional().default(''),
          categoryId: z.string().optional().default(''),
          mapping: z
            .enum(['pathname', 'url', 'title', 'og:title'])
            .optional()
            .default('pathname'),
          strict: z.enum(['0', '1']).optional().default('0'),
          reactionsEnabled: z.enum(['0', '1']).optional().default('1'),
          emitMetadata: z.enum(['0', '1']).optional().default('0'),
          inputPosition: z.enum(['top', 'bottom']).optional().default('bottom'),
        })
        .optional()
        .default({}),
      twikoo: z
        .object({
          envId: z.string().optional().default(''),
        })
        .optional()
        .default({}),
      waline: z
        .object({
          serverURL: z.string().optional().default(''),
          emoji: z.array(z.string()).optional().default([]),
          search: z.boolean().optional().default(false),
          imageUploader: z.boolean().optional().default(false),
        })
        .optional()
        .default({}),
    })
    .optional()
    .default({}),
  seo: z
    .object({
      twitterID: z.string().optional().default(''),
      verification: z
        .object({
          google: z.string().optional().default(''),
          bing: z.string().optional().default(''),
          yandex: z.string().optional().default(''),
          baidu: z.string().optional().default(''),
        })
        .optional()
        .default({}),
      googleAnalyticsID: z.string().optional().default(''),
      umamiAnalyticsID: z.string().optional().default(''),
      follow: z
        .object({
          feedID: z.string().optional().default(''),
          userID: z.string().optional().default(''),
        })
        .optional()
        .default({}),
      apiflashKey: z.string().optional().default(''),
    })
    .optional()
    .default({}),
  footer: z.object({
    links: z
      .array(
        z.object({
          name: z.string(),
          url: z.string(),
        }),
      )
      .default([]),
    startYear: z.number().int(),
  }),
  preload: z
    .object({
      imageHostURL: z.string().optional().default(''),
      customGoogleAnalyticsJS: z.string().optional().default(''),
      customUmamiAnalyticsJS: z.string().optional().default(''),
    })
    .optional()
    .default({}),
  // Collection toggles. Keys are collection names (built-in or auto-discovered
  // folders under `content/`); values control whether the collection is built
  // and routed. Folders not listed here default to `enabled: true`.
  collections: z
    .record(
      z.string(),
      z
        .object({
          enabled: z.boolean().optional().default(true),
        })
        .passthrough(),
    )
    .optional()
    .default({}),
})

export type ThemeConfig = z.infer<typeof ThemeConfigSchema>
