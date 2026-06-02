#!/usr/bin/env node
/**
 * Migrate blog images to Cloudflare R2.
 *
 * Sources handled:
 *   - Figurebed (raw.githubusercontent.com/lifeodyssey/Figurebed/master/<path>)
 *       -> R2 key = <path> (decoded), public URL keeps original encoding
 *   - Any other reachable http(s) image
 *       -> R2 key = ext/<sha1(url)>.<ext>
 *   - Dead links (download fails) are reported, never rewritten.
 *
 * Two-phase + idempotent:
 *   1. Download every unique URL, upload to R2, record url->publicUrl in a manifest.
 *   2. Only after ALL uploads succeed, rewrite the markdown files in one pass.
 *   A manifest file lets re-runs skip already-uploaded images.
 *
 * Env (load via your .env): R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
 *   R2_ENDPOINT, R2_BUCKET, R2_PUBLIC_BASE
 * Env knobs: CONTENT_DIR (default ./content), MANIFEST (default
 *   <CONTENT_DIR>/../.image-migration-manifest.json), CONCURRENCY (default 12)
 * Flags: --execute (default is dry-run: classify + report, no upload/rewrite)
 */
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import fg from 'fast-glob'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

const EXECUTE = process.argv.includes('--execute')
const CONTENT_DIR = resolve(process.env.CONTENT_DIR || 'content')
const MANIFEST = resolve(process.env.MANIFEST || `${CONTENT_DIR}/../.image-migration-manifest.json`)
const CONCURRENCY = Number(process.env.CONCURRENCY || 12)

const { R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_BUCKET, R2_PUBLIC_BASE } = process.env
for (const [k, v] of Object.entries({ R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_BUCKET, R2_PUBLIC_BASE })) {
  if (!v) {
    console.error(`Missing env ${k}. Source your .env first.`)
    process.exit(1)
  }
}
const PUBLIC_BASE = R2_PUBLIC_BASE.replace(/\/$/, '')
const FIGUREBED_PREFIX = 'https://raw.githubusercontent.com/lifeodyssey/Figurebed/master/'

const s3 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
})

const IMG_MD = /!\[[^\]]*\]\(\s*(<[^>]+>|[^)\s]+)[^)]*\)/g
const IMG_HTML = /<img\b[^>]*?\ssrc\s*=\s*["']([^"']+)["']/gi

const EXT_BY_MIME = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/bmp': 'bmp',
  'image/avif': 'avif',
  'image/x-icon': 'ico',
  'image/tiff': 'tiff',
}

function cleanUrl(raw) {
  let u = raw.trim()
  if (u.startsWith('<') && u.endsWith('>')) u = u.slice(1, -1)
  return u
}

function isHttp(u) {
  return /^https?:\/\//i.test(u)
}

