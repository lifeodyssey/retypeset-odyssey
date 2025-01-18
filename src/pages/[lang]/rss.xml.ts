import type { APIContext } from 'astro'
import type { CollectionEntry } from 'astro:content'
import themeConfig from '@/config'
import rss from '@astrojs/rss'
import { getCollection } from 'astro:content'
import MarkdownIt from 'markdown-it'
import sanitizeHtml from 'sanitize-html'

const parser = new MarkdownIt()
const { title, description, url } = themeConfig.site
const { locale: defaultLocale, moreLocale } = themeConfig.global
const followConfig = themeConfig.seo?.follow

// Extract first 100 chars from content as description
function getExcerpt(content: string): string {
  const plainText = sanitizeHtml(
    parser.render(content),
    {
      allowedTags: [],
      allowedAttributes: {},
    },
  )

  return `${plainText.slice(0, 100).trim()}...`
}

// Return 404 response for invalid language routes
function return404() {
  return new Response(null, {
    status: 404,
    statusText: 'Not found',
  })
}

// Add getStaticPaths for dynamic routes
export function getStaticPaths() {
  return moreLocale.map(lang => ({ params: { lang } }))
}

// Generate RSS feed for non-default languages
export async function GET({ params }: APIContext) {
  const lang = params.lang as string

  // Only generate RSS for valid non-default languages
  if (!moreLocale.includes(lang)) {
    return return404()
  }

  // Get posts for specific language (include universal posts)
  const posts = await getCollection(
    'posts',
    ({ data }: { data: CollectionEntry<'posts'>['data'] }) =>
      (!data.draft && (data.lang === lang || data.lang === '')),
  )

  return rss({
    title: `${title} (${lang})`,
    description,
    site: url,
    stylesheet: '/rss/styles.xsl',
    // Map posts to RSS items with language-specific URLs
    items: posts.map(post => ({
      title: post.data.title,
      pubDate: post.data.published,
      description: post.data.description || getExcerpt(post.body),
      link: `/${lang}/posts/${post.slug}/`,
      content: sanitizeHtml(
        parser.render(post.body),
        {
          allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
        },
      ),
    })),
    // Add language and follow challenge info
    customData: `
      <language>${lang}</language>
      ${followConfig?.feedID && followConfig?.userID
          ? `<follow_challenge>
          <feedId>${followConfig.feedID}</feedId>
          <userId>${followConfig.userID}</userId>
        </follow_challenge>`
          : ''
      }
    `.trim(),
  })
}
