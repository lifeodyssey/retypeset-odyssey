import { glob } from 'astro/loaders'
import { defineCollection, z } from 'astro:content'
import { allLocales, themeConfig } from '@/config'

const posts = defineCollection({
  loader: glob({
    pattern: '**/*.{md,mdx}',
    base: './content/posts',
    // Keep multi-dot filenames (e.g. `foo.en.md`) distinct in Astro Content Layer.
    // Otherwise, `foo.md` and `foo.en.md` may collide and overwrite each other.
    generateId: ({ entry }) => entry.replace(/\.(md|mdx)$/, ''),
  }),
  schema: z.object({
    // Title - optional with fallback to empty (posts without title become drafts)
    title: z.string().optional().default(''),
    // Support both Hexo 'date' and Retypeset 'published' fields
    published: z.coerce.date().optional(),
    date: z.coerce.date().optional(),
    // optional
    description: z.string().optional().default(''),
    updated: z.preprocess(
      val => val === '' ? undefined : val,
      z.coerce.date().optional(),
    ),
    tags: z.preprocess(
      val => val === null ? [] : val,
      z.union([
        z.array(z.string()),
        z.string().transform(s => s ? [s] : []),
      ]).optional().default([]),
    ),
    // Hexo categories (convert to tags or keep separate)
    categories: z.preprocess(
      val => val === null ? [] : val,
      z.union([
        z.array(z.string()),
        z.string().transform(s => s ? [s] : []),
      ]).optional().default([]),
    ),
    // Advanced (handle null values)
    draft: z.preprocess(val => val === null ? false : val, z.boolean().optional().default(false)),
    pin: z.preprocess(val => val === null ? 0 : val, z.number().int().min(0).max(99).optional().default(0)),
    toc: z.preprocess(val => val === null ? undefined : val, z.boolean().optional().default(themeConfig.global.toc)),
    lang: z.preprocess(val => val === null ? '' : val, z.enum(['', ...allLocales]).optional().default('')),
    // Hexo abbrlink - supports hex format like '17683e80' (handle null from YAML)
    abbrlink: z.preprocess(
      val => val === null ? '' : val,
      z.string().optional().default('').refine(
        abbrlink => !abbrlink || /^[a-zA-Z0-9\-]*$/.test(abbrlink),
        { message: 'Abbrlink can only contain letters, numbers and hyphens' },
      ),
    ),
    // Semantic URL slug - takes priority over abbrlink
    slug: z.preprocess(
      val => val === null ? '' : val,
      z.string().optional().default('').refine(
        slug => !slug || /^[a-zA-Z0-9\-]+$/.test(slug),
        { message: 'Slug can only contain letters, numbers and hyphens' },
      ),
    ),
    // Hexo-specific optional fields (handle null values from YAML)
    mathjax: z.preprocess(
      val => val === null ? undefined : val,
      z.boolean().optional().default(false),
    ),
    password: z.preprocess(
      val => val === null ? undefined : val,
      z.string().optional(),
    ),
    copyright: z.preprocess(
      val => val === null ? undefined : val,
      z.boolean().optional().default(true),
    ),
    // Allow passthrough of unknown Hexo fields
  }).passthrough().transform((data) => {
    // Map Hexo 'date' to 'published' if 'published' is not set
    const published = data.published || data.date || new Date();
    // Mark posts without title as draft
    const draft = data.draft || !data.title;
    return { ...data, published, draft };
  }),
})

