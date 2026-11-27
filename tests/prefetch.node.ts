import type { AstroConfig } from 'astro'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'
import retypeset from '../integration.ts'

const cases: { name: string, input: AstroConfig['prefetch'], expected: AstroConfig['prefetch'] }[] = [
  {
    name: 'an unspecified setting keeps viewport prefetch for existing consumers',
    input: undefined,
    expected: { prefetchAll: true, defaultStrategy: 'viewport' },
  },
  { name: 'explicit false disables prefetch', input: false, expected: false },
  { name: 'explicit true retains Astro defaults', input: true, expected: true },
  {
    name: 'a consumer can opt in only selected links with a custom strategy',
    input: { prefetchAll: false, defaultStrategy: 'hover' },
    expected: { prefetchAll: false, defaultStrategy: 'hover' },
  },
  {
    name: 'a partial consumer setting is not filled with theme defaults',
    input: { defaultStrategy: 'tap' },
    expected: { defaultStrategy: 'tap' },
  },
]

for (const { name, input, expected } of cases) {
  test(name, async (t) => {
    const root = await mkdtemp(join(tmpdir(), 'retypeset-prefetch-'))
    t.after(() => rm(root, { recursive: true, force: true }))
    const hook = retypeset().hooks['astro:config:setup']!
    type HookContext = Parameters<typeof hook>[0]
    // This hook only reads root and prefetch from the incoming Astro config.
    const config = { root: pathToFileURL(`${root}/`), prefetch: input } as AstroConfig
    let update: Parameters<HookContext['updateConfig']>[0] | undefined

    const context: Pick<HookContext, 'config' | 'injectRoute' | 'updateConfig'> = {
      config,
      injectRoute() {},
      updateConfig(value) {
        update = value
        return config
      },
    }
    await hook(context as HookContext)

    assert.ok(update, 'the integration must update the Astro configuration')
    assert.deepEqual(update.prefetch, expected)
    assert.deepEqual(config.prefetch, input, 'the incoming configuration must not be mutated')
  })
}
