# PRD — Hexo → Astro (Retypeset) Migration for `blog.zhenjia.org`

Owner: Zhenjia  
Last updated: 2026-01-13

## 1. Background

Current blog stack:
- Generator: Hexo (`Blog-src/`)
- Content: Markdown posts under `Blog-src/source/_posts/*.md`
- Permanent URLs: `posts/:abbrlink.html` (Hexo `hexo-abbrlink`, CRC32, hex)
- Hosting (current): GitHub Pages at `https://lifeodyssey.github.io/`

Target stack:
- Generator: Astro
- Theme baseline: Retypeset
- Hosting (target): Cloudflare Pages + custom domain `https://blog.zhenjia.org`

Key migration intent:
- **Keep legacy URLs working** (no link rot).
- **Keep content in Markdown** (prefer not changing existing post files).
- Keep “content vs theme/code” separated (similar to Hexo’s separation).

## 2. Goals (Must Have)

### 2.1 URL & Routing Compatibility (Hard Requirement)
- Keep the **exact** legacy permalink format:
  - Default language (zh): `https://blog.zhenjia.org/posts/<abbrlink>.html`
  - Non-default languages: `https://blog.zhenjia.org/<lang>/posts/<abbrlink>.html`
- Output must be real `.html` files, not folders.
- Default language must have **no** language prefix.

### 2.2 Content Format (Hard Requirement)
- Source posts remain **Markdown**.
- **Prefer no changes** to existing Markdown formatting and frontmatter.
- Directory path is allowed to change (e.g. move to `content/posts/`), but content stays Markdown.

### 2.3 Content/Code Separation (Hard Requirement)
- Posts live outside theme/code concerns.
- Theme/code changes should not require editing post files.

### 2.4 Feature Parity (Baseline)
- i18n:
  - Default language: `zh` (no prefix).
  - Additional languages: `en`, `ja` (prefix required).
  - Language switcher shown only when translations exist.
- Search:
  - Switch to **Pagefind** (static full-text search).
- Math:
  - “Compatibility-first” math rendering to match existing Hexo + MathJax usage as much as possible.
- Mermaid:
  - Mermaid diagrams supported (feature parity).
- RSS/Atom + sitemap:
  - Generate feed and sitemap under the new domain.
- Password-protected posts:
  - Preserve `password` frontmatter meaning for encrypted posts (see Security notes).

## 3. Non-goals (For This Phase)
- Redesigning the entire visual system beyond Retypeset’s customization options.
- Rewriting historical posts to fix style issues (except critical broken assets/links).
- Changing permalink schema (must remain compatible).
- Migrating comments data (unless current system needs it).

## 4. Constraints & Risks

### 4.1 Old Domain Redirect Limitations
Old domain is `lifeodyssey.github.io` (a GitHub-owned subdomain). We can’t DNS-control it in Cloudflare.
- Best-effort approach:
  - Keep a “redirect shell site” on GitHub Pages that redirects paths 1:1 to `blog.zhenjia.org`.
  - Keep it for at least 12 months to minimize SEO traffic loss.

### 4.2 Content Hygiene (Known Issues)
Some existing Markdown posts contain:
- Local absolute image paths (e.g. `C:\\...`, `/Users/...`, `file://...`)
- Embedded base64 images

These must be detected and handled:
- Either migrate assets into repository hosting (preferred), or rewrite to remote URLs.
- At minimum: build-time validation that reports offending links.

### 4.3 “Password Post” Security Reality
Static sites cannot truly “hide” content unless content is **encrypted at build time** and decrypted client-side.
- Acceptable baseline:
  - Build-time encryption + client-side decryption using `password` frontmatter.
- Not acceptable:
  - “CSS hide” / “JS hide” while shipping plaintext HTML.

## 5. Proposed Project Structure

Two acceptable options (both keep Markdown):

### Option A (Recommended): Single repo, separate content folder
```
Blog-astro/
  content/
    posts/                # all *.md (unchanged), plus assets if needed
  src/                    # Retypeset theme/code
  public/                 # static assets
```

