import { glob } from 'astro/loaders'
import { defineCollection, z } from 'astro:content'
import { allLocales, themeConfig } from '@/config'

const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './content/posts' }),
  schema: z.object({
    // required
    title: z.string(),
    // Support both Hexo 'date' and Retypeset 'published' fields
    published: z.coerce.date().optional(),
    date: z.coerce.date().optional(),
    // optional
    description: z.string().optional().default(''),
    updated: z.preprocess(
      val => val === '' ? undefined : val,
      z.coerce.date().optional(),
    ),
    tags: z.union([
      z.array(z.string()),
      z.string().transform(s => s ? [s] : []),
    ]).optional().default([]),
    // Hexo categories (convert to tags or keep separate)
    categories: z.union([
      z.array(z.string()),
      z.string().transform(s => s ? [s] : []),
    ]).optional().default([]),
    // Advanced
    draft: z.boolean().optional().default(false),
    pin: z.number().int().min(0).max(99).optional().default(0),
    toc: z.boolean().optional().default(themeConfig.global.toc),
    lang: z.enum(['', ...allLocales]).optional().default(''),
    // Hexo abbrlink - supports hex format like '17683e80'
    abbrlink: z.string().optional().default('').refine(
      abbrlink => !abbrlink || /^[a-zA-Z0-9\-]*$/.test(abbrlink),
      { message: 'Abbrlink can only contain letters, numbers and hyphens' },
    ),
    // Hexo-specific optional fields
    mathjax: z.boolean().optional().default(false),
    password: z.string().optional(),
    copyright: z.boolean().optional().default(true),
  }).transform((data) => {
    // Map Hexo 'date' to 'published' if 'published' is not set
    const published = data.published || data.date || new Date();
    return { ...data, published };
  }),
})

const about = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/about' }),
  schema: z.object({
    lang: z.enum(['', ...allLocales]).optional().default(''),
  }),
})

export const collections = { posts, about }
