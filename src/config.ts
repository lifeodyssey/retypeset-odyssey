import type { ThemeConfig } from '@/types'

export const themeConfig: ThemeConfig = {
  // SITE INFORMATION >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> START
  site: {
    title: 'Retypeset', // site title
    subtitle: '再现版式之美', // site subtitle
    description: 'This is Retypeset, an elegant and open-source Astro blog theme, help you rediscover the beauty of typography.', // site description for SEO
    author: 'radishzz', // author name
    url: 'https://retypeset.radishzz.cc', // site url
    favicon: '/image/logo.svg', // or https://image.example.com/logo.svg. Support only webp, svg, png
  },
  // SITE INFORMATION >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> END

  // COLOR SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> START
  color: {
    mode: 'light', // light, dark. Matches system theme by default, falls back to configured theme mode if not available.
    light: {
      primary: '#17191A', // title font color
      secondary: '#505050', // post font color
      background: '#FAEDE4', // background color
      codeTheme: 'github-light', // code block theme. See more at https://shiki.style/themes and https://vscodethemes.com/
    },
    dark: {
      primary: '#BEBEBE', // title font color
      secondary: '#A0A09F', // post font color
      background: '#161616', // background color
      codeTheme: 'github-dark', // code block theme. See more at https://shiki.style/themes and https://vscodethemes.com/
    },
  },
  // COLOR SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> END

  // GLOBAL SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> START
  global: {
    locale: 'zh', // support only zh, zh-tw, ja, en, es, ru. Default locale setting
    moreLocale: ['zh-tw', 'ja', 'en', 'es', 'ru'], // ['zh', 'zh-tw', 'ja', 'en', 'es', 'ru']. NOT fill in the default locale code again
    font: 'sans', // support only sans, serif. Choose the font style for posts
    titleSpace: 4, // support only 1, 2, 3, 4. Space between title and subtitle, 1 is the smallest, 4 is the largest
  },
  // GLOBAL SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> END

  // COMMENT SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> START
  comment: {
    waline: {
      serverURL: '',
      emoji: [
        '',
        '',
      ],
      search: true,
      imageUploader: true,
    },
  },
  // COMMENT SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> END

  // SEO SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> START
  seo: {
    twitterID: '', // @twitter ID
    facebookID: '', // @facebook ID
    facebookLink: '', // facebook profile link
    // site verification
    verification: {
      google: '', // Google Search Console: https://search.google.com/search-console
      bing: '', // Bing Webmaster Tools: https://www.bing.com/webmasters
      yandex: '', // Yandex Webmaster: https://webmaster.yandex.com
      baidu: '', // Baidu Search: https://ziyuan.baidu.com
    },
    // site analytics
    googleAnalyticsID: '', // Google Analytics: https://analytics.google.com
    umamiAnalyticsID: '', // Umami Analytics: https://cloud.umami.is
    // follow verification
    follow: {
      feedID: '', // feed ID
      userID: '', // user ID
    },
    siteScreenshot: '', // take a screenshot of your website homepage to show on twitter card
  },
  // SEO SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> END

  // FOOTER SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> START
  footer: {
    linkA: {
      name: 'RSS',
      url: '/rss.xml',
    },
    linkB: {
      name: 'Contact',
      url: '#',
    },
    linkC: {
      name: 'GitHub',
      url: '#',
    },
  },
  // FOOTER SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> END

  // PRELOAD SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> START
  preload: {
    cdn: 'https://cdn.jsdelivr.net', // Keep the default CDN unless you can proxy https://cdn.jsdelivr.net/gh/radishzzz/astro-theme-retypeset/src/styles/font.css
    commentURL: '', // https://comment.example.com/
    imageHostURL: '', // https://image.example.com/
    // If you proxy analytics requests to the custom domain, you can fill in below
    customGoogleAnalyticsURL: '', // https://custom.example.com/
    customUmamiAnalyticsURL: '', // https://custom.example.com/
    customUmamiAnalyticsJS: '', // https://custom.example.com/custom.js
  },
  // PRELOAD SETTINGS >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> END

  // ABOUT PAGE CONTENT >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> START
  about: {
    // Required: Content for about page in default language
    '[locale]': '关于我',
    // Optional: Content for about page in other languages. If not set, will fallback to [locale] content
    'zh-tw': '關於我',
    'ja': '私について',
    'en': 'About me',
    'es': 'Sobre mí',
    'ru': 'Обо мне',
  },
  // ABOUT PAGE CONTENT >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> END
}

export default themeConfig
