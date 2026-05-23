import type { ThemeConfig } from '@/types'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import yaml from 'yaml'
import { ThemeConfigSchema } from './config-schema'

/**
 * Theme configuration entry point.
 *
 * Two modes:
 *
 * 1. **Theme dev mode** (this file is read directly via `@/config`).
 *    Happens when developing retypeset-odyssey itself or when no consumer
 *    project is in play. We synchronously load `default-config.yaml` from the
 *    package root, validate it, and export `themeConfig`.
 *
 * 2. **Consumer mode** (this file is replaced by `virtual:retypeset/config`).
 *    The integration installs a Vite alias that re-routes `@/config` to a
 *    virtual module whose contents are computed from the consumer's
 *    `retypeset.config.yaml` deep-merged on top of the same defaults. The
 *    code in this file is therefore never executed in consumer builds.
 *
 * Either way, the public exports of this module — `themeConfig`, `base`,
 * `defaultLocale`, `moreLocales`, `allLocales`, and pagination constants —
 * stay identical, so the 200+ `from '@/config'` import sites do not change.
 */

const defaultYamlPath = fileURLToPath(new URL('../default-config.yaml', import.meta.url))
const rawDefaults = yaml.parse(readFileSync(defaultYamlPath, 'utf-8'))

export const themeConfig: ThemeConfig = ThemeConfigSchema.parse(rawDefaults) as ThemeConfig

export const base = themeConfig.site.base === '/' ? '' : themeConfig.site.base.replace(/\/$/, '')
export const defaultLocale = themeConfig.global.locale
export const moreLocales = themeConfig.global.moreLocales
export const allLocales = [defaultLocale, ...moreLocales]

// Pagination
// Used by posts/notes/journals list pages.
export const POSTS_PER_PAGE = 7
export const NOTES_PER_PAGE = 7
export const JOURNALS_PER_PAGE = 7
