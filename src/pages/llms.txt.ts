import type { APIRoute } from 'astro'
import { themeConfig } from '@/config'
import { getPostPath, getPosts } from '@/utils/content'

// `/llms.txt` — an llmstxt.org-style index of the site's content for AI
// agents and crawlers. Lists the default-language posts with their canonical
// URLs; `/llms-full.txt` carries the same list with each post body inlined.
export const GET: APIRoute = async ({ site }) => {
  const { title, description, author } = themeConfig.site
  const posts = await getPosts()

  const lines = [
    `# ${title}`,
    '',
    description ? `> ${description}` : '',
    '',
    author ? `Author: ${author}.` : '',
    site ? `Full text for LLMs: ${new URL('llms-full.txt', site).href}` : '',
    '',
    '## Posts',
    '',
    ...posts.map((post) => {
      const href = site ? new URL(getPostPath(post).slice(1), site).href : getPostPath(post)
      const desc = post.data.description?.trim()
      return `- [${post.data.title}](${href})${desc ? `: ${desc}` : ''}`
    }),
    '',
  ].filter(line => line !== undefined)

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
