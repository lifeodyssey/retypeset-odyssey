import type { supportedLangs } from '@/i18n/ui'

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
    locale: typeof supportedLangs[number]
    moreLocales: typeof supportedLangs[number][]
    fontStyle: 'sans' | 'serif'
    dateFormat: 'YYYY-MM-DD' | 'MM-DD-YYYY' | 'DD-MM-YYYY' | 'MONTH DAY YYYY' | 'DAY MONTH YYYY'
    titleSpace: 1 | 2 | 3
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
  }

  footer: {
    links: {
      name: string
      url: string
    }[]
    startYear: number
  }

  preload: {
    linkPrefetch: 'hover' | 'tap' | 'viewport' | 'load'
    commentURL?: string
    imageHostURL?: string
    customGoogleAnalyticsJS?: string
    customUmamiAnalyticsJS?: string
  }
}

export default ThemeConfig
