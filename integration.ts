import type { AstroIntegration } from 'astro'
import mdx from '@astrojs/mdx'
import partytown from '@astrojs/partytown'
import sitemap from '@astrojs/sitemap'
import Compress from 'astro-compress'
import pagefind from 'astro-pagefind'
import { existsSync, readFileSync } from 'node:fs'
import { isAbsolute, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'
import rehypeKatex from 'rehype-katex'
import rehypeMermaid from 'rehype-mermaid'
import rehypeSlug from 'rehype-slug'
import remarkDirective from 'remark-directive'
import remarkMath from 'remark-math'
import UnoCSS from 'unocss/astro'
import yaml from 'yaml'
import { discoverCollections } from './discover-collections'
import { ThemeConfigSchema } from './src/config-schema'
import { langMap } from './src/i18n/config'
import { rehypeCodeCopyButton } from './src/plugins/rehype-code-copy-button.mjs'
import { rehypeExternalLinks } from './src/plugins/rehype-external-links.mjs'
import { rehypeHeadingAnchor } from './src/plugins/rehype-heading-anchor.mjs'
import { rehypeImageProcessor } from './src/plugins/rehype-image-processor.mjs'
import { remarkContainerDirectives } from './src/plugins/remark-container-directives.mjs'
import { remarkLeafDirectives } from './src/plugins/remark-leaf-directives.mjs'
import { remarkReadingTime } from './src/plugins/remark-reading-time.mjs'

interface RetypesetOptions {
  /**
   * Path to a user `retypeset.config.yaml`.
   *
   * - Absolute path: used as-is.
   * - Relative path: resolved against the consumer project root.
   * - Omitted: looks for `retypeset.config.yaml` at the project root.
   */
  config?: string
}

/**
 * Minimal deep-merge for plain objects + arrays.
 *
 * Arrays are replaced wholesale (so a consumer overriding `footer.links`
 * gets exactly what they wrote, not the defaults concatenated with their
 * additions). Objects are merged key by key. Anything else is replaced.
 */
function deepMerge<T>(base: T, override: unknown): T {
  if (override === undefined || override === null)
    return base
  if (
    typeof base !== 'object'
    || base === null
    || Array.isArray(base)
    || typeof override !== 'object'
    || Array.isArray(override)
  ) {
    return override as T
  }
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) }
  for (const [key, value] of Object.entries(override as Record<string, unknown>)) {
    out[key] = deepMerge((base as Record<string, unknown>)[key], value)
  }
  return out as T
}

/**
 * Retypeset Odyssey theme integration.
 *
 * Responsibilities:
 *
 * 1. Read `default-config.yaml` (shipped with the package) and optionally a
 *    consumer `retypeset.config.yaml` from the project root; deep-merge and
 *    Zod-validate them.
 * 2. Expose the merged config via a Vite virtual module
 *    (`virtual:retypeset/config`) and re-route `@/config` imports to it, so
 *    every theme file that does `import ... from '@/config'` automatically
 *    sees consumer overrides without any code change.
 * 3. Drive the Astro top-level config from the same YAML — `site`,
 *    `build.format`, `trailingSlash`, `prefetch`, `i18n`, and `image.domains`
 *    are all set from the validated config so the consumer's
 *    `astro.config.ts` can shrink to `integrations: [retypeset()]`.
 * 4. Register UnoCSS, MDX, partytown, sitemap, pagefind, compress, and the
 *    markdown plugin pipeline, so consumers do not import any of those.
 * 5. Inject all theme pages/routes.
 *
 * Usage in consumer's astro.config.ts:
 *   import retypeset from 'retypeset-odyssey/integration'
 *   export default defineConfig({ integrations: [retypeset()] })
 */
