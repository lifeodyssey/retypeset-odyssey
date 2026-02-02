# Deployment Scripts

**RECURRING** - These scripts and configurations are used in CI/CD pipelines for automatic deployment.

## Deployment Target

Primary deployment: **Cloudflare Pages**
- URL: blog.zhenjia.org (custom domain)
- Build: Astro static site generation
- CDN: Cloudflare edge network

## CI/CD Workflow

The main deployment is handled by GitHub Actions (`.github/workflows/deploy.yml`):

1. **Trigger**: Push to `main` branch
2. **Build**: `pnpm build` (generates static site)
3. **Deploy**: Upload to Cloudflare Pages via Wrangler

## Environment Variables

Required secrets in GitHub repository settings:
- `CLOUDFLARE_API_TOKEN` - API token with Pages deployment permission
- `CLOUDFLARE_ACCOUNT_ID` - Cloudflare account ID

## Manual Deployment

If needed, manual deployment can be done:

```bash
# Build the site
pnpm build

# Deploy to Cloudflare (requires wrangler CLI and auth)
npx wrangler pages deploy dist --project-name=life-odyssey
```

## Preview Deployments

Pull requests automatically get preview deployments:
- Each PR gets a unique preview URL
- Preview deploys allow testing changes before merge

## Distinction from Migration Scripts

| Aspect | Deployment Scripts | Migration Scripts |
|--------|-------------------|-------------------|
| Location | `scripts/deployment/` + `.github/workflows/` | `scripts/migration/` |
| Frequency | Every push to main | One-time |
| Purpose | Build and deploy site | Convert Hexo content |
| CI/CD | Yes | No |

## Related Files

- `.github/workflows/deploy.yml` - GitHub Actions workflow
- `astro.config.ts` - Astro configuration
- `wrangler.toml` - Cloudflare Wrangler config (if using)
