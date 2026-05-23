/**
 * Shared folder discovery + collection-enablement resolution.
 *
 * Both `integration.ts` and `src/content.config.ts` call into this module so
 * the set of active collections is computed identically in the two places
 * (Astro statically loads `content.config.ts` in its own Vite environment,
 * so we can't share state between them at runtime — but both can read the
 * same YAML and scan the same `content/` directory).
 *
 * Behaviour:
 *
 *   - Built-in collections: `posts`, `notes`, `journals` are always
 *     candidates. They appear in the result unless the consumer explicitly
 *     sets `collections.<name>.enabled: false` in `retypeset.config.yaml`.
 *
 *   - Dynamic collections: every direct child folder of
 *     `<projectRoot>/content/` that is NOT a built-in, NOT prefixed with `_`
 *     or `.`, AND has a valid URL-segment name becomes its own collection.
 *     Each dynamic folder may be opted out the same way (set
 *     `collections.<folder>.enabled: false`).
 *
 *   - When no `content/` directory exists (e.g. fresh checkout of the
 *     theme repo before any content is wired up), only built-in
 *     collections are returned and the dynamic-collection list is empty.
 *
 * The slug used for both the collection name and the URL segment is the
 * folder name verbatim. Folders whose name contains characters outside
 * `[a-zA-Z0-9-]` are skipped with a warning — those would need encoding or
 * renaming to be safe in URLs and JS identifiers.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { isAbsolute, resolve as resolvePath } from 'node:path'
import yaml from 'yaml'

export const BUILT_IN_COLLECTIONS = ['posts', 'notes', 'journals'] as const
export type BuiltInCollection = typeof BUILT_IN_COLLECTIONS[number]

const URL_SAFE_NAME = /^[a-zA-Z0-9][a-zA-Z0-9-]*$/

export interface CollectionDiscovery {
  /** Enabled built-in collections, in canonical order. */
  enabledBuiltIns: BuiltInCollection[]
  /** Dynamic folders that should become collections, in scan order. */
  dynamicFolders: string[]
  /** Folders that were skipped because the name is not URL-safe. */
  skippedFolders: string[]
}

interface RawCollectionConfig {
  enabled?: boolean
}

function readCollectionsSection(
  projectRoot: string,
  userConfigPath?: string,
): Record<string, RawCollectionConfig> {
  const candidates: string[] = []

  if (userConfigPath) {
    const abs = isAbsolute(userConfigPath)
      ? userConfigPath
      : resolvePath(projectRoot, userConfigPath)
    candidates.push(abs)
  }
  else {
    candidates.push(resolvePath(projectRoot, 'retypeset.config.yaml'))
  }

  for (const candidate of candidates) {
    if (!existsSync(candidate))
      continue

    try {
      const parsed = yaml.parse(readFileSync(candidate, 'utf-8')) as
        | { collections?: Record<string, RawCollectionConfig> }
        | undefined
      return parsed?.collections ?? {}
    }
    catch {
      // Malformed YAML — fall through to defaults.
      return {}
    }
  }

  return {}
}

function isEnabled(
  collectionsConfig: Record<string, RawCollectionConfig>,
  name: string,
  defaultEnabled: boolean,
): boolean {
  const entry = collectionsConfig[name]
  if (entry?.enabled === false)
    return false
  if (entry?.enabled === true)
    return true
  return defaultEnabled
}

/**
 * Walk `<projectRoot>/content/` and resolve which collections are active.
 *
 * @param projectRoot Consumer project root (or theme root in standalone mode).
 * @param userConfigPath Optional explicit path to `retypeset.config.yaml`.
 */
export function discoverCollections(
  projectRoot: string,
  userConfigPath?: string,
): CollectionDiscovery {
  const collectionsConfig = readCollectionsSection(projectRoot, userConfigPath)
  const contentDir = resolvePath(projectRoot, 'content')

  const enabledBuiltIns = BUILT_IN_COLLECTIONS.filter(name =>
    isEnabled(collectionsConfig, name, true),
  )

  if (!existsSync(contentDir)) {
    return { enabledBuiltIns, dynamicFolders: [], skippedFolders: [] }
  }

  const dynamicFolders: string[] = []
  const skippedFolders: string[] = []

  for (const entry of readdirSync(contentDir)) {
    if (entry.startsWith('_') || entry.startsWith('.'))
      continue
    if ((BUILT_IN_COLLECTIONS as readonly string[]).includes(entry))
      continue
    // `about` lives in src/content/about, but if a consumer puts a top-level
    // `about` folder in content/ that would collide with the built-in route.
    // Skip with a warning, the consumer needs to rename it.
    if (entry === 'about') {
      skippedFolders.push(entry)
      continue
    }

    const fullPath = resolvePath(contentDir, entry)
    try {
      if (!statSync(fullPath).isDirectory())
        continue
    }
    catch {
      continue
    }

    if (!URL_SAFE_NAME.test(entry)) {
      skippedFolders.push(entry)
      continue
    }

    if (!isEnabled(collectionsConfig, entry, true))
      continue

    dynamicFolders.push(entry)
  }

  return { enabledBuiltIns, dynamicFolders, skippedFolders }
}
