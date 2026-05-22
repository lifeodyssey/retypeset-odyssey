# Retypeset Odyssey

A fork of [astro-theme-retypeset](https://github.com/radishzzz/astro-theme-retypeset) — extended to work both as a standalone Astro template **and** as an installable npm package for content-only repositories.

Powering [zhenjia.org](https://zhenjia.org).

## What's different from upstream

This fork adds the ability to consume the theme as a dependency, so you can keep your content in a separate repository and pull the theme via `pnpm install`. The original "clone and edit" workflow still works unchanged.

| Use case | Approach |
|----------|----------|
| Personal blog, all in one repo | Fork & clone (same as upstream Retypeset) |
| Content repo + reusable theme | Install `retypeset-odyssey` as a dependency |

Other deltas from upstream: trilingual content support (zh / en / ja) with `.en.md` / `.ja.md` filename convention, tag URL encoding (so tags like `CI/CD` work), legacy Hexo `abbrlink` redirects, GitHub Actions translation pipeline.

## Features

- Built with Astro 5 and UnoCSS
- SEO, Sitemap, OpenGraph (with generated cards), RSS, MDX, LaTeX, Mermaid, TOC
- i18n with route-level language switching
- Light / Dark mode with view transitions
- Pagefind full-text search
- Responsive, typography-first layout

## Usage A — Standalone (fork & clone)

```bash
git clone https://github.com/lifeodyssey/retypeset-odyssey.git
cd retypeset-odyssey
pnpm install
pnpm dev
```

Edit `src/config.ts` for site settings. Put markdown in `content/{posts,notes,journals}/`. Build with `pnpm build`.

## Usage B — As an npm package

Set up your own minimal Astro project that consumes this theme:

```jsonc
// package.json
{
  "name": "my-blog",
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build"
  },
  "dependencies": {
    "retypeset-odyssey": "github:lifeodyssey/retypeset-odyssey",
    "astro": "^5.17.1",
    "canvaskit-wasm": "^0.41.1"
  }
}
```

```ts
// astro.config.ts
import { defineConfig } from 'astro/config'
import retypeset from 'retypeset-odyssey/integration'

export default defineConfig({
  site: 'https://your-domain.com',
  build: { format: 'file' },
  trailingSlash: 'never',
  integrations: [retypeset()],
})
```

```ts
// src/content.config.ts
export { collections } from 'retypeset-odyssey/content-config'
```

Then put markdown directly in your repo:

```
content/
├── posts/
│   ├── article.md          (zh, default)
│   ├── article.en.md       (English)
│   └── article.ja.md       (Japanese)
├── notes/
└── journals/
```

Build:

```bash
pnpm install
pnpm build  # → dist/
```

### What the integration does

- Injects all 18 theme routes (`posts/[slug]`, `tags/[tag]`, RSS, OG images, etc.) via Astro's `injectRoute` API.
- Aliases `@/` to the package's own `src/`, so theme imports resolve correctly when running from a consumer project.
- Points `publicDir` at the package's own `public/`, so fonts, icons, and other assets are bundled without copying.

## Customization

For both usage modes:

- **Site config**: edit `src/config.ts` (standalone) or override the export in your consumer's `astro.config.ts` (TBD — currently config is bundled with the theme).
- **About pages**: place markdown in `src/content/about/about-{zh|en|ja}.md`.
- **Static assets** (favicon, OG logo, fonts): standalone users edit `public/`; package consumers inherit from the installed theme.

## Credits

Forked from [astro-theme-retypeset](https://github.com/radishzzz/astro-theme-retypeset) by [@radishzzz](https://github.com/radishzzz). Upstream inspirations:

- [Typography](https://github.com/moeyua/astro-theme-typography)
- [Fuwari](https://github.com/saicaca/fuwari)
- [Redefine](https://github.com/EvanNotFound/hexo-theme-redefine)
- [AstroPaper](https://github.com/satnaing/astro-paper)
- [heti](https://github.com/sivan/heti)
- [EarlySummerSerif](https://github.com/GuiWonder/EarlySummerSerif)

## License

Same as upstream: MIT (see `LICENSE`).
