# Migration Scripts

**ONE-TIME USE ONLY** - These scripts are for the initial Hexo → Astro migration and should NOT be part of CI/CD pipelines.

## Scripts

### migrate-hexo.ts

Copies and converts blog posts from the Hexo Blog-src repository to Astro format.

**What it does:**
1. Reads markdown files from `Blog-src/source/_posts/`
2. Converts Hexo frontmatter to Astro-compatible format
3. Preserves abbrlinks for URL compatibility
4. Copies to `content/posts/`

**Usage:**
```bash
pnpm tsx scripts/migration/migrate-hexo.ts
```

### validate-abbrlinks.ts

Validates that all abbrlinks are preserved correctly after migration.

**What it does:**
1. Reads all posts in `content/posts/`
2. Extracts abbrlink from frontmatter
3. Compares against original Blog-src posts
4. Reports any missing or changed abbrlinks

**Usage:**
```bash
pnpm tsx scripts/migration/validate-abbrlinks.ts
```

## When to Run

- **migrate-hexo.ts**: Once, at the start of migration project
- **validate-abbrlinks.ts**: After migration to verify URL preservation

## NOT for CI/CD

These scripts read from the local `Blog-src` directory and are designed for one-time migration only. For deployment automation, see `../deployment/` and `../../.github/workflows/`.

## Post-Migration

After successful migration:
1. Verify all posts render correctly
2. Run Playwright tests: `pnpm test`
3. Check URL format matches: `/posts/:abbrlink.html`
4. Archive these scripts (they won't be needed again)
