#!/usr/bin/env node
// One-off: recover dead external images from the Wayback Machine, upload to R2
// (same ext/<sha1(orig)> scheme as the main migration), and rewrite content.
// Env: R2_* (source .env). CONTENT_DIR default ./content.
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import process from 'node:process'
import fg from 'fast-glob'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

const CONTENT_DIR = resolve(process.env.CONTENT_DIR || 'content')
const { R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_BUCKET, R2_PUBLIC_BASE } = process.env
const PUBLIC_BASE = R2_PUBLIC_BASE.replace(/\/$/, '')
const s3 = new S3Client({ region: 'auto', endpoint: R2_ENDPOINT, credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY } })

// [originalUrlAsInContent, downloadSource, optionalHeaders]
const W = ts => p => `https://web.archive.org/web/${ts}id_/${p}`
const RECOVER = [
  ['http://beader.me/imgs/auc-roc/074c46dccea3031e5ce8fcbb67453cd4.png', W('20170710033625')('http://beader.me/imgs/auc-roc/074c46dccea3031e5ce8fcbb67453cd4.png')],
  ['http://beader.me/imgs/auc-roc/1a02adedd70816dcd49461354390aaed.png', W('20170710041934')('http://beader.me/imgs/auc-roc/1a02adedd70816dcd49461354390aaed.png')],
  ['http://beader.me/imgs/auc-roc/1a9a293ac6c97475ebb337fb32081a4d.png', W('20220316040259')('https://beader.me/imgs/auc-roc/1a9a293ac6c97475ebb337fb32081a4d.png')],
  ['http://beader.me/imgs/auc-roc/92175e2de4a480e52938a836994e823c.png', W('20170710035637')('http://beader.me/imgs/auc-roc/92175e2de4a480e52938a836994e823c.png')],
  ['http://beader.me/imgs/auc-roc/95ccbafd95b1ef894b2711d3698d5187.png', W('20170710053403')('http://beader.me/imgs/auc-roc/95ccbafd95b1ef894b2711d3698d5187.png')],
  ['http://beader.me/imgs/auc-roc/9686a1f19149fe16eb4b6b383904d086.png', W('20150712225859')('http://beader.me/imgs/auc-roc/9686a1f19149fe16eb4b6b383904d086.png')],
  ['http://beader.me/imgs/auc-roc/f03add592a75ef5b5e7346a5209b0cb8.png', W('20170710051222')('http://beader.me/imgs/auc-roc/f03add592a75ef5b5e7346a5209b0cb8.png')],
  ['http://beader.me/imgs/auc-roc/f3aac8b8603adb924363e766992df3cd.png', W('20170710043817')('http://beader.me/imgs/auc-roc/f3aac8b8603adb924363e766992df3cd.png')],
  ['https://ipt.imgix.net/203320/x/0/chromatic-aberration-ndash-what-it-is-and-how-to-avoid-it-2.jpg?auto=compress%2Cformat&ch=Width%2CDPR&dpr=1&ixlib=php-3.3.0&w=883', W('20231119165640')('https://ipt.imgix.net/203320/x/0/chromatic-aberration-ndash-what-it-is-and-how-to-avoid-it-2.jpg')],
  ['https://www.gairuo.com/file/pic/2020/04/pandas_index_01.jpg', W('20220605032201')('https://www.gairuo.com/file/pic/2020/04/pandas_index_01.jpg')],
  // live attempt for douban (no wayback copy) — try with referer; skip if it fails
  ['https://img9.doubanio.com/view/subject/l/public/s1252320.jpg', 'https://img9.doubanio.com/view/subject/l/public/s1252320.jpg', { referer: 'https://book.douban.com/' }],
]

function extFromUrl(u) { const m = u.split(/[?#]/)[0].match(/\.([a-z0-9]{1,5})$/i); return m ? m[1].toLowerCase() : 'bin' }
const CT = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp' }

async function dl(url, headers = {}) {
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), 45000)
  try {
    const res = await fetch(url, { signal: ac.signal, redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0', ...(headers.referer ? { referer: headers.referer } : {}) } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 200) throw new Error(`too small (${buf.length}B)`) // reject placeholders/empties
    return buf
  } finally { clearTimeout(t) }
}

const mapping = {}; const ok = []; const failed = []
for (const [orig, src, headers] of RECOVER) {
  try {
    const buf = await dl(src, headers || {})
    const ext = extFromUrl(orig)
    const key = `ext/${createHash('sha1').update(orig).digest('hex')}.${ext}`
    await s3.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, Body: buf, ContentType: CT[ext] || 'application/octet-stream', CacheControl: 'public, max-age=31536000, immutable' }))
    mapping[orig] = `${PUBLIC_BASE}/${key}`
    ok.push(`${orig}  (${buf.length}B) -> ${mapping[orig]}`)
  } catch (e) { failed.push(`${orig}  -> ${e.message}`) }
}

// rewrite content
const files = await fg('**/*.md', { cwd: CONTENT_DIR, absolute: true })
const pairs = Object.entries(mapping)
let changed = 0; let repl = 0
for (const f of files) {
  let txt = await readFile(f, 'utf8'); const before = txt
  for (const [o, n] of pairs) { if (txt.includes(o)) { repl += txt.split(o).length - 1; txt = txt.split(o).join(n) } }
  if (txt !== before) { await writeFile(f, txt); changed++ }
}

console.log(`Recovered+uploaded: ${ok.length}`); ok.forEach(s => console.log('  ✅ ' + s))
console.log(`Failed: ${failed.length}`); failed.forEach(s => console.log('  ❌ ' + s))
console.log(`Rewrote ${repl} references across ${changed} files`)
