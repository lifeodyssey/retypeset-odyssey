import type { AstroIntegration } from 'astro'
import { fileURLToPath } from 'node:url'

/**
 * Retypeset Odyssey theme integration.
 *
 * Injects all theme pages/routes so the theme can be consumed
 * as a dependency from a separate content repository.
 *
 * Usage in consumer's astro.config.ts:
 *   import retypeset from 'retypeset-odyssey/integration'
 *   export default defineConfig({ integrations: [retypeset()] })
 */
export default function retypesetTheme(): AstroIntegration {
  return {
    name: 'retypeset-odyssey',
    hooks: {
      'astro:config:setup': ({ injectRoute, updateConfig }) => {
        // Resolve paths relative to this package
        const resolve = (path: string) => new URL(path, import.meta.url)

        // --- Inject all theme pages ---

        // 404
        injectRoute({ pattern: '/404', entrypoint: resolve('./src/pages/404.astro'), prerender: true })

        // Homepage / paginated index
        injectRoute({ pattern: '/[...lang]/[...page]', entrypoint: resolve('./src/pages/[...lang]/[...page].astro'), prerender: true })

        // About
        injectRoute({ pattern: '/[...lang]/about', entrypoint: resolve('./src/pages/[...lang]/about.astro'), prerender: true })

        // Feeds
        injectRoute({ pattern: '/[...lang]/atom.xml', entrypoint: resolve('./src/pages/[...lang]/atom.xml.ts'), prerender: true })
        injectRoute({ pattern: '/[...lang]/rss.xml', entrypoint: resolve('./src/pages/[...lang]/rss.xml.ts'), prerender: true })

        // Categories
        injectRoute({ pattern: '/[...lang]/categories', entrypoint: resolve('./src/pages/[...lang]/categories/index.astro'), prerender: true })

        // Posts
        injectRoute({ pattern: '/[...lang]/posts/[slug]', entrypoint: resolve('./src/pages/[...lang]/posts/[slug].astro'), prerender: true })

        // Notes
        injectRoute({ pattern: '/[...lang]/notes/[slug]', entrypoint: resolve('./src/pages/[...lang]/notes/[slug].astro'), prerender: true })
        injectRoute({ pattern: '/[...lang]/notes', entrypoint: resolve('./src/pages/[...lang]/notes/index.astro'), prerender: true })
        injectRoute({ pattern: '/[...lang]/notes/page/[page]', entrypoint: resolve('./src/pages/[...lang]/notes/page/[page].astro'), prerender: true })

        // Journals
        injectRoute({ pattern: '/[...lang]/journals/[slug]', entrypoint: resolve('./src/pages/[...lang]/journals/[slug].astro'), prerender: true })
        injectRoute({ pattern: '/[...lang]/journals', entrypoint: resolve('./src/pages/[...lang]/journals/index.astro'), prerender: true })
        injectRoute({ pattern: '/[...lang]/journals/page/[page]', entrypoint: resolve('./src/pages/[...lang]/journals/page/[page].astro'), prerender: true })

        // Search
        injectRoute({ pattern: '/[...lang]/search', entrypoint: resolve('./src/pages/[...lang]/search.astro'), prerender: true })

        // Tags
        injectRoute({ pattern: '/[...lang]/tags', entrypoint: resolve('./src/pages/[...lang]/tags/index.astro'), prerender: true })
        injectRoute({ pattern: '/[...lang]/tags/[tag]', entrypoint: resolve('./src/pages/[...lang]/tags/[tag].astro'), prerender: true })

        // OG images
        injectRoute({ pattern: '/og/[...image]', entrypoint: resolve('./src/pages/og/[...image].ts'), prerender: true })

        // robots.txt
        injectRoute({ pattern: '/robots.txt', entrypoint: resolve('./src/pages/robots.txt.ts'), prerender: true })

        // --- Make @/ alias resolve to theme's src/ ---
        // --- Point publicDir to theme's public/ so static assets (fonts, icons, etc.) are bundled ---
        // Astro internally calls fileURLToPath() on publicDir, so it must be a URL object.
        updateConfig({
          publicDir: new URL('./public/', import.meta.url) as any,
          vite: {
            resolve: {
              alias: {
                '@/': fileURLToPath(new URL('./src/', import.meta.url)),
              },
            },
          },
        })
      },
    },
  }
}
