import type { APIContext } from 'astro'
import type { CollectionEntry } from 'astro:content'
import type { Author } from 'feed'
import { defaultLocale, themeConfig } from '@/config'
import { ui } from '@/i18n/ui'
import { generateDescription } from '@/utils/description'
import { getCollection } from 'astro:content'
import { Feed } from 'feed'
import MarkdownIt from 'markdown-it'
import sanitizeHtml from 'sanitize-html'

const markdownParser = new MarkdownIt()
const { title, description, url, author: siteAuthor } = themeConfig.site
const followConfig = themeConfig.seo?.follow

interface GenerateFeedOptions {
  lang?: string
}

/**
 * Generate post URL with language prefix and abbrlink/slug
 */
function generatePostUrl(post: CollectionEntry<'posts'>, baseUrl: string): string {
  const needsLangPrefix = post.data.lang !== defaultLocale && post.data.lang !== ''
  const langPrefix = needsLangPrefix ? `${post.data.lang}/` : ''
  const postSlug = post.data.abbrlink || post.id

  return new URL(`${langPrefix}posts/${postSlug}/`, baseUrl).toString()
}

/**
 * Generate a feed object supporting both RSS and Atom formats
 */
export async function generateFeed({ lang }: GenerateFeedOptions = {}) {
  const currentUI = ui[lang as keyof typeof ui] || ui[defaultLocale as keyof typeof ui]
  const useI18nTitle = themeConfig.site.i18nTitle
  const siteTitle = useI18nTitle ? currentUI.title : title
  const siteDescription = useI18nTitle ? currentUI.description : description
  const siteURL = lang ? `${url}/${lang}` : url
  const author: Author = {
    name: siteAuthor,
    link: url,
  }

  // Create Feed instance
  const feed = new Feed({
    title: siteTitle,
    description: siteDescription,
    id: siteURL,
    link: siteURL,
    language: lang || themeConfig.global.locale,
    copyright: `Copyright © ${new Date().getFullYear()} ${siteAuthor}`,
    updated: new Date(),
    generator: 'Astro-Theme-Retypeset with Feed for Node.js',
    feedLinks: {
      rss: new URL(lang ? `/${lang}/rss.xml` : '/rss.xml', url).toString(),
      atom: new URL(lang ? `/${lang}/atom.xml` : '/atom.xml', url).toString(),
    },
    author,
  })

  // Filter posts by language and exclude drafts
  const posts = await getCollection(
    'posts',
    ({ data }: { data: CollectionEntry<'posts'>['data'] }) =>
      (!data.draft && (data.lang === lang || data.lang === '' || (lang === undefined && data.lang === defaultLocale))),
  )

  // Sort posts by published date in descending order
  const sortedPosts = [...posts].sort((a, b) =>
    new Date(b.data.published).getTime() - new Date(a.data.published).getTime(),
  )

  // Limit to the latest 25 posts
  const limitedPosts = sortedPosts.slice(0, 25)

  // Add posts to feed
  for (const post of limitedPosts) {
    const postLink = generatePostUrl(post, url)

    const postContent = post.body
      ? sanitizeHtml(markdownParser.render(post.body), {
          allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
        })
      : ''

    feed.addItem({
      title: post.data.title,
      id: postLink,
      link: postLink,
      description: generateDescription(post, 'feed'),
      content: postContent,
      author: [author],
      // published -> Atom:<published>, RSS:<pubDate>
      published: new Date(post.data.published),
      // date -> Atom:<updated>, RSS has no update tag
      date: post.data.updated ? new Date(post.data.updated) : new Date(post.data.published),
    })
  }

  // Add follow verification if available
  if (followConfig?.feedID && followConfig?.userID) {
    feed.addExtension({
      name: 'follow_challenge',
      objects: {
        feedId: followConfig.feedID,
        userId: followConfig.userID,
      },
    })
  }

  return feed
}

/**
 * Generate RSS 2.0 format feed
 */
export async function generateRSS(context: APIContext) {
  const feed = await generateFeed({
    lang: context.params?.lang as string | undefined,
  })

  let rssXml = feed.rss2()
  rssXml = rssXml.replace(
    '<?xml version="1.0" encoding="utf-8"?>',
    '<?xml version="1.0" encoding="utf-8"?>\n<?xml-stylesheet href="/feeds/rss-style.xsl" type="text/xsl"?>',
  )

  return new Response(rssXml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  })
}

/**
 * Generate Atom 1.0 format feed
 */
export async function generateAtom(context: APIContext) {
  const feed = await generateFeed({
    lang: context.params?.lang as string | undefined,
  })

  let atomXml = feed.atom1()
  atomXml = atomXml.replace(
    '<?xml version="1.0" encoding="utf-8"?>',
    '<?xml version="1.0" encoding="utf-8"?>\n<?xml-stylesheet href="/feeds/atom-style.xsl" type="text/xsl"?>',
  )

  return new Response(atomXml, {
    headers: {
      'Content-Type': 'application/atom+xml; charset=utf-8',
    },
  })
}
