---
name: retypeset-odyssey
description: >-
  Scaffold, configure, and write content for a blog built on the
  retypeset-odyssey Astro theme (a fork of astro-theme-retypeset that also
  works as an installable npm package). Use when setting up a new
  retypeset-odyssey site, writing retypeset.config.yaml, adding posts/notes/
  journals or folder-based collections, fixing frontmatter, migrating a Hexo
  blog, or working in a repo that depends on github:lifeodyssey/retypeset-odyssey.
---

# retypeset-odyssey

A content-only Astro theme: the consumer keeps markdown + one YAML + one
`astro.config.ts`; the theme's integration injects every route. An agent's job
is to wire config and place content correctly — never to hand-write pages.

## Authoritative reference

`AI_USAGE.md` (shipped beside this skill in the package) is the word-for-word
config and frontmatter reference. Read it before generating YAML or
frontmatter. The schema is enforced by Zod at build time, so guessed keys fail
the build.

## Scaffold a new site

Three root files, then content:

1. `package.json` — depend on `astro` and
   `"retypeset-odyssey": "github:lifeodyssey/retypeset-odyssey"`.
2. `astro.config.ts` — `integrations: [retypeset()]` from
   `retypeset-odyssey/integration`, plus `site:`.
3. `retypeset.config.yaml` — at minimum `site.title`, `site.author`,
   `site.url`; everything else deep-merges over `default-config.yaml`.

Fastest path for a fresh project: start from
[retypeset-starter](https://github.com/lifeodyssey/retypeset-starter).

## Write content

- Folders: `content/posts/`, `content/notes/`, `content/journals/`; any other
  URL-safe folder under `content/` auto-becomes a collection (`/<folder>`).
- **Translations share one slug, same folder, suffixed filename:**
  `x.md` (default locale) / `x.en.md` / `x.ja.md`.
- Required-ish frontmatter: `title` (no title ⇒ draft), `slug`
  (`[a-zA-Z0-9-]+`, decides the URL), `date`, `lang`. Full field list in
  `AI_USAGE.md` §3.

## Hard rules (see AI_USAGE.md §6 for the full list)

1. Never invent config keys or frontmatter fields — only what `AI_USAGE.md`
   lists. Zod rejects the rest.
2. `slug`/`abbrlink` accept only `[a-zA-Z0-9-]`; `slug` wins over `abbrlink`.
3. Translations = same slug + filename suffix, never per-language subfolders.
4. `moreLocales` excludes the default `locale`.
5. Don't hand-write routes for posts/tags/RSS/`llms.txt` — the integration
   injects them; you only touch `content/` and the YAML.
6. Don't add a `description` frontmatter field unless asked (unused by this author).

## Verify

`pnpm install && pnpm dev` (runs `astro check`). Frontmatter or config errors
point at the offending file. The built site serves `/llms.txt` and
`/llms-full.txt` automatically.
