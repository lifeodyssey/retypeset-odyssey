import type { IncomingMessage, ServerResponse } from 'node:http'
import { constants, lstatSync, realpathSync, statSync } from 'node:fs'
import { copyFile, lstat, mkdir, readdir } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import sirv from 'sirv'

interface ThemeAssetsOptions {
  themePublicDir: string
  consumerPublicDir: string
  base: string
}

function isWithin(root: string, path: string): boolean {
  const name = relative(root, path)
  return name !== '..' && !name.startsWith(`..${sep}`) && !isAbsolute(name)
}

function assetPath(url: string, base: string): string | undefined {
  const pathname = url.split(/[?#]/, 1)[0]
  const prefix = base === '/' ? '' : base.replace(/\/$/, '')
  if (!pathname.startsWith(`${prefix}/`))
    return undefined

  const name = pathname.slice(prefix.length)
  try {
    const decoded = decodeURIComponent(name)
    if (decoded.includes('\\') || [...decoded].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127) || /%2f/i.test(name))
      return undefined
    if (decoded.split('/').some(segment => segment === '.' || segment === '..'))
      return undefined
    // Match sirv's decoding, including its treatment of reserved characters.
    return decodeURI(name)
  }
  catch {
    return undefined
  }
}

function consumerOwnsPath(root: string, name: string): boolean {
  let candidate = root
  const segments = name.split('/').filter(Boolean)
  for (const [index, segment] of segments.entries()) {
    candidate = join(candidate, segment)
    try {
      const entry = lstatSync(candidate)
      if (!entry.isDirectory() || index === segments.length - 1)
        return true
    }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT')
        return false
      throw error
    }
  }
  return false
}

export function createThemeAssetsMiddleware(options: ThemeAssetsOptions) {
  const themeRoot = realpathSync(options.themePublicDir)
  const serve = sirv(themeRoot, { dev: true, extensions: [], single: false })

  return (req: IncomingMessage & { originalUrl?: string }, res: ServerResponse, next: (error?: unknown) => void): void => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next()
      return
    }
    const requestedUrl = req.originalUrl ?? req.url ?? ''
    const name = assetPath(requestedUrl, options.base)
    if (!name) {
      next()
      return
    }

    const themeFile = resolve(themeRoot, `.${name}`)
    if (!isWithin(themeRoot, themeFile)) {
      next()
      return
    }

    try {
      if (consumerOwnsPath(options.consumerPublicDir, name)) {
        next()
        return
      }
      // Require an exact file: sirv also tries directory indexes, even with
      // extensions disabled. Never let those aliases shadow an Astro route.
      // Match the build copier: theme symlinks are never public assets.
      if (!statSync(themeFile).isFile() || realpathSync(themeFile) !== themeFile) {
        next()
        return
      }
    }
    catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      if (code === 'ENOENT' || code === 'ENOTDIR')
        next()
      else
        next(error)
      return
    }

    const originalUrl = req.url
    const prefix = options.base === '/' ? '' : options.base.replace(/\/$/, '')
    try {
      req.url = requestedUrl.slice(prefix.length)
      serve(req, res, () => {
        req.url = originalUrl
        next()
      })
    }
    finally {
      req.url = originalUrl
    }
  }
}

async function existingEntry(path: string) {
  try {
    return await lstat(path)
  }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT')
      return undefined
    throw error
  }
}

export async function copyMissingThemeAssets(themePublicDir: string, consumerPublicDir: string, outputDir: string): Promise<void> {
  if (resolve(themePublicDir) === resolve(consumerPublicDir))
    return

  async function copyDirectory(sourceDir: string, consumerDir: string, destinationDir: string): Promise<void> {
    const consumer = await existingEntry(consumerDir)
    if (consumer && !consumer.isDirectory())
      return

    const destination = await existingEntry(destinationDir)
    if (destination && !destination.isDirectory())
      throw new Error(`Theme asset directory conflicts with generated output: ${destinationDir}`)
    await mkdir(destinationDir, { recursive: true })

    for (const entry of await readdir(sourceDir, { withFileTypes: true })) {
      const source = join(sourceDir, entry.name)
      const consumerFile = join(consumerDir, entry.name)
      const target = join(destinationDir, entry.name)
      if (entry.isDirectory()) {
        await copyDirectory(source, consumerFile, target)
      }
      else if (entry.isFile()) {
        if (await existingEntry(consumerFile))
          continue
        if (await existingEntry(target))
          throw new Error(`Theme asset conflicts with generated output: ${target}. Move the asset or provide an explicit consumer public override.`)
        await copyFile(source, target, constants.COPYFILE_EXCL)
      }
    }
  }

  await copyDirectory(themePublicDir, consumerPublicDir, outputDir)
}
