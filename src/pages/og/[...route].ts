import { themeConfig } from '@/config'
import { generateDescription } from '@/utils/description'
import { OGImageRoute } from 'astro-og-canvas'
import { getCollection } from 'astro:content'

// eslint-disable-next-line antfu/no-top-level-await
const blogEntries = await getCollection('posts')

// 确定favicon路径是完整URL还是相对路径
const logoPath = themeConfig.site.favicon.startsWith('http')
  ? themeConfig.site.favicon
  : `./public${themeConfig.site.favicon}`

// Convert to page data objects
const pages = Object.fromEntries(
  blogEntries.map(post => [
    post.slug,
    {
      title: post.data.title,
      description: post.data.description || generateDescription(post),
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
    logo: {
      path: logoPath,
      size: [80],
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
      'https://raw.githubusercontent.com/notofonts/noto-cjk/main/Sans/SubsetOTF/SC/NotoSansSC-Bold.otf',
      'https://raw.githubusercontent.com/notofonts/noto-cjk/main/Sans/SubsetOTF/SC/NotoSansSC-Regular.otf',
    ],
    bgGradient: [[242, 241, 245]],
  }),
})
