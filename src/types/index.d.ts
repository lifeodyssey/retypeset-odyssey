import type { langPath } from '@/utils/ui'

type Exclude<T, U> = T extends U ? never : T

export interface ThemeConfig {

  site: {
    title: string
    subtitle: string
    description: string
    author: string
    url: string
    favicon: string
  }

  color: {
    mode: 'light' | 'dark'
    light: {
      primary: string
      secondary: string
      background: string
      codeTheme: string
    }
    dark: {
      primary: string
      secondary: string
      background: string
      codeTheme: string
    }
  }

  global: {
    locale: typeof langPath[number]
    moreLocale: typeof langPath[number][]
    font: 'sans' | 'serif'
    titleSpace: 1 | 2 | 3 | 4
  }

  comment?: {
    waline?: {
      serverURL?: string
      emoji?: string[]
      search?: boolean
      imageUploader?: boolean
    }
  }

  seo?: {
    twitterID?: string
    facebookID?: string
    facebookLink?: string
    verification?: {
      google?: string
      bing?: string
      yandex?: string
      baidu?: string
    }
    googleAnalyticsID?: string
    umamiAnalyticsID?: string
    follow?: {
      feedID?: string
      userID?: string
    }
    siteScreenshot: string
  }

  footer: {
    linkA: {
      name: string
      url: string
    }
    linkB: {
      name: string
      url: string
    }
    linkC: {
      name: string
      url: string
    }
  }

  preload: {
    cdn: string
    commentURL?: string
    imageHostURL?: string
    customGoogleAnalyticsURL?: string
    customUmamiAnalyticsURL?: string
    customUmamiAnalyticsJS?: string
  }

  about: {
    [key in ThemeConfig['global']['locale']]: string
  } & {
    [key in ThemeConfig['global']['moreLocale'][number]]?: string
  }
}

export default ThemeConfig
