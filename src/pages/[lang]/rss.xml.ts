import type { APIContext } from 'astro'
import themeConfig from '@/config'
import { generateMultiLangPaths } from '@/i18n/route'
import { generateRSS } from '@/utils/rss'

const { moreLocale } = themeConfig.global

// Type for supported non-default languages
type SupportedLanguage = typeof moreLocale[number]

// Generate static paths for all supported languages
export function getStaticPaths() {
  return generateMultiLangPaths()
}

export async function GET({ params }: APIContext) {
  const lang = params.lang as SupportedLanguage

  // Return 404 if language is not supported
  if (!moreLocale.includes(lang)) {
    return new Response(null, {
      status: 404,
      statusText: 'Not found',
    })
  }

  return generateRSS({ lang })
}