function extFromUrl(u) {
  const path = u.split(/[?#]/)[0]
  const m = path.match(/\.([a-z0-9]{1,5})$/i)
  return m ? m[1].toLowerCase() : ''
}

function targetFor(url) {
  if (url.startsWith(FIGUREBED_PREFIX)) {
    const encodedPath = url.slice(FIGUREBED_PREFIX.length)
    let key
    try { key = decodeURIComponent(encodedPath) }
    catch { key = encodedPath }
    return { key, publicUrl: `${PUBLIC_BASE}/${encodedPath}` }
  }
  // external
  const sha1 = createHash('sha1').update(url).digest('hex')
  const ext = extFromUrl(url) || 'bin'
  const key = `ext/${sha1}.${ext}`
  return { key, publicUrl: `${PUBLIC_BASE}/${key}`, ext }
}

async function fetchWithRetry(url, tries = 3) {
  let lastErr
  for (let i = 0; i < tries; i++) {
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), 30000)
    try {
      const res = await fetch(url, {
        signal: ac.signal,
        redirect: 'follow',
        headers: { 'user-agent': 'Mozilla/5.0 (blog-image-migration)' },
      })
      clearTimeout(timer)
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status}`)
        if (res.status >= 400 && res.status < 500 && res.status !== 429) break
        continue
      }
      const buf = Buffer.from(await res.arrayBuffer())
      const ct = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
      return { buf, contentType: ct }
    }
    catch (e) {
      clearTimeout(timer)
      lastErr = e
    }
  }
  throw lastErr || new Error('download failed')
}

async function pool(items, n, worker) {
  const results = []
  let i = 0
  const runners = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++
      results[idx] = await worker(items[idx], idx)
    }
  })
  await Promise.all(runners)
  return results
}

async function main() {
  const files = await fg('**/*.md', { cwd: CONTENT_DIR, absolute: true })
  console.error(`Scanning ${files.length} markdown files in ${CONTENT_DIR}`)

  // url -> [{file, line}]
  const refs = new Map()
  for (const file of files) {
    const text = await readFile(file, 'utf8')
    const lines = text.split('\n')
    lines.forEach((line, idx) => {
      for (const re of [IMG_MD, IMG_HTML]) {
        re.lastIndex = 0
        let m
        while ((m = re.exec(line))) {
          const url = cleanUrl(m[1])
          if (!isHttp(url)) continue
          if (url.startsWith(PUBLIC_BASE)) continue // already migrated
          if (!refs.has(url)) refs.set(url, [])
          refs.get(url).push({ file, line: idx + 1 })
        }
      }
    })
  }

  const urls = [...refs.keys()]
  console.error(`Found ${urls.length} unique non-R2 image URLs (${[...refs.values()].reduce((a, b) => a + b.length, 0)} references)`)

  const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : { uploaded: {}, dead: {} }
  manifest.uploaded ||= {}
  manifest.dead ||= {}

  let figurebed = 0; let external = 0
  for (const u of urls) (u.startsWith(FIGUREBED_PREFIX) ? figurebed++ : external++)
  console.error(`  Figurebed: ${figurebed} | external: ${external}`)
  console.error(`  Already in manifest: ${Object.keys(manifest.uploaded).length} uploaded, ${Object.keys(manifest.dead).length} dead`)

  if (!EXECUTE) {
    console.error('\n--- DRY RUN (pass --execute to upload + rewrite) ---')
  }

  const dead = []
  let uploaded = 0; let skipped = 0

  await pool(urls, CONCURRENCY, async (url) => {
    if (manifest.uploaded[url]) { skipped++; return }
    if (manifest.dead[url]) { dead.push(url); return }
    const t = targetFor(url)
    if (!EXECUTE) {
      // still probe to classify dead vs alive in dry-run
      try {
        await fetchWithRetry(url, 1)
      }
      catch {
        dead.push(url)
      }
      return
    }
    try {
      const { buf, contentType } = await fetchWithRetry(url)
      const ct = contentType && contentType.startsWith('image/') ? contentType
        : (Object.entries(EXT_BY_MIME).find(([, e]) => e === (t.ext || extFromUrl(url)))?.[0] || 'application/octet-stream')
      await s3.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: t.key,
        Body: buf,
        ContentType: ct,
        CacheControl: 'public, max-age=31536000, immutable',
      }))
      manifest.uploaded[url] = t.publicUrl
      uploaded++
      if (uploaded % 25 === 0) {
        await writeFile(MANIFEST, JSON.stringify(manifest, null, 2))
        console.error(`  ...uploaded ${uploaded}`)
      }
    }
    catch (e) {
      manifest.dead[url] = String(e.message || e)
      dead.push(url)
    }
  })

  if (EXECUTE) await writeFile(MANIFEST, JSON.stringify(manifest, null, 2))

  console.error(`\nUpload: ${uploaded} new, ${skipped} already done, ${dead.length} dead/failed`)

  // Phase 2: rewrite (only on execute, only if no NEW unexpected state)
  if (EXECUTE) {
    const map = manifest.uploaded
    const pairs = Object.entries(map).sort((a, b) => b[0].length - a[0].length)
    let changedFiles = 0; let replacements = 0
    for (const file of files) {
      let text = await readFile(file, 'utf8')
      const before = text
      for (const [oldUrl, newUrl] of pairs) {
        if (text.includes(oldUrl)) {
          const parts = text.split(oldUrl)
          replacements += parts.length - 1
          text = parts.join(newUrl)
        }
      }
      if (text !== before) { await writeFile(file, text); changedFiles++ }
    }
    console.error(`Rewrite: ${replacements} references across ${changedFiles} files`)
  }

  // Dead link report (file:line)
  if (dead.length) {
    console.error(`\n=== DEAD / UNREACHABLE (${dead.length}) — need manual handling ===`)
    for (const url of dead.sort()) {
      const where = (refs.get(url) || []).map(r => `${r.file.replace(`${CONTENT_DIR}/`, '')}:${r.line}`).join(', ')
      console.error(`  ${url}`)
      console.error(`      ${where}`)
    }
  }

  // Machine-readable summary
  console.log(JSON.stringify({
    uniqueUrls: urls.length,
    figurebed,
    external,
    uploaded,
    skipped,
    dead: dead.length,
    deadUrls: dead.sort(),
    manifest: MANIFEST,
  }, null, 2))
}

main().catch((e) => { console.error(e); process.exit(1) })
