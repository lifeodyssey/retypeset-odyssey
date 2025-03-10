import { defineCollection, z } from 'astro:content'

const postsCollection = defineCollection({
  schema: z.object({
    title: z.string(),
    published: z.date(),
    // Optional
    updated: z.date().optional(),
    tags: z.array(z.string()).optional().default([]),
    description: z.string().optional().default(''),
    image: z.string().optional().default(''),
    // Advanced
    pin: z.number().int().min(0).max(99).optional().default(0),
    toc: z.boolean().optional().default(false),
    draft: z.boolean().optional().default(false),
    lang: z.string().optional().default(''),
    slug: z.string().optional().default('').refine(
      slug => !slug || /^[\w\-]*$/.test(slug),
      { message: 'Slug can only contain letters, numbers, hyphens and underscores' },
    ),
    minutes: z.number().optional(),
  }),
})

export const collections = {
  posts: postsCollection,
}
