// Global Language Map
export const langMap: Record<string, string[]> = {
  'zh': ['zh-CN'],
  'zh-tw': ['zh-TW'],
  'ja': ['ja-JP'],
  'en': ['en-US'],
  'es': ['es-ES'],
  'ru': ['ru-RU'],
}
// Standard Language Code
export const langCode = Object.values(langMap).flat()
// Abbreviated Language Code
export const langPath = Object.keys(langMap).flat()
// UI Translation
export const ui = {
  'zh': {
    posts: '文章',
    tags: '标签',
    about: '关于',
  },
  'zh-tw': {
    posts: '文章',
    tags: '標籤',
    about: '關於',
  },
  'ja': {
    posts: '記事',
    tags: 'タグ',
    about: '概要',
  },
  'en': {
    posts: 'Posts',
    tags: 'Tags',
    about: 'About',
  },
  'es': {
    posts: 'Artículos',
    tags: 'Etiquetas',
    about: 'Sobre',
  },
  'ru': {
    posts: 'Посты',
    tags: 'Теги',
    about: 'О себе',
  },
}
