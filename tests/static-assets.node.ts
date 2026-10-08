import assert from 'node:assert/strict'
import { once } from 'node:events'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { createServer, request } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { copyMissingThemeAssets, createThemeAssetsMiddleware } from '../static-assets.ts'

async function fixture(t: { after: (fn: () => Promise<void>) => void }) {
  const root = await mkdtemp(join(tmpdir(), 'retypeset-assets-'))
  const theme = join(root, 'theme-public')
  const consumer = join(root, 'custom-public')
  const output = join(root, 'dist')
  await Promise.all([theme, consumer, output].map(path => mkdir(path)))
  t.after(() => rm(root, { recursive: true, force: true }))
  return { root, theme, consumer, output }
}

async function put(root: string, name: string, body: string) {
  const path = join(root, name)
  await mkdir(join(path, '..'), { recursive: true })
  await writeFile(path, body)
}

test('build merges theme defaults while preserving consumer files and custom publicDir', async (t) => {
  const { theme, consumer, output } = await fixture(t)
  await put(theme, 'fonts/theme.woff2', 'theme-font')
  await put(theme, 'favicon.svg', 'theme-icon')
  await put(consumer, 'favicon.svg', 'consumer-icon')
  await put(output, 'favicon.svg', 'consumer-icon')
  await put(output, 'experiments/demo.html', 'generated-page')

  await copyMissingThemeAssets(theme, consumer, output)

  assert.equal(await readFile(join(output, 'fonts/theme.woff2'), 'utf8'), 'theme-font')
  assert.equal(await readFile(join(output, 'favicon.svg'), 'utf8'), 'consumer-icon')
  assert.equal(await readFile(join(output, 'experiments/demo.html'), 'utf8'), 'generated-page')
  assert.equal(await readFile(join(theme, 'favicon.svg'), 'utf8'), 'theme-icon')
  await assert.rejects(readFile(join(consumer, 'fonts/theme.woff2')), { code: 'ENOENT' })
})

test('build fails on generated route conflicts without overwriting the route', async (t) => {
  const { theme, consumer, output } = await fixture(t)
  await put(theme, 'experiments/demo.html', 'theme-page')
  await put(output, 'experiments/demo.html', 'generated-page')
  await assert.rejects(copyMissingThemeAssets(theme, consumer, output), /conflicts with generated output/)
  assert.equal(await readFile(join(output, 'experiments/demo.html'), 'utf8'), 'generated-page')
})

test('build preserves consumer file-directory overrides and skips theme symlinks', async (t) => {
  const { root, theme, consumer, output } = await fixture(t)
  await put(theme, 'assets/theme.css', 'theme-css')
  await put(consumer, 'assets', 'consumer-file')
  await put(output, 'assets', 'consumer-file')
  await put(theme, 'icons', 'theme-file')
  await mkdir(join(consumer, 'icons'))
  await mkdir(join(output, 'icons'))
  await put(root, 'secret.txt', 'private')
  await symlink(join(root, 'secret.txt'), join(theme, 'linked.txt'))
  await copyMissingThemeAssets(theme, consumer, output)
  assert.equal(await readFile(join(output, 'assets'), 'utf8'), 'consumer-file')
  await assert.rejects(readFile(join(output, 'linked.txt')), { code: 'ENOENT' })
})

test('standalone public directory needs no overlay', async (t) => {
  const { theme, output } = await fixture(t)
  await put(theme, 'favicon.svg', 'theme-icon')
  await copyMissingThemeAssets(theme, theme, output)
  await assert.rejects(readFile(join(output, 'favicon.svg')), { code: 'ENOENT' })
})

test('dev serves exact theme files with base, HEAD and MIME; consumer overrides reach native handling', async (t) => {
  const { root, theme, consumer } = await fixture(t)
  await put(theme, 'fonts/theme.woff2', 'theme-font')
  await put(theme, 'my file.css', 'body { color: red; }')
  await put(theme, 'favicon.svg', 'theme-icon')
  await put(consumer, 'favicon.svg', 'consumer-icon')
  await put(theme, 'assets/theme.css', 'theme-css')
  await put(consumer, 'assets', 'consumer-file')
  await symlink(join(theme, 'fonts/theme.woff2'), join(theme, 'internal-link.woff2'))
  await symlink(join(theme, 'fonts'), join(theme, 'linked-fonts'))
  await put(theme, 'directory/index', 'implicit-index')
  await put(theme, 'page.html', 'implicit-extension')
  await put(root, 'secret.txt', 'private')
  await symlink(join(root, 'secret.txt'), join(theme, 'linked.txt'))
  const middleware = createThemeAssetsMiddleware({ themePublicDir: theme, consumerPublicDir: consumer, base: '/blog/' })
  const server = createServer((req, res) => {
    // Connect records the original URL; Astro strips base before integrations.
    const requestWithOriginal = Object.assign(req, { originalUrl: req.url })
    req.url = req.url?.replace(/^\/blog(?=\/)/, '')
    middleware(requestWithOriginal, res, (error) => {
      res.statusCode = error ? 500 : 404
      res.end(`native:${req.url}`)
    })
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(async () => {
    server.close()
    await once(server, 'close')
  })
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  const port = address.port

  async function get(path: string, method = 'GET') {
    return new Promise<{ status: number | undefined, body: string, type: string | undefined, length: string | undefined }>((resolve, reject) => {
      const req = request({ hostname: '127.0.0.1', port, path, method, agent: false }, (res) => {
        let body = ''
        res.setEncoding('utf8')
        res.on('data', chunk => body += chunk)
        res.on('end', () => resolve({ status: res.statusCode, body, type: res.headers['content-type'], length: res.headers['content-length'] }))
      })
      req.on('error', reject)
      req.end()
    })
  }

  assert.deepEqual(await get('/blog/fonts/theme.woff2?version=1'), { status: 200, body: 'theme-font', type: 'font/woff2', length: '10' })
  assert.deepEqual(await get('/blog/fonts/theme.woff2', 'HEAD'), { status: 200, body: '', type: 'font/woff2', length: '10' })
  assert.equal((await get('/blog/my%20file.css')).type, 'text/css')

  for (const path of ['/blog/favicon.svg', '/blog/assets/theme.css', '/fonts/theme.woff2', '/blog-other/fonts/theme.woff2', '/blog/missing', '/blog/directory', '/blog/directory/', '/blog/page', '/blog/../secret.txt', '/blog/%2e%2e/secret.txt', '/blog/%2e%2e%2fsecret.txt', '/blog/%5c..%5csecret.txt', '/blog/%00', '/blog/%ZZ', '/blog/linked.txt', '/blog/internal-link.woff2', '/blog/linked-fonts/theme.woff2']) {
    const response = await get(path)
    assert.equal(response.status, 404, path)
    assert.equal(response.body, `native:${path.replace(/^\/blog(?=\/)/, '')}`, path)
  }
  assert.equal((await get('/blog/fonts/theme.woff2', 'POST')).status, 404)
})
