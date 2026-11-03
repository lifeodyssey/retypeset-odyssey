import type { z } from 'zod'
import type { ThemeConfig } from '../src/config-schema.ts'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { parse } from 'yaml'
import { ThemeConfigSchema } from '../src/config-schema.ts'

const defaults = parse(readFileSync(new URL('../default-config.yaml', import.meta.url), 'utf8')) as z.input<typeof ThemeConfigSchema>
const defaultPoems = parse(readFileSync(new URL('../default-poems.yaml', import.meta.url), 'utf8')) as Pick<ThemeConfig, 'poems'>

function fixture() {
  return structuredClone(defaults)
}

test('bundled configuration and multilingual poems validate together', () => {
  const config = ThemeConfigSchema.parse({ ...fixture(), ...defaultPoems })
  assert.equal(config.site.title, defaults.site.title)
  assert.equal(config.site.url, defaults.site.url)
  assert.deepEqual(config.global.moreLocales, ['en', 'ja'])
  assert.deepEqual(config.poems, defaultPoems.poems)
  assert.ok(config.poems.zh?.length)
  assert.ok(config.poems.en?.length)
  assert.ok(config.poems.ja?.length)
})

test('omitted and empty optional groups populate every nested default', () => {
  const input = fixture()
  delete input.comment
  delete input.seo
  delete input.preload
  delete input.collections
  delete input.poems

  const config = ThemeConfigSchema.parse(input)
  assert.deepEqual(config.comment, {
    enabled: false,
    giscus: {
      repo: '',
      repoId: '',
      category: '',
      categoryId: '',
      mapping: 'pathname',
      strict: '0',
      reactionsEnabled: '1',
      emitMetadata: '0',
      inputPosition: 'bottom',
    },
    twikoo: { envId: '' },
    waline: { serverURL: '', emoji: [], search: false, imageUploader: false },
  })
  assert.deepEqual(config.seo, {
    twitterID: '',
    verification: { google: '', bing: '', yandex: '', baidu: '' },
    googleAnalyticsID: '',
    umamiAnalyticsID: '',
    cloudflareAnalyticsToken: '',
    follow: { feedID: '', userID: '' },
    apiflashKey: '',
    person: {
      name: '',
      alternateName: [],
      description: '',
      jobTitle: '',
      email: '',
      image: '',
      knowsAbout: [],
      alumniOf: [],
      worksFor: '',
      sameAs: [],
    },
    llms: { featured: [] },
  })
  assert.deepEqual(config.preload, {
    imageHostURL: '',
    customGoogleAnalyticsJS: '',
    customUmamiAnalyticsJS: '',
  })
  assert.deepEqual(config.collections, {})
  assert.deepEqual(config.poems, {})
  assert.deepEqual(ThemeConfigSchema.parse({ ...input, comment: {}, seo: {}, preload: {} }), config)
  assert.deepEqual(ThemeConfigSchema.parse({ ...input, comment: undefined, seo: undefined, preload: undefined }), config)
})

test('localized values retain partial-map types and leave absent languages absent', () => {
  const subtitle: ThemeConfig['site']['subtitle'] = { zh: '中文副标题' }
  const intro: ThemeConfig['collections'][string]['intro'] = { ja: '日本語のノート' }
  const poems: ThemeConfig['poems'] = {
    en: [{ id: 'example', title: 'Title', author: 'Author', lines: ['A line'] }],
  }
  const input = fixture()
  input.site.subtitle = subtitle
  input.collections = { notes: { intro } }
  input.poems = poems

  const config = ThemeConfigSchema.parse(input)
  assert.deepEqual(config.site.subtitle, subtitle)
  assert.deepEqual(config.collections.notes.intro, intro)
  assert.equal(config.collections.notes.enabled, true)
  assert.deepEqual(config.poems, poems)
  assert.equal(Object.hasOwn(config.site.subtitle, 'en'), false)
  assert.equal(Object.hasOwn(config.collections.notes.intro!, 'zh'), false)
  assert.equal(Object.hasOwn(config.poems, 'zh'), false)

  input.site.subtitle = 'A subtitle for every locale'
  assert.equal(ThemeConfigSchema.parse(input).site.subtitle, input.site.subtitle)
  input.site.subtitle = {}
  input.collections = { notes: { intro: {} }, journals: {} }
  input.poems = {}
  const empty = ThemeConfigSchema.parse(input)
  assert.deepEqual(empty.site.subtitle, {})
  assert.deepEqual(empty.collections.notes.intro, {})
  assert.equal(Object.hasOwn(empty.collections.journals, 'intro'), false)
  assert.deepEqual(empty.poems, {})
})

test('collection metadata passes through while undeclared theme fields are stripped', () => {
  const input = fixture()
  input.collections = { reading: { enabled: false, custom: { label: 'Reading list' } } }
  const config = ThemeConfigSchema.parse({
    ...input,
    unknownRoot: true,
    site: { ...input.site, unknownSite: true },
  })
  assert.deepEqual(config.collections.reading, { enabled: false, custom: { label: 'Reading list' } })
  assert.equal(Object.hasOwn(config, 'unknownRoot'), false)
  assert.equal(Object.hasOwn(config.site, 'unknownSite'), false)
})

test('unknown locales are rejected in every localized field', () => {
  const input = fixture()
  const invalid = [
    { ...input, site: { ...input.site, subtitle: { xx: 'Unknown locale' } } },
    { ...input, collections: { notes: { intro: { xx: 'Unknown locale' } } } },
    { ...input, poems: { xx: [] } },
    { ...input, global: { ...input.global, moreLocales: ['xx'] } },
  ]
  for (const value of invalid) {
    assert.equal(ThemeConfigSchema.safeParse(value).success, false)
  }
})

test('invalid values still fail validation with the failing field identified', () => {
  const input = fixture()
  const invalid = [
    { value: { ...input, site: { ...input.site, url: 'relative/path' } }, field: 'site' },
    { value: { ...input, site: { ...input.site, subtitle: { zh: 42 } } }, field: 'site' },
    { value: { ...input, comment: null }, field: 'comment' },
    { value: { ...input, comment: { enabled: 'yes' } }, field: 'comment' },
    { value: { ...input, footer: { ...input.footer, startYear: 2026.5 } }, field: 'footer' },
    { value: { ...input, collections: { notes: { enabled: 'false' } } }, field: 'collections' },
    { value: { ...input, poems: { en: [{ title: 'Missing fields' }] } }, field: 'poems' },
    { value: { ...input, poems: { zh: [{ id: 'id', title: '标题', author: '作者', lines: [1] }] } }, field: 'poems' },
  ]
  for (const { value, field } of invalid) {
    const result = ThemeConfigSchema.safeParse(value)
    assert.equal(result.success, false)
    if (!result.success) {
      assert.ok(result.error.issues.some(issue => issue.path[0] === field))
    }
  }
})

test('defaults from separate parses do not share mutable groups or arrays', () => {
  const input = fixture()
  delete input.comment
  delete input.seo
  const first = ThemeConfigSchema.parse(input)
  first.comment.waline.emoji.push('https://example.com/emoji')
  first.seo.person.name = 'Changed'

  const second = ThemeConfigSchema.parse(input)
  assert.deepEqual(second.comment.waline.emoji, [])
  assert.equal(second.seo.person.name, '')
})
