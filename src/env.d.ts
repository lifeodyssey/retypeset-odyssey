/// <reference types="astro/client" />
/// <reference path="../.astro/types.d.ts" />

// Pagefind UI type declaration
interface PagefindUIOptions {
  element: string
  showImages?: boolean
  showSubResults?: boolean
  showEmptyFilters?: boolean
  resetStyles?: boolean
  bundlePath?: string
  debounceTimeoutMs?: number
  mergeIndex?: Array<{ bundlePath: string }>
}

interface PagefindUIConstructor {
  new (options: PagefindUIOptions): PagefindUIInstance
}

interface PagefindUIInstance {
  triggerSearch(term: string): void
  destroy(): void
}

declare const PagefindUI: PagefindUIConstructor