export default function retypesetTheme(options: RetypesetOptions = {}): AstroIntegration {
  return {
    name: 'retypeset-odyssey',
    hooks: {
      'astro:config:setup': ({ injectRoute, updateConfig, config }) => {
        // Resolve paths relative to this package.
        const themeUrl = (path: string) => new URL(path, import.meta.url)
        const themePath = (path: string) => fileURLToPath(themeUrl(path))

        // --- 1. Load + validate configuration ---

        const defaultYamlPath = themePath('./default-config.yaml')
        const defaultConfig = yaml.parse(readFileSync(defaultYamlPath, 'utf-8'))

        // Rail-quote poems live in a separate YAML so the content pool can
        // grow large (and be script-managed) without bloating default-config.
        // Optional — if the file is missing the theme just renders without
        // a rail-quote.
        const defaultPoemsPath = themePath('./default-poems.yaml')
        const defaultPoems = existsSync(defaultPoemsPath)
          ? (yaml.parse(readFileSync(defaultPoemsPath, 'utf-8')) ?? {})
          : {}

        const projectRoot = fileURLToPath(config.root)
        let userConfigPath: string | null = null
        if (options.config) {
          userConfigPath = isAbsolute(options.config)
            ? options.config
            : resolvePath(projectRoot, options.config)
        }
        else {
          const candidate = resolvePath(projectRoot, 'retypeset.config.yaml')
          if (existsSync(candidate))
            userConfigPath = candidate
        }

        let userConfig: unknown = {}
        if (userConfigPath && existsSync(userConfigPath)) {
          userConfig = yaml.parse(readFileSync(userConfigPath, 'utf-8')) ?? {}
        }

        // Merge order: defaultConfig <- defaultPoems <- userConfig.
        // The user's retypeset.config.yaml has the last word; they can
        // add or replace poem entries via the same `poems:` key.
        const mergedDefaults = deepMerge(defaultConfig, defaultPoems)
        const merged = deepMerge(mergedDefaults, userConfig)
        const validated = ThemeConfigSchema.parse(merged)

        const base = validated.site.base === '/' ? '' : validated.site.base.replace(/\/$/, '')
        const defaultLocale = validated.global.locale
        const moreLocales = validated.global.moreLocales
        const allLocales = [defaultLocale, ...moreLocales]

        // --- 2. Build the virtual module body ---
        //
        // Mirrors the public surface of src/config.ts exactly so any file
        // importing from '@/config' keeps working.
        const configJson = JSON.stringify(validated)
        const allLocalesJson = JSON.stringify(allLocales)
        const moreLocalesJson = JSON.stringify(moreLocales)
        const virtualConfigCode = `// Auto-generated by retypeset-odyssey integration. Do not edit.
export const themeConfig = ${configJson}
export const base = ${JSON.stringify(base)}
export const defaultLocale = ${JSON.stringify(defaultLocale)}
export const moreLocales = ${moreLocalesJson}
export const allLocales = ${allLocalesJson}
export const POSTS_PER_PAGE = 7
export const NOTES_PER_PAGE = 7
export const JOURNALS_PER_PAGE = 7
`

        const VIRTUAL_ID = 'virtual:retypeset/config'
        const RESOLVED_VIRTUAL_ID = `\0${VIRTUAL_ID}`

        // --- Collection discovery ---
        //
        // Decide which built-in collection routes to inject and which dynamic
        // folders need their own list+detail routes. Built-ins default to
        // enabled; consumers turn them off with
        // `collections.<name>.enabled: false` in retypeset.config.yaml.
        const { enabledBuiltIns, dynamicFolders, skippedFolders } = discoverCollections(
          projectRoot,
          userConfigPath ?? undefined,
        )
        const builtInEnabled = (name: 'posts' | 'notes' | 'journals') =>
          enabledBuiltIns.includes(name)

        if (skippedFolders.length > 0) {
          // eslint-disable-next-line no-console
          console.warn(
            `[retypeset-odyssey] Skipped content folders with unsupported names: ${skippedFolders.join(', ')}. `
            + `Folder names must match /^[a-zA-Z0-9][a-zA-Z0-9-]*$/ and must not be \`about\`.`,
          )
        }

        // Expose the dynamic-collection list to template files via a virtual
        // module so `getStaticPaths` knows which folders to enumerate.
        const DYNAMIC_VIRTUAL_ID = 'virtual:retypeset/dynamic-collections'
        const RESOLVED_DYNAMIC_VIRTUAL_ID = `\0${DYNAMIC_VIRTUAL_ID}`
        const dynamicCollectionsCode = `// Auto-generated by retypeset-odyssey integration. Do not edit.
export const dynamicCollections = ${JSON.stringify(dynamicFolders)}
`

        // --- 3. Inject all theme pages ---

        // 404
        injectRoute({ pattern: '/404', entrypoint: themeUrl('./src/pages/404.astro'), prerender: true })

        // Homepage / paginated index
        injectRoute({ pattern: '/[...lang]/[...page]', entrypoint: themeUrl('./src/pages/[...lang]/[...page].astro'), prerender: true })

        // About
        injectRoute({ pattern: '/[...lang]/about', entrypoint: themeUrl('./src/pages/[...lang]/about.astro'), prerender: true })

        // Feeds
        injectRoute({ pattern: '/[...lang]/atom.xml', entrypoint: themeUrl('./src/pages/[...lang]/atom.xml.ts'), prerender: true })
        injectRoute({ pattern: '/[...lang]/rss.xml', entrypoint: themeUrl('./src/pages/[...lang]/rss.xml.ts'), prerender: true })

        // Categories
        injectRoute({ pattern: '/[...lang]/categories', entrypoint: themeUrl('./src/pages/[...lang]/categories/index.astro'), prerender: true })
        injectRoute({ pattern: '/[...lang]/categories/[cat]', entrypoint: themeUrl('./src/pages/[...lang]/categories/[cat].astro'), prerender: true })

        // Posts (always injected; disabling `posts` only suppresses the navbar
        // entry — the homepage and tag pages still depend on the collection).
        if (builtInEnabled('posts')) {
          injectRoute({ pattern: '/[...lang]/posts/[slug]', entrypoint: themeUrl('./src/pages/[...lang]/posts/[slug].astro'), prerender: true })
        }

        // Notes
        if (builtInEnabled('notes')) {
          injectRoute({ pattern: '/[...lang]/notes/[slug]', entrypoint: themeUrl('./src/pages/[...lang]/notes/[slug].astro'), prerender: true })
          injectRoute({ pattern: '/[...lang]/notes', entrypoint: themeUrl('./src/pages/[...lang]/notes/index.astro'), prerender: true })
          injectRoute({ pattern: '/[...lang]/notes/page/[page]', entrypoint: themeUrl('./src/pages/[...lang]/notes/page/[page].astro'), prerender: true })
        }

        // Journals
        if (builtInEnabled('journals')) {
          injectRoute({ pattern: '/[...lang]/journals/[slug]', entrypoint: themeUrl('./src/pages/[...lang]/journals/[slug].astro'), prerender: true })
          injectRoute({ pattern: '/[...lang]/journals', entrypoint: themeUrl('./src/pages/[...lang]/journals/index.astro'), prerender: true })
          injectRoute({ pattern: '/[...lang]/journals/page/[page]', entrypoint: themeUrl('./src/pages/[...lang]/journals/page/[page].astro'), prerender: true })
        }

        // Search
        injectRoute({ pattern: '/[...lang]/search', entrypoint: themeUrl('./src/pages/[...lang]/search.astro'), prerender: true })

        // Timeline: mixed chronological feed of posts + notes + journals,
        // grouped by year. Lives at `/timeline` (and `/{lang}/timeline`).
        injectRoute({ pattern: '/[...lang]/timeline', entrypoint: themeUrl('./src/pages/[...lang]/timeline.astro'), prerender: true })

        // Tags
        injectRoute({ pattern: '/[...lang]/tags', entrypoint: themeUrl('./src/pages/[...lang]/tags/index.astro'), prerender: true })
        injectRoute({ pattern: '/[...lang]/tags/[tag]', entrypoint: themeUrl('./src/pages/[...lang]/tags/[tag].astro'), prerender: true })

        // OG images
        injectRoute({ pattern: '/og/[...image]', entrypoint: themeUrl('./src/pages/og/[...image].ts'), prerender: true })

        // robots.txt
        injectRoute({ pattern: '/robots.txt', entrypoint: themeUrl('./src/pages/robots.txt.ts'), prerender: true })

        // Dynamic folder routes. A single list pattern + single detail
        // pattern cover all discovered folders; `getStaticPaths` in the
        // template files only emits URLs for known folders, so Astro will
        // not try to serve `/foo` unless `content/foo/` exists.
        //
        // Literal-segment routes (`/posts`, `/notes`, `/about`, `/tags`,
        // etc.) take priority over single dynamic segments in Astro's
        // router, so the built-ins are unaffected.
        if (dynamicFolders.length > 0) {
          injectRoute({
            pattern: '/[...lang]/[collection]',
            entrypoint: themeUrl('./src/pages/_dynamic/list.astro'),
            prerender: true,
          })
          injectRoute({
            pattern: '/[...lang]/[collection]/[slug]',
            entrypoint: themeUrl('./src/pages/_dynamic/slug.astro'),
            prerender: true,
          })
        }

        // --- 4. Compute optional image config ---
        // Only set `image.domains` when the user provides a host.
        const { imageHostURL } = validated.preload ?? {}
        const imageConfig = imageHostURL
          ? {
              image: {
                domains: [imageHostURL],
                remotePatterns: [{ protocol: 'https' as const }],
              },
            }
          : {}

        // --- 5. Push everything onto the Astro config ---
        // Note: theme-internal `base` is `''` for `site.base: '/'` so string
        // concat in `@/config` consumers and the font URL transform stays
        // correct. Astro itself, though, must receive a truthy `'/'` here —
        // `createAssetLink` treats a falsy `base` as "no base", skips the
        // leading-slash prepend, and emits `href="_astro/Layout.css"` for
        // auto-injected component CSS. With `build.format: 'file'` that
        // resolves page-relative and 404s on every nested route.
        updateConfig({
          site: validated.site.url,
          base: base || '/',
          build: {
            format: 'file', // Generates /posts/xxx.html instead of /posts/xxx/index.html
          },
          trailingSlash: 'never', // Required for build.format: 'file'
          prefetch: {
            prefetchAll: true,
            defaultStrategy: 'viewport',
          },
          ...imageConfig,
          i18n: {
            locales: allLocales.map(lang => ({
              path: lang,
              codes: [...langMap[lang]] as [string, ...string[]],
            })),
            defaultLocale,
            // Provide an explicit routing object so mergeConfig does not leave
            // it undefined (Astro's downstream code reads `routing.redirectToDefaultLocale`).
            routing: {
              prefixDefaultLocale: false,
              redirectToDefaultLocale: false,
              fallbackType: 'redirect',
            },
          },
          integrations: [
            UnoCSS({
              configFile: themePath('./uno.config.ts'),
              injectReset: true,
            }),
            mdx(),
            partytown({
              config: {
                forward: ['dataLayer.push', 'gtag'],
              },
            }),
            sitemap(),
            pagefind(),
            Compress({
              CSS: true,
              HTML: true,
              Image: false,
              JavaScript: true,
              SVG: false,
            }),
          ],
          markdown: {
            remarkPlugins: [
              remarkDirective,
              remarkMath,
              remarkContainerDirectives,
              remarkLeafDirectives,
              remarkReadingTime,
            ],
            rehypePlugins: [
              rehypeKatex,
              [rehypeMermaid, { strategy: 'pre-mermaid' }],
              rehypeSlug,
              rehypeHeadingAnchor,
              rehypeImageProcessor,
              rehypeExternalLinks,
              rehypeCodeCopyButton,
            ],
            syntaxHighlight: {
              type: 'shiki',
              excludeLangs: ['mermaid'],
            },
            shikiConfig: {
              themes: {
                light: 'github-light',
                dark: 'github-dark',
              },
            },
          },
          // Astro internally calls fileURLToPath() on publicDir, so it must
          // be a URL object.
          publicDir: themeUrl('./public/') as any,
          vite: {
            plugins: [
              {
                // Vite 7 (Astro 6) is stricter about resolve.alias replacements:
                // pointing an alias at a virtual module specifier (which then
                // gets resolved by a separate plugin) is no longer reliable
                // across all build environments (the content-collections /
                // prerender bundle does not pick it up). Intercept the
                // `@/config` import directly in `resolveId` so the virtual
                // module always wins, regardless of alias evaluation order.
                name: 'retypeset-config-loader',
                enforce: 'pre',
                resolveId(id) {
                  if (id === '@/config' || id === '@/config.ts' || id === VIRTUAL_ID)
                    return RESOLVED_VIRTUAL_ID
                  if (id === DYNAMIC_VIRTUAL_ID)
                    return RESOLVED_DYNAMIC_VIRTUAL_ID
                  return null
                },
                load(id) {
                  if (id === RESOLVED_VIRTUAL_ID)
                    return virtualConfigCode
                  if (id === RESOLVED_DYNAMIC_VIRTUAL_ID)
                    return dynamicCollectionsCode
                  // Astro 6 / Vite 7's built-in alias plugin (also
                  // `enforce: 'pre'`) rewrites `@/config` to the absolute
                  // path of the standalone fallback before our resolveId
                  // sees the unresolved specifier. Intercept the load by
                  // file path too so the consumer-merged config always wins
                  // over the inline TS defaults in src/config.ts.
                  const configFile = themePath('./src/config.ts')
                  if (id === configFile || id.startsWith(`${configFile}?`))
                    return virtualConfigCode
                  return null
                },
              },
              {
                name: 'retypeset-prefix-font-urls-with-base',
                transform(code, id) {
                  if (!id.endsWith('src/styles/font.css'))
                    return null
                  return code.replace(/url\("\/fonts\//g, `url("${base}/fonts/`)
                },
              },
            ],
            resolve: {
              // Generic `@/*` alias for all other source paths. `@/config` is
              // handled by the plugin above (which runs in the `pre` phase,
              // before alias resolution).
              alias: [
                {
                  find: /^@\/(.*)/,
                  replacement: `${themePath('./src/')}$1`,
                },
              ],
            },
          },
        })
      },
    },
  }
}
