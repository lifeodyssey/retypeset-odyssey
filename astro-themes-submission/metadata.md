# Astro Themes Catalog Submission

Materials for submitting `retypeset-odyssey` to <https://astro.build/themes/> when submissions reopen.

## Theme name

**Retypeset Odyssey**

## Tagline (one line, ≤80 chars)

A typography-first blog theme with trilingual i18n, MDX, and Cloudflare Pages deploy.

## Description (full, ~120 words)

Retypeset Odyssey is a typography-first Astro theme for personal blogs that want to
take their reading experience seriously. It ships with i18n support for Chinese,
English, and Japanese; MDX so you can drop React/Astro components into any post; KaTeX
for math; Mermaid for diagrams; Pagefind for full-text search; and OG image generation
out of the box.

It's distributed as a single npm package that exposes everything through one Astro
integration. Consumers write a `retypeset.config.yaml` and a 3-line `astro.config.ts` —
no template forking required. It's a fork of [astro-theme-retypeset](https://github.com/radishzzz/astro-theme-retypeset),
extended for trilingual content, automatic Hexo `abbrlink` redirects, slash-safe
URL-encoded tags, and a build pipeline tuned for Cloudflare Pages.

## Categories

- Blog
- Multilingual / i18n
- Typography
- Personal

## Tags

`blog`, `i18n`, `multilingual`, `chinese`, `mdx`, `katex`, `mermaid`, `pagefind`,
`typography`, `cloudflare-pages`, `retypeset`, `hexo-migration`

## License

MIT (inherited from upstream radishzzz/astro-theme-retypeset)

## URLs

- **GitHub**: <https://github.com/lifeodyssey/retypeset-odyssey>
- **npm**: <https://www.npmjs.com/package/retypeset-odyssey> (pending publish)
- **Demo**: <https://zhenjia.org>
- **Starter template**: <https://github.com/lifeodyssey/retypeset-starter> (pending creation)

## Astro version compatibility

- Astro 5.x ✅ (current)
- Astro 6.x ⏳ (upgrade in progress)

## Author

Zhenjia Zhou ([@lifeodyssey](https://github.com/lifeodyssey))

## Screenshots (TODO)

Once the submission flow reopens, capture these at 1440×900 (or whatever resolution
the form requests):

1. **Homepage**: posts list in default theme (light mode), showing typography +
   sidebar + tag/category pills.
2. **Single post page**: a Chinese post with KaTeX block, code block, and Mermaid
   diagram, so reviewers see the full feature surface.
3. **Multilingual switcher**: same post viewed in zh / en / ja, side-by-side or as
   one screenshot showing the language toggle.
4. **Tag page**: `/tags/AI` showing the tag header + filtered post list.
5. **Dark mode**: homepage in dark theme.

Use real content from zhenjia.org. Mask any personal info that shouldn't be in a
public marketing screenshot (none expected, but check).

## What to highlight in the description vs upstream Retypeset

Things only this fork has:

- **Real trilingual i18n** (zh/en/ja) tested with 225 posts of actual content
- **One-package install** as Astro integration (no clone + edit + manual config)
- **YAML config** instead of TS object editing
- **Hexo migration support**: `migrate-hexo.ts` + `abbrlink` 301 bridge
- **Slash-safe tags** (e.g., `CI/CD` works without breaking routing)
- **Cloudflare Pages-tuned** deploy pipeline
- **AI-friendly** (Astro MCP server compatible, content schema designed for
  LLM-assisted authoring)

Things shared with upstream:

- Typography + reading experience
- Pagefind, KaTeX, Mermaid, MDX, OG images
- Light/dark mode + view transitions
