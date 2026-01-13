# Task Plan: Hexo → Astro (Retypeset) Migration

## Goal
Migrate blog.zhenjia.org from Hexo to Astro using the Retypeset theme while preserving all 192 posts, maintaining exact legacy URLs (`posts/:abbrlink.html`), and deploying to Cloudflare Pages.

## Current Phase
Phase 0

## Phases

### Phase 0: Safety Checkpoint & Baseline
- [ ] Create backup branch of existing work
- [ ] Document current state of Blog-astro attempts
- [ ] Clone fresh Retypeset baseline
- **Status:** pending
- **Spike Solution:** `git checkout -b backup/pre-migration && git push origin backup/pre-migration`
- **Acceptance Criteria:**
  - Backup branch exists and is pushed to remote
  - Fresh Retypeset clone builds successfully with `pnpm build`

### Phase 1: Astro Project Setup & Configuration
- [ ] Initialize Astro project from Retypeset template
- [ ] Configure `astro.config.ts` for:
  - `build.format: 'file'` (generates `.html` files)
  - `trailingSlash: 'never'`
  - `site: 'https://blog.zhenjia.org'`
- [ ] Configure i18n in `src/config.ts`:
  - `locale: 'zh'` (default, no prefix)
  - `moreLocales: ['en', 'ja']`
- [ ] Verify build output produces `.html` files
- **Status:** pending
- **Spike Solution:**
  ```typescript
  // astro.config.ts critical settings
  export default defineConfig({
    site: 'https://blog.zhenjia.org',
    build: { format: 'file' },
    trailingSlash: 'never',
    // ... rest of config
  });
  ```
- **Acceptance Criteria:**
  - `pnpm build` succeeds
  - Output files are `dist/posts/xxx.html` not `dist/posts/xxx/index.html`
  - Default language pages have no `/zh/` prefix

### Phase 2: Content Loader & Frontmatter Normalization
- [ ] Create custom content loader for `content/posts/`
- [ ] Map Hexo frontmatter to Retypeset schema:
  - `abbrlink` → URL slug (primary key)
  - `date` → `published`
  - `tags` → `tags`
  - `categories` → handle gracefully (Retypeset uses tags only)
  - `mathjax` → enable KaTeX when true
  - `password` → flag for encryption
- [ ] Handle language detection from filename (`*.en.md`, `*.ja.md`)
- [ ] Convert `<!-- more -->` to excerpt handling
- **Status:** pending
- **Spike Solution:**
  ```typescript
  // src/content/config.ts
  const posts = defineCollection({
    loader: glob({ pattern: '**/*.md', base: './content/posts' }),
    schema: z.object({
      title: z.string(),
      abbrlink: z.string(), // Primary key for URL
      date: z.coerce.date(),
      tags: z.array(z.string()).optional(),
      categories: z.array(z.string()).optional(),
      mathjax: z.boolean().optional(),
      password: z.string().optional(),
    }),
  });
  ```
- **Acceptance Criteria:**
  - All 192 posts load without errors
  - Posts accessible via `/posts/{abbrlink}.html`
  - Frontmatter fields correctly mapped

### Phase 3: Custom Routing for Legacy URLs
- [ ] Create dynamic route `src/pages/posts/[slug].astro`
- [ ] Generate `.html` extension URLs from `abbrlink`
- [ ] Implement i18n routing:
  - `/posts/{abbrlink}.html` for zh (default)
  - `/en/posts/{abbrlink}.html` for English
  - `/ja/posts/{abbrlink}.html` for Japanese
- [ ] Add canonical URLs and hreflang alternates
- **Status:** pending
- **Spike Solution:**
  ```astro
  ---
  // src/pages/posts/[...slug].astro
  import { getCollection } from 'astro:content';

  export async function getStaticPaths() {
    const posts = await getCollection('posts');
    return posts.map(post => ({
      params: { slug: post.data.abbrlink },
      props: { post },
    }));
  }
  ---
  ```
- **Acceptance Criteria:**
  - URL `https://blog.zhenjia.org/posts/13a77735.html` renders correctly
  - Canonical URL set correctly
  - hreflang tags present when translations exist

