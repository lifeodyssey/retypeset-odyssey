import type { CollectionEntry } from 'astro:content'
import type { Language } from '@/i18n/config'
import MarkdownIt from 'markdown-it'
import { defaultLocale } from '@/config'

type ExcerptScene = 'list' | 'meta' | 'og' | 'feed'

const markdownParser = new MarkdownIt()
const excerptLengths: Record<ExcerptScene, { cjk: number, other: number }> = {
  list: {
    cjk: 120,
    other: 240,
  },
  meta: {
    cjk: 120,
    other: 240,
  },
  og: {
    cjk: 70,
    other: 140,
  },
  feed: {
    cjk: 70,
    other: 140,
  },
}

const htmlEntityMap: Record<string, string> = {
  '&lt;': '<',
  '&gt;': '>',
  '&amp;': '&',
  '&quot;': '"',
  '&apos;': '\'',
  '&nbsp;': ' ',
}

// Cleans text by removing HTML tags and normalizing whitespace.
// Before stripping tags, inserts a middle-dot separator between adjacent
// list items so excerpts of pre-`<!-- more -->` lists still read as a list
// once flattened to a single paragraph. Without this, `<li>A</li><li>B</li>`
// flattens to whitespace-joined `A B` and the excerpt loses its structure.
function cleanTextContent(text: string): string {
  let cleanText = text
    // Adjacent list items → middle-dot separator
    .replace(/<\/li>\s*<li[^>]*>/gi, '</li> · <li>')
    // <br /> behaves like a space
    .replace(/<br\s*\/?>/gi, ' ')
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')

  // Decode HTML entities
  Object.entries(htmlEntityMap).forEach(([entity, char]) => {
    cleanText = cleanText.replace(new RegExp(entity, 'g'), char)
  })

  // Normalize whitespace
  cleanText = cleanText.replace(/\s+/g, ' ')

  // Normalize CJK punctuation spacing
  cleanText = cleanText.replace(/([。？！："」』])\s+/g, '$1')

  return cleanText.trim()
}

// Creates a clean text excerpt with length limits by language and scene
function getExcerpt(text: string, lang: Language, scene: ExcerptScene): string {
  const isCJK = (lang: Language) => ['zh', 'zh-tw', 'ja', 'ko'].includes(lang)
  const length = isCJK(lang)
    ? excerptLengths[scene].cjk
    : excerptLengths[scene].other

  const cleanText = cleanTextContent(text)
  const excerpt = cleanText.slice(0, length).trim()

  // Remove trailing punctuation and add ellipsis
  if (cleanText.length > length) {
    return `${excerpt.replace(/\p{P}+$/u, '')}...`
  }

  return excerpt
}

// Generates post description from existing description or content
type DescribableEntry = {
  data: {
    description?: string
    lang?: string
  }
  body?: string
}

function getEntryDescription(
  entry: DescribableEntry,
  scene: ExcerptScene,
): string {
  const lang = (entry.data.lang || defaultLocale) as Language

  if (entry.data.description) {
    // Only truncate for og scene, return full description for other scenes
    return scene === 'og'
      ? getExcerpt(entry.data.description, lang, scene)
      : entry.data.description
  }

  const rawContent = entry.body || ''

  // Check for <!-- more --> marker (Hexo-style excerpt boundary)
  const moreMarkerRegex = /<!--\s*more\s*-->/i
  const moreMatch = rawContent.match(moreMarkerRegex)
  const hasMoreMarker = moreMatch && moreMatch.index !== undefined

  // Get content to process (before <!-- more --> if exists)
  let contentToProcess = rawContent
  if (hasMoreMarker) {
    contentToProcess = rawContent.substring(0, moreMatch.index)
  }

  const cleanContent = contentToProcess
    .replace(/<!--[\s\S]*?-->/g, '') // Remove remaining HTML comments
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/^\s*#{1,6}\s+\S.*$/gm, '') // Remove Markdown headings
    .replace(/^\s*::.*$/gm, '') // Remove directive containers
    .replace(/^\s*>\s*\[!.*\]$/gm, '') // Remove GitHub admonition markers
    .replace(/\n{2,}/g, '\n\n') // Normalize newlines

  const renderedContent = markdownParser.render(cleanContent)

  // For 'list' scene with an explicit <!-- more --> marker, return the
  // *rendered HTML* (not stripped text) so blockquotes, lists, and
  // paragraphs keep their structure on the homepage post list. The
  // consumer (PostList / NoteList / JournalList) injects this via
  // `<Fragment set:html={…} />` inside a `heti` typography wrapper.
  // Other scenes (og, meta, feed) still receive plain text because they
  // feed single-line metadata / RSS where HTML would leak through as raw
  // tags.
  if (scene === 'list' && hasMoreMarker) {
    return renderedContent
  }

  // Otherwise, apply truncation
  return getExcerpt(renderedContent, lang, scene)
}

export function getPostDescription(
  post: CollectionEntry<'posts'>,
  scene: ExcerptScene,
): string {
  return getEntryDescription(post, scene)
}

export function getNoteDescription(
  note: CollectionEntry<'notes'>,
  scene: ExcerptScene,
): string {
  return getEntryDescription(note, scene)
}

export function getJournalDescription(
  journal: CollectionEntry<'journals'>,
  scene: ExcerptScene,
): string {
  return getEntryDescription(journal, scene)
}
