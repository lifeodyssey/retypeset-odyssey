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

Set up your own minimal Astro project that consumes this theme. One install, one YAML, one line of Astro config.

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
    "astro": "^5.17.1",
    "retypeset-odyssey": "github:lifeodyssey/retypeset-odyssey"
  }
}
```

```ts
// astro.config.ts
import { defineConfig } from 'astro/config'
import retypeset from 'retypeset-odyssey/integration'

export default defineConfig({
  integrations: [retypeset()],
})
```

```yaml
# retypeset.config.yaml — at project root. Any subset of keys; the rest fall back to defaults.
site:
  title: My Blog
  subtitle: Hello world
  author: Your Name
  url: https://your-domain.com
global:
  locale: en
  moreLocales: []
footer:
  links:
    - name: RSS
      url: /atom.xml
  startYear: 2024
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

- Loads `default-config.yaml` (shipped with the package), deep-merges your `retypeset.config.yaml` on top, and validates the result with Zod. The merged config is exposed to the theme via a Vite virtual module (`virtual:retypeset/config`) — every theme file that does `import ... from '@/config'` automatically picks up your overrides without any code change on your side.
- Drives Astro's top-level config from the same YAML: `site`, `base`, `build.format`, `trailingSlash`, `prefetch`, `i18n`, and `image.domains` are all set automatically.
- Registers UnoCSS (with the theme's `uno.config.ts`), MDX, partytown, sitemap, pagefind, and astro-compress — so you do not import any of them yourself.
- Injects all theme routes (`posts/[slug]`, `tags/[tag]`, RSS, OG images, etc.) via Astro's `injectRoute` API.
- Points `publicDir` at the package's own `public/`, so fonts, icons, and other assets ship without copying.

### Configuration reference

The full schema lives in [`src/config-schema.ts`](./src/config-schema.ts) and the defaults in [`default-config.yaml`](./default-config.yaml). Top-level groups: `site`, `color`, `global`, `comment`, `seo`, `footer`, `preload`. Any field you do not set in your YAML falls back to the default. Validation errors surface at `astro build` time with a clear path into the YAML.

## Customization

- **Site config**: edit `default-config.yaml` (standalone) or write your own `retypeset.config.yaml` next to `astro.config.ts` (package consumers). Any subset of keys is allowed; the rest fall back to the defaults.
- **About pages**: place markdown in `src/content/about/about-{zh|en|ja}.md`.
- **Static assets** (favicon, OG logo, fonts): standalone users edit `public/`; package consumers inherit from the installed theme.

## Migrating from Hexo

If you're coming from Hexo (or another markdown-first SSG) and want to bring your existing posts over, this theme ships with a one-off migration helper plus a 301-bridge generator for SEO.

### Quick path

1. **Start from the starter template** — [retypeset-starter](https://github.com/lifeodyssey/retypeset-starter) is a minimal consumer repo (one `package.json`, one `astro.config.ts`, one YAML). Click *Use this template* on GitHub, clone the new repo, then `pnpm install`.

2. **Bring your Hexo posts over with the migration script.** Copy `scripts/migration/migrate-hexo.ts` out of the installed theme into your own repo, edit the two source/target path constants at the top, then:

   ```bash
   pnpm tsx scripts/migrate-hexo.ts
   ```

   It walks every file under your Hexo `source/_posts/`, converts the frontmatter (`date` → `published`, accepts string-or-array `tags`/`categories`, preserves `abbrlink`, drops Hexo-private fields gracefully), and writes the result to `content/posts/`. Multilingual variants use the `.en.md` / `.ja.md` suffix convention.

3. **(Optional) verify abbrlinks weren't lost.** A sibling `validate-abbrlinks.ts` cross-checks every output file's `abbrlink` against the original Hexo source so you can catch silent drops.

4. **Run `pnpm dev`** and click around. If a post fails frontmatter validation, the integration's Zod schema is permissive — most Hexo frontmatter quirks are accepted — but missing `title` or unparseable `date` will surface as a clear error pointing at the file.

### Preserve your SEO

If your Hexo site was deployed under a domain you can't drop (e.g. `username.github.io`), use [`scripts/generate-redirect-pages.mjs`](https://github.com/lifeodyssey/Blog-src/blob/main/scripts/generate-redirect-pages.mjs) (in the content-repo example, not in this package) to generate a per-page 301 bridge: for every old `posts/<abbrlink>.html` URL, it emits a static HTML with `<meta http-equiv="refresh">` + `<link rel="canonical">` pointing at the new domain. Deploy the generated files to the old host and search engine weight transfers over.

### Story version

For a long-form walkthrough of why the migration was structured this way, including the trade-offs around frontmatter compatibility, SEO continuity, and `abbrlink` preservation, see [我是怎么用 AI 把博客从 Hexo 迁到 Astro 的](https://zhenjia.org/posts/how-i-migrated-blog-with-ai-v3) (Chinese; the migration was originally documented from a non-frontend developer's perspective).

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
