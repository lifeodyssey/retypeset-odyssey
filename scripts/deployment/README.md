# Deployment Scripts

**RECURRING** - These scripts and configurations are used in CI/CD pipelines for automatic deployment.

## Deployment Target

Primary deployment: **Cloudflare Pages**
- URL: blog.zhenjia.org (custom domain)
- Build: Astro static site generation
- CDN: Cloudflare edge network

## CI/CD Workflow

Primary deployment is handled by **Cloudflare Pages Git integration** from `Blog-astro`.

GitHub Actions in this repo are used for:
1. **Validation** (`.github/workflows/ci.yml`) on push/PR
2. **Emergency direct upload** (`.github/workflows/deploy.yml`) via manual trigger only

## Environment Variables

Required secrets in GitHub repository settings:
- `CLOUDFLARE_API_TOKEN` - API token with Pages deployment permission
- `CLOUDFLARE_ACCOUNT_ID` - Cloudflare account ID

Recommended environment variables:
- `PRIMARY_SITE_URL` - canonical site URL (e.g. `https://zhenjia.org`)
- `PRIMARY_URL_MODE` - primary URL strategy (`slug`)
- `ENABLE_LEGACY_REDIRECTS` - generate `/posts/:abbrlink(.html)` compatibility redirects

## Manual Deployment

If needed, manual deployment can be done from this repo:

```bash
# Build the site
pnpm build

# Deploy to Cloudflare (requires wrangler CLI and auth)
npx wrangler pages deploy dist --project-name=life-odyssey
```

## Preview Deployments

Preview deployments are provided by Cloudflare Pages Git integration (when enabled in Cloudflare project settings).

## Distinction from Migration Scripts

| Aspect | Deployment Scripts | Migration Scripts |
|--------|-------------------|-------------------|
| Location | `scripts/deployment/` + `.github/workflows/` | `scripts/migration/` |
| Frequency | Every push to main | One-time |
| Purpose | Build and deploy site | Convert Hexo content |
| CI/CD | Yes | No |

## Related Files

- `.github/workflows/deploy.yml` - GitHub Actions workflow
- `.github/workflows/ci.yml` - Theme validation workflow
- `astro.config.ts` - Astro configuration
- `wrangler.toml` - Cloudflare Wrangler config (if using)
- `scripts/seo/generate-legacy-redirects.ts` - Generates `public/_redirects` for legacy URL compatibility
- `public/_redirects` - Generated redirect rules shipped with static output
