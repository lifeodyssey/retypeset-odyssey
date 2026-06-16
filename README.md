# Retypeset Odyssey

A fork of [astro-theme-retypeset](https://github.com/radishzzz/astro-theme-retypeset) — extended to work both as a standalone Astro template **and** as an installable npm package for content-only repositories.

Powering [zhenjia.dev](https://zhenjia.dev).

## What's different from upstream

This fork adds the ability to consume the theme as a dependency, so you can keep your content in a separate repository and pull the theme via `pnpm install`. The original "clone and edit" workflow still works unchanged.

| Use case | Approach |
|----------|----------|
| Personal blog, all in one repo | Fork & clone (same as upstream Retypeset) |
| Content repo + reusable theme | Install `retypeset-odyssey` as a dependency |

Other deltas from upstream: trilingual content support (zh / en / ja) with `.en.md` / `.ja.md` filename convention, tag URL encoding (so tags like `CI/CD` work), legacy Hexo `abbrlink` redirects, GitHub Actions translation pipeline.

## Features

- Built with Astro 6 and UnoCSS
- SEO, Sitemap, OpenGraph (with generated cards), RSS, MDX, LaTeX, Mermaid, TOC
- i18n with route-level language switching and per-language tagline / collection-intro overrides
- Light / Dark mode with view transitions
- Pagefind full-text search
- Responsive, typography-first layout
- Folder-based content collections — drop a new folder under `content/` and you get list + detail routes for free
- Agent-ready — ships an `AI_USAGE.md` handbook and a `skill/SKILL.md` Claude Skill, and auto-generates `/llms.txt` + `/llms-full.txt` at build time, so AI coding agents can configure and write for the theme without reading source

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
    "astro": "^6.3.7",
    "retypeset-odyssey": "^0.1.17"
  }
}
```

(You can also pin to the GitHub tarball with `"retypeset-odyssey": "github:lifeodyssey/retypeset-odyssey"` if you want to track an unreleased branch.)

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
  # `subtitle` accepts either a single string (used for all languages) or a
  # per-language map. The map form is recommended for multilingual sites.
  subtitle:
    en: A journey through ideas
    zh: 一段关于想法的旅程
    ja: アイデアの旅
  author: Your Name
  url: https://your-domain.com
global:
  locale: en
  moreLocales: []          # for multilingual sites add e.g. [zh, ja]
footer:
  links:
    - name: RSS
      url: /atom.xml
  startYear: 2024

# Per-collection settings. The built-in `posts`, `notes`, `journals`
# collections are enabled by default. Set `enabled: false` to drop one.
# `intro` is an optional per-language tagline shown under the collection
# title on its list page (e.g. /notes, /journals); if you omit it the
# generic fallback from src/i18n/ui.ts is used instead.
collections:
  notes:
    intro:
      en: My notes
      zh: 我的笔记
      ja: 私のノート
  journals:
    intro:
      en: Personal diary entries
      zh: 个人日记
      ja: 個人的な日記
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
- Injects all theme routes (`posts/[slug]`, `tags/[tag]`, RSS, OG images, `robots.txt`, `/llms.txt`, `/llms-full.txt`, etc.) via Astro's `injectRoute` API.
- Points `publicDir` at the package's own `public/`, so fonts, icons, and other assets ship without copying.

### Configuration reference

The full schema lives in [`src/config-schema.ts`](./src/config-schema.ts) and the defaults in [`default-config.yaml`](./default-config.yaml). Top-level groups: `site`, `color`, `global`, `comment`, `seo`, `footer`, `preload`, `collections`, `poems`. Any field you do not set in your YAML falls back to the default. Validation errors surface at `astro build` time with a clear path into the YAML.

### Folder-based collections

Drop any folder under `content/` (e.g. `content/tech/`) and the integration will auto-discover it, generate `/tech` as the list page and `/tech/<slug>` as detail pages — no code change needed. Folders prefixed with `_` or `.` are ignored, so `content/_drafts/` is a natural place to stash in-progress work. Disable a folder by setting `collections.<name>.enabled: false`, and give it a per-language tagline with `collections.<name>.intro.{zh,en,ja}` just like the built-ins.

## For AI agents

The theme ships its own agent-facing docs, so an AI coding agent can configure
a site and write posts without spelunking through the source:

- **[`AI_USAGE.md`](./AI_USAGE.md)** — a word-for-word handbook: every
  `retypeset.config.yaml` key and every frontmatter field (types + defaults,
  taken verbatim from the Zod schema), common recipes, hard rules, and minimal
  boilerplate. Feed it to any assistant.
- **[`skill/SKILL.md`](./skill/SKILL.md)** — a Claude Skill. Claude Code
  auto-discovers it when you work on a retypeset site; it carries the workflow
  skeleton and points back to `AI_USAGE.md` for detail. Both ship in the
  package (`files` in `package.json`).
- **`/llms.txt` + `/llms-full.txt`** — generated at build time on every
  consumer site (injected Astro endpoints, like `robots.txt`): a
  [llmstxt.org](https://llmstxt.org)-style index of your posts, with full bodies
  inlined in the `-full` variant.

These describe how to *use* the theme; they do not impose a writing voice.

## Customization

- **Site config**: edit `default-config.yaml` (standalone) or write your own `retypeset.config.yaml` next to `astro.config.ts` (package consumers). Any subset of keys is allowed; the rest fall back to the defaults.
- **About pages**: place markdown in `content/about/about-{zh|en|ja}.md` (the `lang` field in the frontmatter picks which language each file belongs to).
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

For a long-form walkthrough of why the migration was structured this way, including the trade-offs around frontmatter compatibility, SEO continuity, and `abbrlink` preservation, see [我是怎么用 AI 把博客从 Hexo 迁到 Astro 的](https://zhenjia.dev/posts/how-i-migrated-blog-with-ai-v3) (Chinese; the migration was originally documented from a non-frontend developer's perspective).

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
