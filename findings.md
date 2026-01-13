# Findings & Decisions

## Requirements (from PRD.md)

### Hard Requirements
- **URL Compatibility:** Exact legacy permalink format `/posts/:abbrlink.html`
- **Default language (zh):** No language prefix
- **Non-default languages (en, ja):** Require prefix (`/en/`, `/ja/`)
- **Output:** Real `.html` files, not folders
- **Content format:** Markdown, prefer no changes to existing posts
- **Content/code separation:** Posts live outside theme concerns

### Feature Parity Requirements
- i18n with language switcher (only when translations exist)
- Pagefind static search
- Math rendering (MathJax compatibility)
- Mermaid diagrams
- RSS/Atom + sitemap
- Password-protected posts (build-time encryption required)

### Non-Goals
- Visual system redesign
- Rewriting historical posts
- Changing permalink schema
- Comment data migration

## Research Findings

### Astro Configuration for .html URLs
Source: [Astro Configuration Reference](https://docs.astro.build/en/reference/configuration-reference/)

Key settings for `.html` extension URLs:
```typescript
export default defineConfig({
  build: { format: 'file' },  // Generates /about.html instead of /about/index.html
  trailingSlash: 'never',     // Recommended with build.format: 'file'
});
```

**Warning:** Using `build.format: 'file'` with `trailingSlash: 'always'` causes issues.

### Retypeset Theme Structure
Source: [GitHub - radishzzz/astro-theme-retypeset](https://github.com/radishzzz/astro-theme-retypeset)

**Key files:**
- `src/config.ts` - Main configuration
- `src/content/posts/` - Default post location
- `astro.config.ts` - Astro settings

**Frontmatter fields supported:**
- Required: `title`, `published` (YYYY-MM-DD)
- Optional: `description`, `updated`, `tags`, `draft`, `pin`, `toc`, `lang`, `abbrlink`

**i18n configuration:**
```typescript
// src/config.ts
locale: 'zh',           // Primary language (no URL prefix)
moreLocales: ['en', 'ja'], // Additional languages (with prefix)
```

**Custom URL via abbrlink:**
Setting `abbrlink: 'banana'` changes URL from `/posts/2025/03/apple/` to `/posts/banana/`

### Hexo Frontmatter Analysis
From examining existing posts:

```yaml
---
title: 新的春天
tags: 随便写写
categories: 梦里真真语真幻
abbrlink: 6ef15720
date: 2024-03-03 18:34:45
mathjax: true  # Optional, for math posts
copyright: true
password: "xxx"  # Optional, for protected posts
---
```

**Mapping to Retypeset:**
| Hexo Field | Retypeset Field | Notes |
|------------|-----------------|-------|
| `title` | `title` | Direct |
| `date` | `published` | Format change YYYY-MM-DD |
| `tags` | `tags` | Array format |
| `categories` | N/A | Retypeset uses tags only |
| `abbrlink` | `abbrlink` | Direct - use for URL |
| `mathjax` | Custom handling | Enable KaTeX |
| `password` | Custom handling | Build-time encryption |

### Pagefind Integration
Source: [astro-pagefind GitHub](https://github.com/shishkin/astro-pagefind)

```typescript
// astro.config.ts
import pagefind from 'astro-pagefind';

export default defineConfig({
  integrations: [pagefind()],
});
```

- Runs automatically after build
- Indexes all static HTML
- 41K weekly downloads
- Dev mode requires copying pagefind files from `dist/` to `public/`

### Cloudflare Pages Deployment
Source: [Astro Cloudflare Deployment Guide](https://docs.astro.build/en/guides/deploy/cloudflare/)

**For static sites (no SSR):**
1. Push to GitHub
2. Create Cloudflare Pages project
3. Configure:
   - Build command: `pnpm build`
   - Output directory: `dist`
4. Set custom domain

**Important:** Disable Auto Minify to prevent hydration issues.

### Playwright MCP Testing
Source: [Playwright MCP Guide](https://testdino.com/blog/playwright-mcp/)

**Visual regression testing:**
```typescript
test("home page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveScreenshot();
});
```

**Best practices:**
- First run creates baseline snapshots
- CI may have different fonts - use consistent Docker image
- Use accessibility selectors, not CSS selectors

## Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Use `build.format: 'file'` | Required for `/posts/xxx.html` URL format |
| Use `trailingSlash: 'never'` | Recommended pairing with file format |
| Content in `content/posts/` | Option A from PRD, simpler than git worktree |
| KaTeX for math | Better Astro integration than MathJax |
| astro-pagefind for search | Official integration, automatic indexing |
| Custom content loader | Needed to map Hexo frontmatter to Retypeset schema |

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| Retypeset uses `published` not `date` | Create Zod schema with date coercion |
| Categories not supported in Retypeset | Optionally convert categories to tags |
| `.html` extension not default in Astro | Use `build.format: 'file'` setting |

## Resources

### Official Documentation
- [Astro Configuration Reference](https://docs.astro.build/en/reference/configuration-reference/)
- [Astro i18n Routing](https://docs.astro.build/en/guides/internationalization/)
- [Retypeset Theme Guide](https://retypeset.radishzz.cc/en/posts/theme-guide/)
- [Retypeset GitHub](https://github.com/radishzzz/astro-theme-retypeset)
- [Pagefind](https://pagefind.app/)
- [Cloudflare Pages Astro Guide](https://docs.astro.build/en/guides/deploy/cloudflare/)

### Project Paths
- Hexo source: `/Users/zhenjiazhou/Documents/blog/Blog-src/`
- Posts: `/Users/zhenjiazhou/Documents/blog/Blog-src/source/_posts/`
- New Astro project: `/Users/zhenjiazhou/Documents/blog/Blog-astro/` (or `/Users/zhenjiazhou/Documents/blog/Blog-astro/`)

### Stats
- Total posts: 192
- Posts with math: Several (identified via `mathjax: true`)
- Posts with password: Several (identified via `password:` field)

## Visual/Browser Findings

### Retypeset Demo Site
- Clean typography-focused design
- Supports dark/light mode
- Language switcher in header
- Table of contents on posts
- Tags displayed, no categories

### Current Hexo Site (lifeodyssey.github.io)
- Uses NexT theme
- Chinese as primary language
- Math formulas rendered via MathJax
- Search via hexo-generator-search
- Posts have CRC32 hex abbrlinks

---
*Update this file after every 2 view/browser/search operations*
*This prevents visual information from being lost*
