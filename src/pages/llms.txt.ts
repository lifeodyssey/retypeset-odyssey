import type { APIRoute } from 'astro'
import { themeConfig } from '@/config'
import { getPostDescription } from '@/utils/description'
import { getLlmsPosts, publicPostUrl } from '@/utils/llms'

// `/llms.txt` — llmstxt.org index. Featured slugs in seo.llms.featured
// come first; otherwise all default-locale posts, each with an excerpt.
export const GET: APIRoute = async ({ site }) => {
  const { title, description, author } = themeConfig.site
  const posts = await getLlmsPosts()
  const featured = themeConfig.seo?.llms?.featured ?? []

  const lines = [
    `# ${title}`,
    '',
    description ? `> ${description}` : '',
    '',
    author ? `Author: ${author}.` : '',
    site ? `Full text for LLMs: ${new URL('llms-full.txt', site).href}` : '',
    '',
    featured.length ? '## Featured' : '## Posts',
    '',
    ...posts.map((post) => {
      const href = publicPostUrl(post, site)
      const desc = getPostDescription(post, 'meta').replace(/\s+/g, ' ').trim()
      return `- [${post.data.title}](${href})${desc ? `: ${desc}` : ''}`
    }),
    '',
  ]

  return new Response(lines.filter(line => line !== undefined).join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
