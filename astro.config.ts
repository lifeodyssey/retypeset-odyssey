// Astro integrations
import mdx from '@astrojs/mdx'
import partytown from '@astrojs/partytown'
import sitemap from '@astrojs/sitemap'
import { transformerCopyButton } from '@rehype-pretty/transformers'
import compress from 'astro-compress'
import robotsTxt from 'astro-robots-txt'

// Rehype plugins (HTML processors)
import { defineConfig } from 'astro/config'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeComponents from 'rehype-components'
import rehypeExternalLinks from 'rehype-external-links'
import rehypeKatex from 'rehype-katex'
import rehypePrettyCode from 'rehype-pretty-code'
import rehypeSlug from 'rehype-slug'

// Remark plugins (Markdown processors)
import remarkDirective from 'remark-directive'
import remarkGithubAdmonitionsToDirectives from 'remark-github-admonitions-to-directives'
import remarkMath from 'remark-math'
import remarkSectionize from 'remark-sectionize'

// Project configuration and utilities
import UnoCSS from 'unocss/astro'
import { themeConfig } from './src/config'
import { langMap } from './src/i18n/ui'
import { AdmonitionComponent } from './src/plugins/rehype-component-admonition'
import { GithubCardComponent } from './src/plugins/rehype-component-github-card'
import { parseDirectiveNode } from './src/plugins/remark-directive-rehype'
import { remarkExcerpt } from './src/plugins/remark-excerpt'
import { remarkReadingTime } from './src/plugins/remark-reading-time'

const url = themeConfig.site.url
const { light, dark } = themeConfig.color
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
    UnoCSS({ injectReset: true }),
    mdx(),
    partytown({
      config: {
        forward: ['dataLayer.push'],
      },
    }),
    sitemap(),
    robotsTxt({
      sitemap: true,
    }),
    compress({
      HTML: {
        'html-minifier-terser': {
          removeAttributeQuotes: false,
          removeScriptTypeAttributes: true,
          removeStyleLinkTypeAttributes: true,
          sortAttributes: true,
          sortClassName: true,
        },
      },
    }),
  ],
  markdown: {
    remarkPlugins: [
      remarkMath,
      remarkDirective,
      remarkGithubAdmonitionsToDirectives,
      parseDirectiveNode,
      remarkSectionize,
      remarkReadingTime,
      remarkExcerpt,
    ],
    rehypePlugins: [
      rehypeSlug,
      rehypeKatex,
      [
        rehypePrettyCode,
        {
          theme: {
            dark: dark.codeTheme,
            light: light.codeTheme,
          },
          transformers: [
            transformerCopyButton({
              visibility: 'hover',
              feedbackDuration: 2_500,
            }),
          ],
        },
      ],
      [
        rehypeExternalLinks,
        {
          target: '_blank',
          rel: ['nofollow', 'noopener', 'noreferrer', 'external'],
          protocols: ['http', 'https', 'mailto'],
        },
      ],
      [
        rehypeComponents,
        {
          components: {
            github: GithubCardComponent,
            note: (properties: { 'has-directive-label'?: boolean }, children: any[]) => AdmonitionComponent(properties, children, 'note'),
            tip: (properties: { 'has-directive-label'?: boolean }, children: any[]) => AdmonitionComponent(properties, children, 'tip'),
            important: (properties: { 'has-directive-label'?: boolean }, children: any[]) => AdmonitionComponent(properties, children, 'important'),
            caution: (properties: { 'has-directive-label'?: boolean }, children: any[]) => AdmonitionComponent(properties, children, 'caution'),
            warning: (properties: { 'has-directive-label'?: boolean }, children: any[]) => AdmonitionComponent(properties, children, 'warning'),
          },
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
