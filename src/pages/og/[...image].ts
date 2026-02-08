import type { CollectionEntry } from 'astro:content'
import { OGImageRoute } from 'astro-og-canvas'
import { getCollection } from 'astro:content'
import { getJournalDescription, getNoteDescription, getPostDescription } from '@/utils/description'

// eslint-disable-next-line antfu/no-top-level-await
const posts = await getCollection('posts')
// eslint-disable-next-line antfu/no-top-level-await
let notes: CollectionEntry<'notes'>[] = []
try {
  // eslint-disable-next-line antfu/no-top-level-await
  notes = await getCollection('notes')
}
catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  if (!message.includes('The collection "notes" does not exist')) {
    throw error
  }
}

// eslint-disable-next-line antfu/no-top-level-await
let journals: CollectionEntry<'journals'>[] = []
try {
  // eslint-disable-next-line antfu/no-top-level-await
  journals = await getCollection('journals')
}
catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  if (!message.includes('The collection "journals" does not exist')) {
    throw error
  }
}

// Create slug-to-metadata lookup object for blog posts
type OGPage = {
  title: string
  description: string
}

const pages = Object.fromEntries([
  ...posts.map((post: CollectionEntry<'posts'>) => [
    post.id,
    {
      title: post.data.title,
      description: getPostDescription(post, 'og'),
    },
  ]),
  ...notes.map((note: CollectionEntry<'notes'>) => [
    `notes/${note.id}`,
    {
      title: note.data.title,
      description: getNoteDescription(note, 'og'),
    },
  ]),
  ...journals.map((journal: CollectionEntry<'journals'>) => [
    `journals/${journal.id}`,
    {
      title: journal.data.title,
      description: getJournalDescription(journal, 'og'),
    },
  ]),
]) as Record<string, OGPage>

// Configure Open Graph image generation route
// eslint-disable-next-line antfu/no-top-level-await
export const { getStaticPaths, GET } = await OGImageRoute({
  param: 'image',
  pages,
  getImageOptions: (_path, page) => ({
    title: page.title,
    description: page.description,
    logo: {
      path: './public/icons/og-logo.png', // Required local path and PNG format
      size: [250],
    },
    border: {
      color: [242, 241, 245],
      width: 20,
    },
    font: {
      title: {
        families: ['Noto Sans SC'],
        weight: 'Bold',
        color: [34, 33, 36],
        lineHeight: 1.5,
      },
      description: {
        families: ['Noto Sans SC'],
        color: [72, 71, 74],
        lineHeight: 1.5,
      },
    },
    fonts: [
      './public/fonts/NotoSansSC-Bold.otf',
      './public/fonts/NotoSansSC-Regular.otf',
    ],
    bgGradient: [[242, 241, 245]],
  }),
})
