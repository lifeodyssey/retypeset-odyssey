// Global Language Map
export const langMap: Record<string, string[]> = {
  'zh': ['zh-CN'],
  'zh-tw': ['zh-TW'],
  'ja': ['ja-JP'],
  'en': ['en-US'],
  'es': ['es-ES'],
  'ru': ['ru-RU'],
  'pt': ['pt-BR'],
}

// Waline Language Map
// https://waline.js.org/en/guide/features/i18n.html
export const walineLocaleMap: Record<string, string> = {
  'zh': 'zh-CN',
  'zh-tw': 'zh-TW',
  'ja': 'jp-JP', // Waline uses jp-JP instead of ja-JP
  'en': 'en-US',
  'es': 'es-ES',
  'ru': 'ru-RU',
  'pt': 'pt-BR',
}

// Supported Languages
export const supportedLangs = Object.keys(langMap).flat()
