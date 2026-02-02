#!/bin/bash
# sync-content.sh - Syncs content from Blog-src to Blog-astro
#
# ONE-TIME or CI/CD USE: Run this before `pnpm build`
# This script copies content from Blog-src (the source repo) to Blog-astro (the theme repo)
#
# Usage:
#   ./scripts/sync-content.sh ../Blog-src      # Local development
#   ./scripts/sync-content.sh Blog-src         # In GitHub Actions

set -e

BLOG_SRC=${1:-"../Blog-src"}

echo "================================================"
echo "Content Sync: Blog-src → Blog-astro"
echo "================================================"
echo "Source: $BLOG_SRC"
echo ""

# Verify source exists
if [ ! -d "$BLOG_SRC/source/_posts" ]; then
    echo "❌ Error: Blog-src not found at $BLOG_SRC"
    echo "   Expected: $BLOG_SRC/source/_posts/"
    exit 1
fi

# Count source posts
POST_COUNT=$(find "$BLOG_SRC/source/_posts" -maxdepth 1 -name "*.md" | wc -l | tr -d ' ')
echo "📝 Found $POST_COUNT posts in Blog-src"

# Clear previous content (but keep .gitkeep)
echo ""
echo "🗑️  Clearing previous content..."
find content/posts -mindepth 1 -not -name ".gitkeep" -delete 2>/dev/null || true

# Copy posts (not drafts)
echo "📋 Copying posts..."
cp -r "$BLOG_SRC/source/_posts/"* content/posts/ 2>/dev/null || true

# Copy asset folders (folders inside _posts/)
ASSET_FOLDERS=$(find "$BLOG_SRC/source/_posts" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')
echo "📁 Copied $ASSET_FOLDERS asset folders"

# Copy about page
echo "📄 Copying about page..."
if [ -f "$BLOG_SRC/source/about/index.md" ]; then
    cp "$BLOG_SRC/source/about/index.md" content/about.md 2>/dev/null || true
    echo "   ✓ about.md"
else
    echo "   ⚠ No about page found"
fi

# Copy robots.txt
echo "🤖 Copying robots.txt..."
if [ -f "$BLOG_SRC/source/robots.txt" ]; then
    cp "$BLOG_SRC/source/robots.txt" public/robots.txt 2>/dev/null || true
    echo "   ✓ robots.txt"
else
    echo "   ⚠ No robots.txt found"
fi

# Final count
SYNCED_COUNT=$(find content/posts -maxdepth 1 -name "*.md" | wc -l | tr -d ' ')
echo ""
echo "================================================"
echo "✅ Sync complete!"
echo "   Posts synced: $SYNCED_COUNT"
echo "   Asset folders: $ASSET_FOLDERS"
echo "================================================"
echo ""
echo "Next: Run 'pnpm build' to generate the site"
