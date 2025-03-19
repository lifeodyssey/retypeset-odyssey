// Astro integrations
import mdx from '@astrojs/mdx'
import partytown from '@astrojs/partytown'
import sitemap from '@astrojs/sitemap'
import compress from 'astro-compress'
import robotsTxt from 'astro-robots-txt'

// Rehype plugins (HTML processors)
import { defineConfig } from 'astro/config'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeExternalLinks from 'rehype-external-links'
import rehypeKatex from 'rehype-katex'
import rehypeSlug from 'rehype-slug'

// Remark plugins (Markdown processors)
import remarkDirective from 'remark-directive'
import remarkGithubAdmonitionsToDirectives from 'remark-github-admonitions-to-directives'
import remarkMath from 'remark-math'
import remarkSectionize from 'remark-sectionize'

// Project configuration and utilities
import UnoCSS from 'unocss/astro'
import { themeConfig } from './src/config'
import { langMap } from './src/i18n/config'
import { remarkReadingTime } from './src/plugins/remark-reading-time'

const url = themeConfig.site.url
const locale = themeConfig.global.locale
const linkPrefetch = themeConfig.preload.linkPrefetch
const imageDomain = new URL(themeConfig.preload.imageHostURL as string).hostname

export default defineConfig({
  site: url,
  base: '/',
  trailingSlash: 'always',
  prefetch: {
    prefetchAll: true,
    defaultStrategy: linkPrefetch,
  },
  image: {
    domains: [imageDomain],
    remotePatterns: [{ protocol: 'https' }],
  },
  i18n: {
    locales: Object.entries(langMap).map(([path, codes]) => ({
      path,
      codes: codes as [string, ...string[]],
    })),
    defaultLocale: locale,
  },
  integrations: [
    UnoCSS({
      injectReset: true,
    }),
    mdx(),
    partytown({
      config: {
        forward: ['dataLayer.push'],
      },
    }),
    sitemap(),
    robotsTxt(),
    compress(),
  ],
  markdown: {
    remarkPlugins: [
      remarkMath,
      remarkDirective,
      remarkGithubAdmonitionsToDirectives,
      remarkSectionize,
      remarkReadingTime,
    ],
    rehypePlugins: [
      rehypeSlug,
      rehypeKatex,
      [
        rehypeExternalLinks,
        {
          target: '_blank',
          rel: ['nofollow', 'noopener', 'noreferrer', 'external'],
          protocols: ['http', 'https', 'mailto'],
        },
      ],
      [
        rehypeAutolinkHeadings,
        {
          behavior: 'append',
          properties: {
            className: ['anchor'],
          },
          content: {
            type: 'element',
            tagName: 'span',
            properties: {
              'className': ['anchor-icon'],
              'data-pagefind-ignore': true,
            },
            // TODO: Switch # to icon
            children: [
              {
                type: 'text',
                value: '#',
              },
            ],
          },
        },
      ],
    ],
  },
  devToolbar: {
    enabled: false,
  },
})
