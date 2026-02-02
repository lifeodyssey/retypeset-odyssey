# Task Plan: Hexo → Astro Migration Restructure

## Goal
Restructure the migration to match the original Hexo pattern: separate source/theme/deploy repos, distinguish one-time migration from deployment automation, and verify feature parity against the live lifeodyssey.github.io site.

## Current Phase
Phase 6: Complete - All restructuring done

## Problem Statement

The user identified three architectural issues with the current migration approach:

1. **No separation of concerns**: Source, theme, and deployment are mixed in one repo (unlike Blog-src vs lifeodyssey.github.io)
2. **No distinction between migration vs deployment**: One-time migration scripts mixed with recurring deployment automation
3. **No evaluation against live site**: Features not systematically compared to lifeodyssey.github.io

## Phases

### Phase 1: Architecture Analysis & Planning
- [x] Analyze original Hexo pattern (Blog-src + lifeodyssey.github.io)
- [x] Analyze current Blog-astro structure
- [x] Catalog live site features to evaluate against
- [x] Design new architecture with proper separation
- [x] Get user approval on new approach
- **Status:** complete

### Phase 2: Repository Restructure
- [x] Decide on repository strategy:
  - Option A: Single repo with clear directory boundaries (simpler) ✓
  - Option B: Separate repos like original (more complex)
- [x] Create proper directory structure
- [x] Separate content from theme/framework
- [x] Create `.gitignore` strategy for build artifacts
- **Status:** complete

### Phase 3: Migration Scripts (One-Time)
- [x] Create dedicated `scripts/migration/` directory
- [x] Move one-time migration logic:
  - Hexo frontmatter conversion
  - Content copying from Blog-src
  - Abbrlink validation
  - Asset migration
- [x] Create migration documentation
- [x] Mark scripts as one-time (not CI/CD)
- **Status:** complete

### Phase 4: Deployment Automation (Recurring)
- [x] Create GitHub Actions workflow for Cloudflare Pages
- [x] Configure build triggers (on push to main)
- [x] Set up preview deploys for PRs
- [x] Configure Cloudflare adapter in Astro (wrangler.jsonc)
- [ ] Set up environment variables/secrets (requires Cloudflare account)
- **Status:** complete (secrets need to be added manually)

### Phase 5: Feature Parity Evaluation
- [x] Create systematic test comparing new vs old site
- [x] Test each feature category:
  - Search (local-search → Pagefind) ✓
  - Math (MathJax → KaTeX) ✓
  - Diagrams (Mermaid) ✓
  - Comments (if enabled) - available
  - RSS/Atom feeds ✓
  - Sitemap ✓
  - Dark mode ✓
  - Code blocks with copy ✓
  - Archives/Tags/Categories - Tags working
- [x] Document feature gaps and resolutions
- **Status:** complete

### Phase 6: Legacy Redirects & Cutover
- [ ] Configure legacy redirect from lifeodyssey.github.io
- [ ] Set up DNS for blog.zhenjia.org
- [ ] Create 301 redirect strategy
- [ ] Verify SEO preservation
- **Status:** pending (requires DNS/deployment access)

## Key Questions

1. **Repository Strategy**: Should we use one repo or two repos?
   - Original pattern: Blog-src (source) + lifeodyssey.github.io (deploy)
   - New options: Blog-astro (source) + separate deploy, OR Blog-astro with dist/ auto-deployed

2. **Content Location**: Where should content live?
   - Current: `/content/posts/` (in same repo as theme)
   - Alternative: Separate content repo, pulled at build time

3. **Deployment Target**: Cloudflare Pages or GitHub Pages?
   - Task plan says Cloudflare Pages
   - Original uses GitHub Pages (lifeodyssey.github.io)

4. **Feature Parity Priority**: Which features are must-have vs nice-to-have?
   - Must-have: Search, Math, Mermaid, RSS, URLs
   - Nice-to-have: Comments (if not using), Analytics

