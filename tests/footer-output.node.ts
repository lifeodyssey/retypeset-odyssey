import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { parse } from 'node-html-parser'

// Run after the standalone production build. The old Footer rendered valid
// links in dev but truncated the XML extension only in production.
const locales = [
  { name: 'Chinese', page: 'index.html', prefix: '' },
  { name: 'English', page: 'en.html', prefix: '/en' },
  { name: 'Japanese', page: 'ja.html', prefix: '/ja' },
]

for (const { name, page, prefix } of locales) {
  test(`${name} production footer links to the generated feed without prefetching it`, async () => {
    const html = parse(await readFile(new URL(`../dist/${page}`, import.meta.url), 'utf8'))
    const footer = html.querySelector('footer')
    assert.ok(footer, `${page} must render a footer`)
    const link = footer.querySelectorAll('a').find(anchor => anchor.textContent.trim() === 'RSS')
    assert.ok(link, `${page} must render the configured RSS subscription link`)
    assert.equal(link.getAttribute('href'), `${prefix}/atom.xml`)
    assert.equal(link.getAttribute('data-astro-prefetch'), 'false')
    assert.equal(link.getAttribute('target'), '_blank')
    assert.ok(link.getAttribute('rel')?.split(/\s+/).includes('noopener'))

    const atom = await readFile(new URL(`../dist${prefix}/atom.xml`, import.meta.url), 'utf8')
    assert.equal(parse(atom).querySelector('feed')?.getAttribute('xmlns'), 'http://www.w3.org/2005/Atom')
    const rss = await readFile(new URL(`../dist${prefix}/rss.xml`, import.meta.url), 'utf8')
    assert.equal(parse(rss).querySelector('rss')?.getAttribute('version'), '2.0')
  })
}
