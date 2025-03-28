import { allLocales } from '@/config'
import { defineCollection, z } from 'astro:content'

// Posts Collection
const postsCollection = defineCollection({
  schema: z.object({
    // required
    title: z.string(),
    published: z.date(),
    // optional
    description: z.string().optional().default(''),
    updated: z.date().optional(),
    tags: z.array(z.string()).optional().default([]),
    // Advanced
    draft: z.boolean().optional().default(false),
    pin: z.number().int().min(0).max(99).optional().default(0),
    toc: z.boolean().optional().default(true),
    lang: z.enum(['', ...allLocales]).optional().default(''),
    abbrlink: z.string().optional().default('').refine(
      abbrlink => !abbrlink || /^[a-z0-9\-]*$/.test(abbrlink),
      { message: 'Abbrlink can only contain lowercase letters, numbers and hyphens' },
    ),
  }),
})

// About Page
const aboutCollection = defineCollection({
  schema: z.object({
    lang: z.enum(['', ...allLocales]).optional().default(''),
  }),
})

export const collections = {
  posts: postsCollection,
  about: aboutCollection,
}
