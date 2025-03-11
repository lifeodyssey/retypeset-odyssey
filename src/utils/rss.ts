import type { CollectionEntry } from 'astro:content'
import themeConfig from '@/config'
import rss from '@astrojs/rss'
import { getCollection } from 'astro:content'
import MarkdownIt from 'markdown-it'
import sanitizeHtml from 'sanitize-html'

const parser = new MarkdownIt()
const { title, description, url } = themeConfig.site
const followConfig = themeConfig.seo?.follow

// Returns first 200 chars with proper truncation
function getExcerpt(content: string): string {
  if (!content)
    return ''

  // Convert markdown to plain text by removing all HTML tags
  const plainText = sanitizeHtml(parser.render(content), {
    allowedTags: [],
    allowedAttributes: {},
  })

  const excerpt = plainText.slice(0, 200).trim()
  return excerpt.length === 200 ? `${excerpt}...` : excerpt
}

interface GenerateRSSOptions {
  lang?: string
}

export async function generateRSS({ lang }: GenerateRSSOptions = {}) {
  // Get posts for specific language (including universal posts)
  const posts = await getCollection(
    'posts',
    ({ data }: { data: CollectionEntry<'posts'>['data'] }) =>
      (!data.draft && (data.lang === lang || data.lang === '')),
  )

  return rss({
    title: lang ? `${title} (${lang})` : title,
    description,
    site: url,
    items: posts.map((post: CollectionEntry<'posts'>) => ({
      title: post.data.title,
      pubDate: post.data.published,
      description: post.data.description || getExcerpt(post.body),
      // Generate absolute URL with optional language prefix
      link: new URL(
        `${lang ? `${lang}/` : ''}posts/${post.data.abbrlink || post.slug}/`,
        url,
      ).toString(),
      // Convert markdown content to HTML, allowing img tags
      content: post.body
        ? sanitizeHtml(parser.render(post.body), {
            allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
          })
        : '',
    })),
    // Add XML namespaces for language and follow challenge
    customData: `
      <language>${lang || themeConfig.global.locale}</language>
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
