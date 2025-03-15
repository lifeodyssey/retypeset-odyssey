import type { APIContext } from 'astro'
import { moreLocales } from '@/config'
import { generateRSS } from '@/utils/rss'

// Generate static paths for all supported languages
export function getStaticPaths() {
  return moreLocales.map(lang => ({
    params: { lang },
  }))
}

export async function GET({ params }: APIContext) {
  const lang = params.lang as typeof moreLocales[number]

  // Return 404 if language is not supported
  if (!moreLocales.includes(lang)) {
    return new Response(null, {
      status: 404,
      statusText: 'Not found',
    })
  }

  return generateRSS({ lang })
}
