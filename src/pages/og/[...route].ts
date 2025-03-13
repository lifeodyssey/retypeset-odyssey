import { OGImageRoute } from 'astro-og-canvas'
import { getCollection } from 'astro:content'

// eslint-disable-next-line antfu/no-top-level-await
const blogEntries = await getCollection('posts')

// Convert to page data objects
const pages = Object.fromEntries(
  blogEntries.map(({ slug, data }) => [
    slug,
    {
      title: data.title,
      description: data.description || '',
    },
  ]),
)

// Configure Open Graph image generation route
export const { getStaticPaths, GET } = OGImageRoute({
  param: 'route',
  pages,
  getImageOptions: (_path, page) => ({
    title: page.title,
    description: page.description,
    border: { width: 10 },
    padding: 40,
  }),
})