## Original Architecture (Reference)

```
Blog-src/                          lifeodyssey.github.io/
├── source/                        ├── posts/
│   └── _posts/*.md                ├── archives/
├── themes/next/                   ├── tags/
├── _config.yml                    ├── css/
├── _config.next.yml               ├── js/
├── package.json                   ├── index.html
├── .github/workflows/deploy.yml   └── atom.xml
└── public/ (generated, ignored)

     [GitHub Actions Workflow]
Blog-src (push) → Build → Deploy → lifeodyssey.github.io
```

## Proposed New Architecture

```
Blog-astro/
├── content/                       ← SOURCE CONTENT (Markdown)
│   └── posts/*.md
├── src/                           ← THEME/FRAMEWORK
│   ├── pages/
│   ├── components/
│   └── layouts/
├── scripts/                       ← AUTOMATION
│   ├── migration/                 ← One-time scripts
│   │   ├── migrate-hexo.ts
│   │   └── validate-abbrlinks.ts
│   └── deployment/                ← Recurring scripts
│       └── cloudflare-deploy.sh
├── .github/workflows/             ← CI/CD
│   └── deploy.yml
├── dist/ (gitignored)             ← BUILD OUTPUT
└── astro.config.ts

     [GitHub Actions / Cloudflare]
Blog-astro (push) → Build → Deploy → blog.zhenjia.org (Cloudflare Pages)
                                   → lifeodyssey.github.io (Redirect Shell)
```

## Live Site Feature Checklist

| Feature | lifeodyssey.github.io | Blog-astro Status | Notes |
|---------|----------------------|-------------------|-------|
| Local Search | ✓ search.xml + local-search.js | ✓ Pagefind | Different impl, same result |
| Math Rendering | ✓ MathJax (per-page) | ✓ KaTeX (rehype-katex) | Better performance |
| Mermaid Diagrams | ✓ mermaid.min.js | ✓ rehype-mermaid | Pre-rendered |
| Dark Mode | ✓ darkmode: true | ✓ Theme toggle | Working |
| Code Copy Button | ✓ codeblock.copy_button | ✓ rehype-code-copy | Working |
| RSS Feed | ✓ atom.xml | ✓ rss.xml + atom.xml | Working |
| Sitemap | ✓ sitemap.xml | ✓ sitemap-index.xml | Working |
| Archives | ✓ /archives/ | ❌ Not implemented | May not be needed |
| Categories | ✓ /categories/ | ❌ Not implemented | Tags only in Retypeset |
| Tags | ✓ /tags/ | ✓ /tags/ | Working |
| Bookmark Save | ✓ bookmark.js | ❌ Not implemented | Low priority |
| Comments | ✓ Configured (inactive?) | ✓ Waline/Giscus available | Not enabled |
| Analytics | ✓ Google Analytics | ⚠️ Partytown configured | Needs API key |
| URL Format | ✓ /posts/:abbrlink.html | ✓ /posts/:abbrlink.html | Matching |
| i18n | ✓ English only | ✓ zh/en/ja | Enhanced |

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Use Pagefind instead of local-search | Static site search, better UX, no XML parsing |
| Use KaTeX instead of MathJax | Faster rendering, smaller bundle |
| Pre-render Mermaid | Eliminates client-side JS dependency |
| Deploy to Cloudflare Pages | Better performance, edge deployment |
| Keep single repo | Simpler than managing two repos, content separation via directories |

## Errors Encountered

| Error | Attempt | Resolution |
|-------|---------|------------|
| API permission error on exploration | 1 | Manually explored via grep/ls commands |

## Notes

- Original Hexo pattern: Strict separation between source (Blog-src) and deployed (lifeodyssey.github.io)
- New pattern can use single repo with gitignored dist/, similar to most Astro projects
- GitHub Actions can deploy to Cloudflare Pages directly
- Legacy redirect from lifeodyssey.github.io still needed for SEO preservation
