import { defineCollection, z } from 'astro:content'

const postsCollection = defineCollection({
  schema: z.object({
    title: z.string(),
    published: z.date(),
    updated: z.date().optional(),
    tags: z.array(z.string()).optional().default([]),
    // For Open Graph
    description: z.string().optional().default(''),
    image: z.string().optional().default(''),
    // Extended Settings
    lang: z.string().optional().default(''),
    slug: z.string()
      .optional()
      .default('')
      .refine(
        (slug) => {
          if (!slug)
            return true
          return /^[\w\-]*$/.test(slug)
        },
        {
          message: 'Slug can only contain letters, numbers, hyphens and underscores',
        },
      ),
    toc: z.boolean().optional().default(false),
    pin: z.boolean().optional().default(false),
    draft: z.boolean().optional().default(false),
    minutes: z.number().optional(),
  }),
})
export const collections = {
  posts: postsCollection,
}
