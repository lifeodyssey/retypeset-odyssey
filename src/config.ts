import type { ThemeConfig } from '@/types'

export const themeConfig: ThemeConfig = {
  // SITE INFORMATION >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> START
  site: {
    // site title
    title: 'Retypeset',
    // site subtitle (optional)
    subtitle: '再现版式之美',
    // site description for SEO
    description: 'Retypeset is a static blog theme based on the Astro framework, inspired by Typography Retypeset establishes a new visual standard and reimagines the layout of all pages, offering a reading experience similar to paper books, reviving the beauty of typography. Details in every sight, elegance in every space.',
    // author name
    author: 'radishzz',
    // site url
    url: 'https://retypeset.radishzz.cc',
    // favicon url
    // support only webp, svg or png
    favicon: '/image/logo.svg', // https://example.com/logo.svg
  },
  // SITE INFORMATION >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> END

  // COLOR SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> START
  color: {
    // default theme mode
    mode: 'light', // light, dark
    light: {
      // title color
      primary: 'oklch(25% 0.005 298)',
      // text color
      secondary: 'oklch(40% 0.005 298)',
      // background color
      background: 'oklch(96% 0.005 298)',
      // code block theme
      codeTheme: 'github-light', // available themes: https://shiki.style/themes
    },
    dark: {
      // title color
      primary: 'oklch(88% 0.005 298)',
      // text color
      secondary: 'oklch(77% 0.005 298)',
      // background color
      background: 'oklch(22% 0.005 298)',
      // code block theme
      codeTheme: 'github-dark', // available themes: https://shiki.style/themes
    },
  },
  // COLOR SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> END

  // GLOBAL SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> START
  global: {
    // default language
    locale: 'zh', // zh, zh-tw, ja, en, es, ru
    // more languages
    // not fill in the locale above again
    moreLocale: ['zh-tw', 'ja', 'en', 'es', 'ru'], // zh, zh-tw, ja, en, es, ru
    // font styles for text
    fontStyle: 'sans', // sans, serif
    // space between title and subtitle
    titleSpace: 3, // 1, 2, 3
  },
  // GLOBAL SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> END

  // COMMENT SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> START
  comment: {
    waline: {
      // waline server url
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
      imageUploader: false, // true, false (BUG：unable to hide image uploader icon)
    },
    // disqus: TODO
    // giscus: TODO
    // twikoo: TODO
  },
  // COMMENT SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> END

  // SEO SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> START
  seo: {
    // @twitter ID
    twitterID: '',
    // site verification
    verification: {
      // Google Search Console
      google: '', // https://search.google.com/search-console
      // Bing Webmaster Tools
      bing: '', // https://www.bing.com/webmasters
      // Yandex Webmaster
      yandex: '', // https://webmaster.yandex.com
      // Baidu Search
      baidu: '', // https://ziyuan.baidu.com
    },
    // Google Analytics
    googleAnalyticsID: '', // https://analytics.google.com
    // Umami Analytics
    umamiAnalyticsID: '520af332-bfb7-4e7c-9386-5f273ee3d697', // https://cloud.umami.is
    // follow verification
    // https://follow.is/
    follow: {
      // feed ID
      feedID: '',
      // user ID
      userID: '',
    },
  },
  // SEO SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> END

  // NAVBAR SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> START
  // navbar: {
  //   linkA: {
  //     // link name
  //     name: 'RSS',
  //     // link url
  //     url: '/rss.xml', // rss.xml or atom.xml
  //   },
  // },
  // NAVBAR SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> END

  // FOOTER SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> START
  footer: {
    // social links
    links: [
      {
        name: 'RSS',
        url: '/rss.xml', // rss.xml or atom.xml
      },
      {
        name: 'GitHub',
        url: 'https://github.com/radishzzz/astro-theme-retypeset',
      },
      {
        name: 'Views',
        url: 'https://views.radishzz.cc/share/uoGMvehDKafqkMC3/retypeset.radishzz.cc',
      },
      // {
      //   name: 'Mail',
      //   url: 'https://example@gmail.com',
      // }
    ],
    // year of website start
    startYear: 2024,
  },
  // FOOTER SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> END

  // PRELOAD SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> START
  preload: {
    // link prefetch strategy
    // details: https://docs.astro.build/en/guides/prefetch/#prefetch-strategies
    linkPrefetch: 'viewport', // hover, tap, viewport, load
    // comment server url
    commentURL: 'https://comment.radishzz.cc',
    // image hosting domain
    imageHostURL: 'https://image.radishzz.cc',
    // If you proxy analytics js to the custom domain, you can fill in below.
    // See https://gist.github.com/xiaopc/0602f06ca465d76bd9efd3dda9393738
    customGoogleAnalyticsJS: '', // https://custom.example.com/whatever.js
    // see https://github.com/umami-software/umami/discussions/1026
    customUmamiAnalyticsJS: '', // https://custom.example.com/whatever.js
  },
  // PRELOAD SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> END
}

export default themeConfig