const notes = defineCollection({
  loader: glob({
    pattern: '**/*.{md,mdx}',
    base: './content/notes',
    // Keep multi-dot filenames (e.g. `foo.en.md`) distinct in Astro Content Layer.
    // Otherwise, `foo.md` and `foo.en.md` may collide and overwrite each other.
    generateId: ({ entry }) => entry.replace(/\.(md|mdx)$/, ''),
  }),
  schema: z.object({
    // Title - optional with fallback to empty (notes without title become drafts)
    title: z.string().optional().default(''),
    // Support both Hexo 'date' and Retypeset 'published' fields
    published: z.coerce.date().optional(),
    date: z.coerce.date().optional(),
    // optional
    description: z.string().optional().default(''),
    updated: z.preprocess(
      val => val === '' ? undefined : val,
      z.coerce.date().optional(),
    ),
    tags: z.preprocess(
      val => val === null ? [] : val,
      z.union([
        z.array(z.string()),
        z.string().transform(s => s ? [s] : []),
      ]).optional().default([]),
    ),
    // Hexo categories (convert to tags or keep separate)
    categories: z.preprocess(
      val => val === null ? [] : val,
      z.union([
        z.array(z.string()),
        z.string().transform(s => s ? [s] : []),
      ]).optional().default([]),
    ),
    // Advanced (handle null values)
    draft: z.preprocess(val => val === null ? false : val, z.boolean().optional().default(false)),
    pin: z.preprocess(val => val === null ? 0 : val, z.number().int().min(0).max(99).optional().default(0)),
    toc: z.preprocess(val => val === null ? undefined : val, z.boolean().optional().default(themeConfig.global.toc)),
    lang: z.preprocess(val => val === null ? '' : val, z.enum(['', ...allLocales]).optional().default('')),
    // Semantic URL slug
    slug: z.preprocess(
      val => val === null ? '' : val,
      z.string().optional().default('').refine(
        slug => !slug || /^[a-zA-Z0-9\\-]+$/.test(slug),
        { message: 'Slug can only contain letters, numbers and hyphens' },
      ),
    ),
    // Allow passthrough of unknown fields
  }).passthrough().transform((data) => {
    const published = data.published || data.date || new Date()
    const draft = data.draft || !data.title
    return { ...data, published, draft }
  }),
})

const journals = defineCollection({
  loader: glob({
    pattern: '**/*.{md,mdx}',
    base: './content/journals',
    // Keep multi-dot filenames (e.g. `foo.en.md`) distinct in Astro Content Layer.
    // Otherwise, `foo.md` and `foo.en.md` may collide and overwrite each other.
    generateId: ({ entry }) => entry.replace(/\.(md|mdx)$/, ''),
  }),
  schema: z.object({
    // Title - optional with fallback to empty (journals without title become drafts)
    title: z.string().optional().default(''),
    // Support both Hexo 'date' and Retypeset 'published' fields
    published: z.coerce.date().optional(),
    date: z.coerce.date().optional(),
    // optional
    description: z.string().optional().default(''),
    updated: z.preprocess(
      val => val === '' ? undefined : val,
      z.coerce.date().optional(),
    ),
    tags: z.preprocess(
      val => val === null ? [] : val,
      z.union([
        z.array(z.string()),
        z.string().transform(s => s ? [s] : []),
      ]).optional().default([]),
    ),
    // Hexo categories (convert to tags or keep separate)
    categories: z.preprocess(
      val => val === null ? [] : val,
      z.union([
        z.array(z.string()),
        z.string().transform(s => s ? [s] : []),
      ]).optional().default([]),
    ),
    // Advanced (handle null values)
    draft: z.preprocess(val => val === null ? false : val, z.boolean().optional().default(false)),
    pin: z.preprocess(val => val === null ? 0 : val, z.number().int().min(0).max(99).optional().default(0)),
    toc: z.preprocess(val => val === null ? undefined : val, z.boolean().optional().default(themeConfig.global.toc)),
    lang: z.preprocess(val => val === null ? '' : val, z.enum(['', ...allLocales]).optional().default('')),
    // Semantic URL slug
    slug: z.preprocess(
      val => val === null ? '' : val,
      z.string().optional().default('').refine(
        slug => !slug || /^[a-zA-Z0-9\\-]+$/.test(slug),
        { message: 'Slug can only contain letters, numbers and hyphens' },
      ),
    ),
    // Hexo-specific optional fields (handle null values from YAML)
    mathjax: z.preprocess(
      val => val === null ? undefined : val,
      z.boolean().optional().default(false),
    ),
    password: z.preprocess(
      val => val === null ? undefined : val,
      z.string().optional(),
    ),
    copyright: z.preprocess(
      val => val === null ? undefined : val,
      z.boolean().optional().default(true),
    ),
    // Allow passthrough of unknown fields
  }).passthrough().transform((data) => {
    const published = data.published || data.date || new Date()
    const draft = data.draft || !data.title
    return { ...data, published, draft }
  }),
})

const about = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/about' }),
  schema: z.object({
    lang: z.enum(['', ...allLocales]).optional().default(''),
  }),
})

export const collections = { posts, notes, journals, about }
