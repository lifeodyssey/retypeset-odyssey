import { defineCollection, z } from 'astro:content'

const postsCollection = defineCollection({
  schema: z.object({
    // Basic
    title: z.string(),
    published: z.date(),
    updated: z.date().optional(),
    tags: z.array(z.string()).optional().default([]),
    // Advanced
    pin: z.number().int().min(0).max(99).optional().default(0),
    draft: z.boolean().optional().default(false),
    toc: z.boolean().optional().default(false),
    lang: z.string().optional().default(''),
    abbrlink: z.string().optional().default('').refine(
      abbrlink => !abbrlink || /^[a-z0-9\-]*$/.test(abbrlink),
      { message: 'Abbrlink can only contain lowercase letters, numbers and hyphens' },
    ),
    // Auto-generated
    description: z.string().optional().default(''),
    image: z.string().optional().default(''),
  }),
})

export const collections = {
  posts: postsCollection,
}