Implementation note:
- Astro content loader (`glob()`) reads from `./content/posts/**` so Markdown can live outside `src/`.

### Option B (Stronger separation): `content` branch + git worktree
- `content` branch: only Markdown posts/assets
- `main` (or `astro`) branch: Astro + Retypeset code
- `git worktree` mounts `content` branch into `Blog-astro/content/posts`

## 6. Content Model & Mapping (No post edits)

Hexo frontmatter fields observed:
- `title`, `date`, `tags`, `categories`, `abbrlink`, `password`, `mathjax`, plus others

Astro/Retypeset needs a normalized “post key” for routing:
- **Primary key for URL**: `abbrlink` (string, hex)
- `slug` is optional; do not use it for legacy URL generation.

Normalization rules (build-time):
- published date = `date` (fallback to file mtime only if missing)
- lang:
  - `*.en.md` → `en`
  - `*.ja.md` → `ja`
  - otherwise `zh`
- excerpt:
  - convert Hexo `<!-- more -->` to Retypeset excerpt logic (or ignore and use description/frontmatter when present)

## 7. Routing & Output Requirements (Acceptance Criteria)

For a post with `abbrlink: 13a77735`:
- Build output includes:
  - `dist/posts/13a77735.html`
  - (if en translation exists) `dist/en/posts/13a77735.html`
  - (if ja translation exists) `dist/ja/posts/13a77735.html`
- Every generated HTML page:
  - sets canonical URL under `https://blog.zhenjia.org`
  - includes correct `hreflang` alternates when translations exist

## 8. Search (Pagefind) Requirements
- Build generates Pagefind index.
- Search UI:
  - accessible (keyboard, screen reader)
  - respects i18n routing
- Index should exclude:
  - drafts
  - private/encrypted content (unless decrypted client-side is explicitly intended)

## 9. SEO + GEO (LLM-friendly) Best Practices

### 9.1 SEO must-haves
- canonical URLs
- sitemap.xml
- RSS/Atom feed
- OpenGraph/Twitter cards
- structured data (Article/BlogPosting)

### 9.2 “Generative EO” / LLM consumability (Minimal viable set)
- Provide `llms.txt` at site root
  - curated list: About, Start here, recent/best posts, categories/tags pages
- Provide optional `llms-full.txt`
  - larger corpus map (links) or condensed content policy
- Provide optional per-post “markdown view” endpoints
  - must be `noindex` to avoid SEO duplicate content

## 10. Deployment (Cloudflare Pages)

Target: `blog.zhenjia.org`
- Cloudflare Pages builds from Git repo, outputs `dist/`
- Redirect:
  - `<project>.pages.dev` → `blog.zhenjia.org` (301)
  - if `www` is used: unify to one canonical host (301)

## 11. Migration Plan (Phased)

### Phase 0 — Safety checkpoint
- Snapshot current work in git (branch `backup/*`)
- Make a clean baseline branch for re-build

### Phase 1 — Clean baseline + PRD alignment
- Start from upstream Retypeset baseline
- Apply only minimal config needed for:
  - domain (`site.url`)
  - i18n default locale
  - build output `.html`

### Phase 2 — Content ingestion without modifying posts
- Add loader to read posts from `content/posts`
- Implement normalization mapping (abbrlink/lang/date/excerpt)
- Build a small fixture set (3–5 posts) to verify routing

### Phase 3 — Search + RSS + sitemap
- Integrate Pagefind
- Ensure RSS/Atom and sitemap work with `.html` routes and i18n

### Phase 4 — Deployment + migration cutover
- Deploy to Cloudflare Pages under `blog.zhenjia.org`
- Keep old GitHub Pages site as redirect shell (best-effort)
- Set up Search Console + submit sitemap + monitor

## 12. Open Questions
- Math: choose MathJax vs KaTeX pipeline for maximum compatibility; validate against a representative set of math-heavy posts.
- Encrypted posts: confirm whether “encrypted content must not ship in plaintext” is required for all password posts.
- Old site redirect: determine the best feasible redirect approach for `lifeodyssey.github.io` on GitHub Pages.

