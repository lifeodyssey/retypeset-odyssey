import type { APIRoute } from 'astro'
import { themeConfig } from '@/config'
import { getLlmsPosts, publicPostUrl } from '@/utils/llms'

// `/llms-full.txt` — companion to `/llms.txt` with raw markdown inlined.
// Honors seo.llms.featured so a consumer can keep this file curated.
export const GET: APIRoute = async ({ site }) => {
  const { title, description, author } = themeConfig.site
  const posts = await getLlmsPosts()

  const head = [
    `# ${title}`,
    '',
    description ? `> ${description}` : '',
    '',
    author ? `Author: ${author}.` : '',
    '',
  ].filter(Boolean)

  const body = posts.map((post) => {
    const href = publicPostUrl(post, site)
    const published = post.data.published?.toISOString().slice(0, 10)
    const tags = post.data.tags?.length ? `Tags: ${post.data.tags.join(', ')}` : ''
    return [
      '---',
      '',
      `## ${post.data.title}`,
      '',
      `URL: ${href}`,
      published ? `Published: ${published}` : '',
      tags,
      '',
      post.body?.trim() ?? '',
      '',
    ].filter(Boolean).join('\n')
  })

  return new Response([...head, ...body].join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
