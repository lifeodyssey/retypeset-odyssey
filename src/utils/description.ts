import type { CollectionEntry } from 'astro:content'
import MarkdownIt from 'markdown-it'
import sanitizeHtml from 'sanitize-html'

const parser = new MarkdownIt()

// Generate an excerpt from Markdown content
export function generateExcerpt(content: string, length: number = 98): string {
  if (!content)
    return ''

  // Convert Markdown to plain text
  const plainText = sanitizeHtml(parser.render(content), {
    allowedTags: [],
    allowedAttributes: {},
  })

  // Replace line breaks with spaces
  const normalizedText = plainText.replace(/\s+/g, ' ')
  const excerpt = normalizedText.slice(0, length).trim()
  // Add ellipsis if text was truncated
  const needsEllipsis = normalizedText.length > length
  return needsEllipsis ? `${excerpt}...` : excerpt
}

// Automatically generate a description for the article
export function generateDescription(post: CollectionEntry<'posts'>): string {
  // If the article already has a description, return it directly
  if (post.data.description)
    return post.data.description

  // Otherwise, generate an excerpt from the article content as the description
  return generateExcerpt(post.body)
}
