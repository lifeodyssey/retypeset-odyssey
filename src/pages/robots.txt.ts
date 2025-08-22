import type { APIRoute } from 'astro'
import { themeConfig } from '@/config'

const { base } = themeConfig.site
const basePath = base === '/' ? '' : base.replace(/\/$/, '')

export const GET: APIRoute = ({ site }) => {
  const sitemapURL = new URL('sitemap-index.xml', site)

  const robotsTxt = [
    'User-agent: *',
    'Allow: /',
    `Disallow: ${basePath}/_astro/`,
    `Disallow: ${basePath}/feeds/`,
    `Disallow: ${basePath}/giscus/`,
    `Disallow: ${basePath}/og/`,
    `Disallow: ${basePath}/~partytown/`,
    '',
    `Sitemap: ${sitemapURL.href}`,
  ].join('\n')

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}
