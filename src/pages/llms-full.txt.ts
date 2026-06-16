import type { APIRoute } from 'astro'
import { themeConfig } from '@/config'
import { getPostPath, getPosts } from '@/utils/content'

// `/llms-full.txt` — the full-text companion to `/llms.txt`: the same post
// list with each post's raw markdown body inlined, so an agent can read the
// whole site in one fetch instead of crawling every page.
export const GET: APIRoute = async ({ site }) => {
  const { title, description, author } = themeConfig.site
  const posts = await getPosts()

  const head = [
    `# ${title}`,
    '',
    description ? `> ${description}` : '',
    '',
    author ? `Author: ${author}.` : '',
    '',
  ].filter(Boolean)

  const body = posts.map((post) => {
    const href = site ? new URL(getPostPath(post).slice(1), site).href : getPostPath(post)
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
