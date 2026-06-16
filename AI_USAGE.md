# AI usage handbook — retypeset-odyssey

A word-for-word reference for AI coding assistants building a blog with
`retypeset-odyssey`. Every config key and frontmatter field below is taken
verbatim from `src/config-schema.ts` and `src/content.config.ts`. Do not
invent keys or fields that are not listed here — the config is validated with
Zod at build time and unknown nesting will surface as an error.

If you are a non-developer who just wants a site, start from
[retypeset-starter](https://github.com/lifeodyssey/retypeset-starter) (*Use
this template* → clone → `pnpm install` → `pnpm dev`).

---

## 1. Setup (consume as an npm package)

A consumer repo needs exactly three things at its root:

`package.json`
```json
{
  "type": "module",
  "dependencies": {
    "astro": "^5",
    "retypeset-odyssey": "github:lifeodyssey/retypeset-odyssey"
  }
}
```

`astro.config.ts`
```ts
import { defineConfig } from 'astro/config'
import retypeset from 'retypeset-odyssey/integration'

export default defineConfig({
  site: 'https://your-domain.dev',
  integrations: [retypeset()],
})
```

`retypeset.config.yaml` — any subset of the keys in section 2; everything
omitted falls back to the theme's `default-config.yaml`.

Then put markdown under `content/` (section 3) and run `pnpm install && pnpm dev`.

The integration loads `default-config.yaml`, deep-merges your
`retypeset.config.yaml` on top, validates with Zod, and exposes the result to
the theme via the virtual module `virtual:retypeset/config`. It also injects
all routes (posts, notes, journals, tags, categories, search, timeline, RSS,
OG images, `robots.txt`, `llms.txt`) — you write content, not pages.

---

## 2. Full config reference (`retypeset.config.yaml`)

Types and defaults are authoritative. `LocalizedString` means **either** a
single string (applied to every language) **or** a per-language map keyed by
locale code.

### `site` (required: `title`, `author`, `url`)
| key | type | default | notes |
|---|---|---|---|
| `title` | string | `Life Odyssey` | site title |
| `subtitle` | LocalizedString | `''` | tagline |
| `description` | string | `''` | SEO + RSS |
| `i18nTitle` | boolean | `true` | fall back to built-in per-language title/subtitle/description when unset |
| `author` | string | `Zhenjia` | |
| `url` | string (URL) | `https://zhenjia.dev` | canonical, no trailing slash |
| `base` | string | `/` | only change when served from a subpath |
| `favicon` | string | `/icons/favicon.svg` | svg/png/ico |

### `color` — `mode: light | dark | auto` (default `light`)
`color.light` and `color.dark` each require `primary`, `secondary`,
`background`, `highlight`. Values are CSS colors (the defaults use `oklch(...)`).

### `global`
| key | type | default |
|---|---|---|
| `locale` | one of `de en es fr ja ko pl pt ru zh zh-tw` | `zh` |
| `moreLocales` | array of locale codes (exclude the default) | `[en, ja]` |
| `fontStyle` | `sans \| serif` | `sans` |
| `dateFormat` | `YYYY-MM-DD \| MM-DD-YYYY \| DD-MM-YYYY \| MMM D YYYY \| D MMM YYYY` | `YYYY-MM-DD` |
| `toc` | boolean | `true` |
| `katex` | boolean | `true` |
| `reduceMotion` | boolean | `false` |

### `comment` (optional, `enabled: false`)
Providers: `giscus` (`repo`, `repoId`, `category`, `categoryId`, `mapping`,
`strict`, `reactionsEnabled`, `emitMetadata`, `inputPosition`), `twikoo`
(`envId`), `waline` (`serverURL`, `emoji`, `search`, `imageUploader`).

### `seo` (optional)
`twitterID`; `verification.{google,bing,yandex,baidu}`; `googleAnalyticsID`
(G-XXXXXXXXXX, not UA-*); `umamiAnalyticsID`; `cloudflareAnalyticsToken`;
`follow.{feedID,userID}`; `apiflashKey`.

### `footer`
`links`: array of `{ name, url }`. `startYear`: integer (first-published year).

### `preload` (optional)
`imageHostURL`, `customGoogleAnalyticsJS`, `customUmamiAnalyticsJS`.

### `collections`
Map keyed by collection name. Each value: `{ enabled?: boolean (default
true), intro?: { <locale>: string } }`. Built-ins `posts`, `notes`,
`journals` are always candidates; disable one with `enabled: false`. Any
extra top-level folder under `content/` becomes its own collection
automatically (section 4).

### `poems` (optional)
Map keyed by locale → array of `{ id, title, author, lines: string[] }`. The
right-rail marginalia pool; `id` must be stable (used for per-visitor
dedupe in localStorage).

---

## 3. Content placement & frontmatter

Put markdown directly under the collection folder. **Translations share one
slug and live in the same folder, distinguished only by filename suffix:**

| language | filename | example |
|---|---|---|
| default locale | `slug.md` | `my-post.md` |
| English | `slug.en.md` | `my-post.en.md` |
| Japanese | `slug.ja.md` | `my-post.ja.md` |

