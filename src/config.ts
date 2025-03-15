import type { ThemeConfig } from '@/types'

export const themeConfig: ThemeConfig = {
  // SITE INFORMATION >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> START
  site: {
    // site title
    title: 'Retypeset',
    // site subtitle
    subtitle: 'Revive the beauty of typography',
    // use i18n title/subtitle from src/i18n/ui.ts instead of static ones above
    i18nTitle: true,
    // site description
    description: 'Retypeset is a static blog theme based on the Astro framework, inspired by Typography. Retypeset establishes a new visual standard and reimagines the layout of all pages, offering a reading experience similar to paper books, reviving the beauty of typography. Details in every sight, elegance in every space.',
    // author name
    author: 'radishzz',
    // site url
    url: 'https://retypeset.radishzz.cc',
    // favicon url
    // support only SVG, PNG and ICO
    favicon: '/image/Favicon.svg', // or https://example.com/favicon.svg
  },
  // SITE INFORMATION >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> END

  // COLOR SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> START
  color: {
    // theme mode
    mode: 'light', // light, dark
    light: {
      // title color
      // oklch color picker: https://oklch.com/
      primary: 'oklch(25% 0.005 298)',
      // text color
      secondary: 'oklch(40% 0.005 298)',
      // background color
      background: 'oklch(96% 0.005 298)',
      // code block theme
      // available themes: https://shiki.style/themes
      codeTheme: 'github-light',
    },
    dark: {
      // title color
      // oklch color picker: https://oklch.com/
      primary: 'oklch(88% 0.005 298)',
      // text color
      secondary: 'oklch(77% 0.005 298)',
      // background color
      background: 'oklch(22% 0.005 298)',
      // code block theme
      // available themes: https://shiki.style/themes
      codeTheme: 'github-dark',
    },
  },
  // COLOR SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> END

  // GLOBAL SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> START
  global: {
    // default language
    locale: 'zh', // zh, zh-tw, ja, en, es, ru
    // more languages
    // not fill in the locale code above again
    moreLocales: ['zh-tw', 'ja', 'en', 'es', 'ru'], // ['zh', 'zh-tw', 'ja', 'en', 'es', 'ru']
    // font styles for text
    fontStyle: 'sans', // sans, serif
    // date format for posts
    dateFormat: 'YYYY-MM-DD', // YYYY-MM-DD, MM-DD-YYYY, DD-MM-YYYY, MONTH DAY YYYY, DAY MONTH YYYY
    // gap between title and subtitle
    titleGap: 2, // 1, 2, 3
  },
  // GLOBAL SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> END

  // COMMENT SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> START
  comment: {
    // waline comment system
    // docs: https://waline.js.org/en/
    waline: {
      // server url
      serverURL: 'https://retypeset-comment.radishzz.cc',
      // emoji url
      emoji: [
        'https://unpkg.com/@waline/emojis@1.2.0/tw-emoji',
        // 'https://unpkg.com/@waline/emojis@1.2.0/bmoji',
        // more emojis: https://waline.js.org/en/guide/features/emoji.html
      ],
      // gif search
      search: false, // true, false
      // image uploader
      // bug: unable to hide image uploader icon
      imageUploader: false, // true, false
    },
  },
  // COMMENT SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> END

  // SEO SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> START
  seo: {
    // @twitter ID
    twitterID: '@astrodotbuild',
    // site verification
    verification: {
      // google search console
      // docs: https://search.google.com/search-console
      google: '',
      // bing webmaster tools
      // docs: https://www.bing.com/webmasters
      bing: '',
      // yandex webmaster
      // docs: https://webmaster.yandex.com
      yandex: '',
      // baidu search
      // docs: https://ziyuan.baidu.com
      baidu: '',
    },
    // google analytics
    // docs: https://analytics.google.com
    googleAnalyticsID: '',
    // umami analytics
    // docs: https://cloud.umami.is
    umamiAnalyticsID: '520af332-bfb7-4e7c-9386-5f273ee3d697',
    // follow verification
    // docs: https://follow.is/
    follow: {
      // feed ID
      feedID: '',
      // user ID
      userID: '',
    },
  },
  // SEO SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> END

  // FOOTER SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> START
  footer: {
    // social links
    links: [
      {
        name: 'RSS',
        url: '/rss.xml', // rss.xml, atom.xml
      },
      {
        name: 'GitHub',
        url: 'https://github.com/radishzzz/astro-theme-retypeset',
      },
      {
        name: 'Twitter',
        url: 'https://x.com/astrodotbuild',
      },
      // {
      //   name: 'Email',
      //   url: 'https://example@gmail.com',
      // }
    ],
    // year of website start
    startYear: 2024,
  },
  // FOOTER SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> END

  // PRELOAD SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> START
  preload: {
    // link prefetch
    // docs: https://docs.astro.build/en/guides/prefetch/#prefetch-strategies
    linkPrefetch: 'viewport', // hover, tap, viewport, load
    // comment server url
    commentURL: 'https://comment.radishzz.cc',
    // image hosting url
    imageHostURL: 'https://image.radishzz.cc',
    // custom google analytics js
    // for users who route analytics javascript to a customized domain
    // See https://gist.github.com/xiaopc/0602f06ca465d76bd9efd3dda9393738
    customGoogleAnalyticsJS: '',
    // custom umami analytics js
    // for users who deploy umami on their own, or route analytics javascript to a customized domain
    // see https://github.com/umami-software/umami/discussions/1026
    customUmamiAnalyticsJS: 'https://js.radishzz.cc/jquery.min.js',
  },
  // PRELOAD SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> END
}

export default themeConfig

export const defaultLocale = themeConfig.global.locale
export const moreLocales = themeConfig.global.moreLocales
export const allLocales = [defaultLocale, ...moreLocales]
