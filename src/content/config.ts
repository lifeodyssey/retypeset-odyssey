import { defineCollection, z } from 'astro:content'

const postsCollection = defineCollection({
  schema: z.object({
    // required
    title: z.string(),
    published: z.date(),
    // optional
    updated: z.date().optional(),
    description: z.string().optional().default(''),
    tags: z.array(z.string()).optional().default([]),
    // Advanced
    draft: z.boolean().optional().default(false),
    pin: z.number().int().min(0).max(99).optional().default(0),
    toc: z.boolean().optional().default(false),
    lang: z.string().optional().default(''),
    abbrlink: z.string().optional().default('').refine(
      abbrlink => !abbrlink || /^[a-z0-9\-]*$/.test(abbrlink),
      { message: 'Abbrlink can only contain lowercase letters, numbers and hyphens' },
    ),
  }),
})

export const collections = {
  posts: postsCollection,
}