Folders: `content/posts/`, `content/notes/`, `content/journals/` (journals are
single-language by convention). The URL is `/posts/<slug>` (or
`/<lang>/posts/<slug>` for non-default languages); all language versions of a
post share the same `slug`.

### Post / note frontmatter (from `content.config.ts`)
| field | type | default | notes |
|---|---|---|---|
| `title` | string | `''` | **no title ⇒ the entry is treated as a draft** |
| `published` | date | — | preferred date field |
| `date` | date | — | Hexo alias; mapped to `published` if `published` absent |
| `updated` | date | — | |
| `description` | string | `''` | |
| `tags` | string \| string[] | `[]` | a `/` in a tag is URL-encoded (e.g. `CI/CD`) |
| `categories` | string \| string[] | `[]` | user-facing category (e.g. `实用工具`) |
| `draft` | boolean | `false` | excluded from production build |
| `pin` | integer 0–99 | `0` | higher pins to top |
| `toc` | boolean | inherits `global.toc` | |
| `lang` | `'' \| <locale>` | `''` | `''` = universal/default; usually set per file |
| `slug` | `[a-zA-Z0-9-]+` | `''` | **takes priority over `abbrlink`**; decides the URL |
| `abbrlink` | `[a-zA-Z0-9-]*` | `''` | Hexo legacy permalink |
| `copyright` | boolean | `true` | |
| `mathjax` | boolean | `false` | |
| `password` | string | — | |

Unknown frontmatter keys pass through (Hexo migration tolerance), but do not
rely on them rendering.

Example:
```markdown
---
title: How I wired Headroom and cc-switch together
slug: headroom-cc-switch-coexist
tags:
  - Claude Code
  - LLM
categories: 实用工具
date: 2026-06-16 16:30:00
lang: zh
---

Body in markdown. KaTeX and a table of contents are on by default.
```

---

## 4. Folder-based collections

Drop any URL-safe folder under `content/` — e.g. `content/tech/` — and the
integration auto-discovers it: `/tech` becomes the list page and
`/tech/<slug>` the detail pages. No code change. Rules:

- The folder name (verbatim) is both the collection name and the URL segment;
  it must match `[a-zA-Z0-9][a-zA-Z0-9-]*` or it is skipped with a warning.
- Folders prefixed with `_` or `.` are ignored — use `content/_drafts/` for
  in-progress material.
- Opt a folder out with `collections.<name>.enabled: false`; give it a
  per-language tagline with `collections.<name>.intro.{zh,en,ja}`.

---

## 5. Common recipes

**Add a third language (e.g. Korean):** set `global.moreLocales: [en, ja, ko]`.
Then add `slug.ko.md` files. Per-language config strings (`site.subtitle`,
`collections.*.intro`) accept a `ko:` entry.

**Custom brand colors:** override `color.light`/`color.dark` with your four
CSS colors each; keep `mode` as `auto` to follow the OS.

**Turn on giscus comments:** `comment.enabled: true` and fill
`comment.giscus.{repo,repoId,category,categoryId}`.

**Pin a post:** `pin: 1` (or higher) in its frontmatter.

---

## 6. HARD RULES for AI code generation

1. Do **not** invent config keys. Every key you write in
   `retypeset.config.yaml` must appear in section 2.
2. Do **not** invent frontmatter fields. Use only section 3 (extra keys are
   tolerated but ignored).
3. `slug` and `abbrlink` accept **only** `[a-zA-Z0-9-]`. No spaces, slashes,
   or non-ASCII. When both are set, `slug` wins.
4. A post with no `title` becomes a draft and will not publish. Always set a
   title for content you want live.
5. Translations are **same folder, same slug, suffixed filename**
   (`x.md` / `x.en.md` / `x.ja.md`). Never create per-language subfolders.
6. Do **not** add a `description` frontmatter field unless asked — this
   author removed it from all posts (it is still schema-valid, just unused).
7. `moreLocales` must **not** include the default `locale`.
8. Do not hand-write pages/routes for posts, tags, RSS, `llms.txt`, etc. — the
   integration injects them. You only write `content/` and config.
9. Locale codes are limited to `de en es fr ja ko pl pt ru zh zh-tw`.
10. `base` stays `/` unless the site is genuinely served from a subpath.

---

## 7. Minimal boilerplate

A complete consumer repo:

```
my-blog/
├── package.json            # deps: astro + retypeset-odyssey (section 1)
├── astro.config.ts         # integrations: [retypeset()]
├── retypeset.config.yaml   # site.title / author / url at minimum
└── content/
    └── posts/
        └── hello-world.md  # title + slug + date + lang
```

`retypeset.config.yaml` (smallest useful):
```yaml
site:
  title: My Blog
  author: Me
  url: https://my-blog.dev
global:
  locale: en
  moreLocales: []
```

`content/posts/hello-world.md`:
```markdown
---
title: Hello world
slug: hello-world
date: 2026-06-16
lang: en
---

First post.
```

Then: `pnpm install && pnpm dev`. The built site exposes `/llms.txt` and
`/llms-full.txt` automatically.
