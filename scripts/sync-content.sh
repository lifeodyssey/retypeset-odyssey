#!/bin/bash
# sync-content.sh - Sync content from Blog-src into Blog-astro
#
# Supports two source layouts:
# 1) Structured (preferred):
#    source/_posts/{posts|notes|journals}/{zh|en|ja}/...
# 2) Legacy flat:
#    source/_posts/*

set -euo pipefail

BLOG_SRC=${1:-"../Blog-src"}
COLLECTIONS=(posts notes journals)
LANGS=(zh en ja)

normalize_target_name() {
  local file_name="$1"
  local lang="$2"
  local ext="${file_name##*.}"
  local stem="${file_name%.*}"

  if [[ "$ext" != "md" && "$ext" != "mdx" ]]; then
    echo "$file_name"
    return
  fi

  if [[ "$lang" == "zh" ]]; then
    echo "$file_name"
    return
  fi

  if [[ "$lang" == "en" ]]; then
    if [[ "$stem" == *.en ]]; then
      echo "$file_name"
    elif [[ "$stem" == *-en ]]; then
      echo "${stem%-en}.en.${ext}"
    else
      echo "${stem}.en.${ext}"
    fi
    return
  fi

  if [[ "$lang" == "ja" ]]; then
    if [[ "$stem" == *.ja ]]; then
      echo "$file_name"
    elif [[ "$stem" == *-ja ]]; then
      echo "${stem%-ja}.ja.${ext}"
    elif [[ "$stem" == *-jp ]]; then
      echo "${stem%-jp}.ja.${ext}"
    else
      echo "${stem}.ja.${ext}"
    fi
    return
  fi

  echo "$file_name"
}

sync_about() {
  mkdir -p src/content/about

  local zh_source=""
  if [[ -f "$BLOG_SRC/source/about/zh.md" ]]; then
    zh_source="$BLOG_SRC/source/about/zh.md"
  elif [[ -f "$BLOG_SRC/source/about/index.md" ]]; then
    zh_source="$BLOG_SRC/source/about/index.md"
  fi

  if [[ -n "$zh_source" ]]; then
    cp "$zh_source" src/content/about/about-zh.md
    cp "$zh_source" content/about.md
  fi

  if [[ -f "$BLOG_SRC/source/about/en.md" ]]; then
    cp "$BLOG_SRC/source/about/en.md" src/content/about/about-en.md
  fi

  if [[ -f "$BLOG_SRC/source/about/ja.md" ]]; then
    cp "$BLOG_SRC/source/about/ja.md" src/content/about/about-ja.md
  fi
}

sync_robots() {
  mkdir -p public
  if [[ -f "$BLOG_SRC/source/robots.txt" ]]; then
    cp "$BLOG_SRC/source/robots.txt" public/robots.txt
  fi
}

echo "================================================"
echo "Content Sync: Blog-src -> Blog-astro"
echo "================================================"
echo "Source: $BLOG_SRC"
echo ""

if [[ ! -d "$BLOG_SRC/source/_posts" ]]; then
  echo "Error: Blog-src source/_posts not found at $BLOG_SRC"
  exit 1
fi

for collection in "${COLLECTIONS[@]}"; do
  mkdir -p "content/${collection}"
  # Only clear generated markdown + asset directories.
  # Preserve loose static files (e.g. legacy image placeholders).
  find "content/${collection}" -mindepth 1 -type d -not -name ".gitkeep" -exec rm -rf {} + 2>/dev/null || true
  find "content/${collection}" -mindepth 1 -type f \( -name "*.md" -o -name "*.mdx" \) -delete 2>/dev/null || true
done

if [[ -d "$BLOG_SRC/source/_posts/posts" && -d "$BLOG_SRC/source/_posts/notes" && -d "$BLOG_SRC/source/_posts/journals" ]]; then
  echo "Structured source detected."
  shopt -s nullglob

  copied_files=0
  copied_dirs=0
  for collection in "${COLLECTIONS[@]}"; do
    for lang in "${LANGS[@]}"; do
      src_dir="$BLOG_SRC/source/_posts/${collection}/${lang}"
      [[ -d "$src_dir" ]] || continue

      for entry in "$src_dir"/*; do
        name="$(basename "$entry")"
        if [[ -d "$entry" ]]; then
          cp -R "$entry" "content/${collection}/${name}"
          copied_dirs=$((copied_dirs + 1))
          continue
        fi

        target_name="$(normalize_target_name "$name" "$lang")"
        cp "$entry" "content/${collection}/${target_name}"
        copied_files=$((copied_files + 1))
      done
    done
  done

  shopt -u nullglob
  echo "Copied markdown files: $copied_files"
  echo "Copied asset dirs: $copied_dirs"
else
  echo "Legacy flat source detected. Copying all into content/posts..."
  cp -r "$BLOG_SRC/source/_posts/"* content/posts/ 2>/dev/null || true
fi

sync_about
sync_robots

echo ""
echo "================================================"
echo "Sync complete."
echo "================================================"