### Phase 4: Content Asset Migration & Validation
- [ ] Copy posts from `Blog-src/source/_posts/` to `content/posts/`
- [ ] Detect and report problematic assets:
  - Local absolute paths (`C:\`, `/Users/`, `file://`)
  - Base64 embedded images
  - Broken external URLs
- [ ] Create asset migration script
- [ ] Move post asset folders alongside posts
- **Status:** pending
- **Spike Solution:**
  ```bash
  # Detect problematic paths
  grep -rn "file://\|C:\\\|/Users/" content/posts/
  grep -rn "data:image" content/posts/ | head -20
  ```
- **Acceptance Criteria:**
  - All posts copied to `content/posts/`
  - Report generated listing problematic assets
  - At least 90% of images load correctly

### Phase 5: Feature Parity Implementation
- [ ] **Search:** Integrate Pagefind (`astro-pagefind`)
- [ ] **Math:** Configure KaTeX for MathJax compatibility
- [ ] **Mermaid:** Enable Mermaid diagram support
- [ ] **RSS/Sitemap:** Configure feeds for new domain
- [ ] **Password Posts:** Implement build-time encryption
- **Status:** pending
- **Spike Solution:**
  ```typescript
  // astro.config.ts
  import pagefind from 'astro-pagefind';

  export default defineConfig({
    integrations: [pagefind()],
    // ...
  });
  ```
- **Acceptance Criteria:**
  - Search UI works and respects i18n
  - Math formulas render correctly (test against math-heavy posts)
  - Mermaid diagrams render
  - RSS feed accessible at `/feed.xml`
  - Sitemap at `/sitemap.xml`

### Phase 6: SEO & LLM-Friendly Features
- [ ] Verify OpenGraph/Twitter cards
- [ ] Add structured data (Article/BlogPosting)
- [ ] Create `llms.txt` at site root
- [ ] Optional: Create `llms-full.txt`
- [ ] Optional: Per-post markdown endpoints (noindex)
- **Status:** pending
- **Acceptance Criteria:**
  - OG tags present on all posts
  - `llms.txt` accessible at root
  - Schema.org markup validates

### Phase 7: Local Build & Playwright Evaluation
- [ ] Full production build (`pnpm build`)
- [ ] Serve locally (`pnpm preview`)
- [ ] Playwright tests:
  - URL structure verification (`.html` extension)
  - i18n routing (language prefix tests)
  - Search functionality
  - Visual regression snapshots
  - Mobile responsiveness
  - Dark/light mode toggle
- **Status:** pending
- **Spike Solution:**
  ```typescript
  // tests/migration.spec.ts
  import { test, expect } from '@playwright/test';

  test('legacy URL format preserved', async ({ page }) => {
    await page.goto('/posts/13a77735.html');
    expect(page.url()).toContain('.html');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('i18n routing works', async ({ page }) => {
    await page.goto('/en/posts/13a77735.html');
    expect(page.url()).toContain('/en/');
  });

  test('search functionality', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-search-toggle]');
    await page.fill('input[type="search"]', 'test');
    await expect(page.locator('.pagefind__result')).toBeVisible();
  });
  ```
- **Acceptance Criteria:**
  - All Playwright tests pass
  - Visual regression baselines captured
  - No console errors on page load
  - Lighthouse score > 90 for Performance

### Phase 8: Cloudflare Pages Deployment
- [ ] Create Cloudflare Pages project
- [ ] Configure build settings:
  - Build command: `pnpm build`
  - Output directory: `dist`
- [ ] Set up custom domain `blog.zhenjia.org`
- [ ] Configure redirects:
  - `*.pages.dev` → `blog.zhenjia.org` (301)
- [ ] Disable Auto Minify (prevents hydration issues)
- **Status:** pending
- **Acceptance Criteria:**
  - Site accessible at `blog.zhenjia.org`
  - HTTPS working
  - All redirects functioning
  - Automatic deploys on git push

### Phase 9: Legacy Site Redirect Shell
- [ ] Create minimal redirect site for `lifeodyssey.github.io`
- [ ] Implement 1:1 path redirects to `blog.zhenjia.org`
- [ ] Deploy to GitHub Pages
- [ ] Monitor for 12 months
- **Status:** pending
- **Spike Solution:**
  ```html
  <!-- index.html for GitHub Pages redirect shell -->
  <!DOCTYPE html>
  <html>
  <head>
    <script>
      const newHost = 'https://blog.zhenjia.org';
      window.location.href = newHost + window.location.pathname + window.location.search;
    </script>
    <meta http-equiv="refresh" content="0;url=https://blog.zhenjia.org">
  </head>
  </html>
  ```
- **Acceptance Criteria:**
  - `lifeodyssey.github.io/posts/xxx.html` redirects to `blog.zhenjia.org/posts/xxx.html`
  - SEO traffic preserved during transition

### Phase 10: Post-Migration Monitoring
- [ ] Submit sitemap to Google Search Console
- [ ] Monitor 404 errors
- [ ] Track SEO rankings
- [ ] Address any broken links
- **Status:** pending
- **Acceptance Criteria:**
  - Sitemap indexed by Google
  - 404 rate < 1%
  - No significant ranking drops after 30 days

## Key Questions
1. **Math rendering:** KaTeX vs MathJax - which provides better Hexo compatibility?
2. **Password posts:** Is build-time encryption required, or is CSS hiding acceptable?
3. **Categories:** How to handle Hexo categories in Retypeset (tags only)?
4. **Asset hosting:** Move images to repo or keep external URLs?

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Use Retypeset theme | PRD requirement, modern typography focus |
| `build.format: 'file'` | Required for `.html` extension URLs |
| Pagefind for search | Static, no infrastructure, PRD requirement |
| Content in `content/posts/` | Keeps separation per Option A in PRD |
| KaTeX over MathJax | Better Astro integration, faster rendering |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
|       | 1       |            |

## Notes
- Total posts to migrate: 192
- Many posts use CJK (Chinese/Japanese) characters
- Some posts have math content requiring KaTeX
- Post assets stored in folders with same name as post
- Update phase status as you progress: pending → in_progress → complete
