---
on:
  workflow_dispatch:
    inputs:
      payload_json:
        description: JSON payload for one article translation task
        required: true
        type: string
      dry_run:
        description: When true, validate/classify only
        required: false
        default: false
        type: boolean

permissions:
  contents: read

concurrency:
  group: gh-aw-translate-worker
  cancel-in-progress: false

network: defaults

jobs:
  validate-input:
    runs-on: ubuntu-latest
    steps:
      - name: Print payload
        env:
          PAYLOAD_JSON: ${{ github.event.inputs.payload_json }}
        run: |
          echo "translate-worker scaffold payload:"
          printf '%s\n' "$PAYLOAD_JSON"
      - name: Validate JSON shape (minimal)
        env:
          PAYLOAD_JSON: ${{ github.event.inputs.payload_json }}
        run: |
          node - <<'NODE'
          const raw = process.env.PAYLOAD_JSON || "{}";
          let parsed;
          try {
            parsed = JSON.parse(raw);
          } catch (err) {
            console.error("Invalid payload_json:", err.message);
            process.exit(1);
          }
          if (!parsed.article || !parsed.article.path) {
            console.error("Missing article.path");
            process.exit(1);
          }
          console.log("Validated article.path =", parsed.article.path);
          NODE

  classify-article:
    needs: validate-input
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 1

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "22"

      - name: Run Anthropic classification (Phase 3)
        env:
          PAYLOAD_JSON: ${{ github.event.inputs.payload_json }}
          WORKER_DRY_RUN: ${{ github.event.inputs.dry_run || 'false' }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          ANTHROPIC_MODEL: ${{ secrets.ANTHROPIC_MODEL }}
          ANTHROPIC_BASE_URL: ${{ secrets.ANTHROPIC_BASE_URL }}
          ANTHROPIC_API_BASE_URL: ${{ secrets.ANTHROPIC_API_BASE_URL }}
          ANTHROPIC_CUSTOM_HEADERS: ${{ secrets.ANTHROPIC_CUSTOM_HEADERS }}
          DEFAULT_SOURCE_LANG: ${{ secrets.DEFAULT_SOURCE_LANG }}
          TRANSLATION_TARGET_MATRIX_JSON: ${{ secrets.TRANSLATION_TARGET_MATRIX_JSON }}
          CLASSIFICATION_CONFIDENCE_THRESHOLD: ${{ secrets.CLASSIFICATION_CONFIDENCE_THRESHOLD }}
        run: |
          mkdir -p /tmp/gh-aw-translation
          node scripts/translation-ghaw/classify.mjs \
            --payload-json "$PAYLOAD_JSON" \
            --repo-root "$GITHUB_WORKSPACE" \
            --dry-run "$WORKER_DRY_RUN" \
            > /tmp/gh-aw-translation/classification.json

          echo "classification result:"
          cat /tmp/gh-aw-translation/classification.json

      - name: Upload classification artifact
        uses: actions/upload-artifact@v4
        with:
          name: translate-worker-classification
          path: /tmp/gh-aw-translation/classification.json
          retention-days: 1

      - name: Generate translation candidates (Phase 4)
        env:
          PAYLOAD_JSON: ${{ github.event.inputs.payload_json }}
          WORKER_DRY_RUN: ${{ github.event.inputs.dry_run || 'false' }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          ANTHROPIC_MODEL: ${{ secrets.ANTHROPIC_MODEL }}
          ANTHROPIC_BASE_URL: ${{ secrets.ANTHROPIC_BASE_URL }}
          ANTHROPIC_API_BASE_URL: ${{ secrets.ANTHROPIC_API_BASE_URL }}
          ANTHROPIC_CUSTOM_HEADERS: ${{ secrets.ANTHROPIC_CUSTOM_HEADERS }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          GEMINI_MODEL: ${{ secrets.GEMINI_MODEL }}
          GOOGLE_GEMINI_BASE_URL: ${{ secrets.GOOGLE_GEMINI_BASE_URL }}
          GEMINI_API_BASE_URL: ${{ secrets.GEMINI_API_BASE_URL }}
          GEMINI_CUSTOM_HEADERS: ${{ secrets.GEMINI_CUSTOM_HEADERS }}
          VARIANTS_PER_PROVIDER: ${{ secrets.VARIANTS_PER_PROVIDER }}
        run: |
          node scripts/translation-ghaw/generate-candidates.mjs \
            --payload-json "$PAYLOAD_JSON" \
            --classification-file /tmp/gh-aw-translation/classification.json \
            --repo-root "$GITHUB_WORKSPACE" \
            --dry-run "$WORKER_DRY_RUN" \
            > /tmp/gh-aw-translation/candidates.json

          echo "candidate summary:"
          node - <<'NODE'
          const fs = require("node:fs");
          const p = JSON.parse(fs.readFileSync("/tmp/gh-aw-translation/candidates.json", "utf8"));
          console.log(JSON.stringify({
            article_path: p.article_path,
            status: p.status,
            targets: (p.targets || []).map(t => ({
              lang: t.lang,
              status: t.status,
              candidates: Array.isArray(t.candidates) ? t.candidates.length : 0,
              errors: Array.isArray(t.errors) ? t.errors.length : 0,
            })),
          }, null, 2));
          NODE

      - name: Upload candidates artifact
        uses: actions/upload-artifact@v4
        with:
          name: translate-worker-candidates
          path: /tmp/gh-aw-translation/candidates.json
          retention-days: 1
---

# translate-worker

You process a single article translation task in the `gh-aw` translation pipeline.

## Responsibilities

1. Read the source article from `payload_json.article.path`.
2. Detect source language (`zh`, `en`, or `ja`) if not explicitly provided.
3. Run classification with Anthropic:
   - `tech_share`
   - `personal_note`
   - `diary_life`
4. If the article is not `tech_share`, return a structured skip result.
5. If `tech_share`, generate translation candidates for each target language:
   - Anthropic candidates
   - Gemini candidates
6. Return structured candidate results for `review-worker`.

## Hard Rules

- Do not directly create PRs in this worker.
- Do not mutate repository files in this worker (translation writing happens after review).
- Maintain strict structured output (JSON) for downstream review worker.
- Preserve Markdown semantics in candidate content (headings, code blocks, links, tables).

## Expected Output (Target State)

```json
{
  "version": 1,
  "article_path": "content/posts/example-post.md",
  "source_lang": "zh",
  "classification": {
    "label": "tech_share",
    "confidence": 0.91,
    "reason": "..."
  },
  "targets": [
    {
      "lang": "en",
      "status": "candidates_ready",
      "candidates": [
        {"provider":"anthropic","candidate_id":"anthropic-1","content_md":"..."},
        {"provider":"anthropic","candidate_id":"anthropic-2","content_md":"..."},
        {"provider":"gemini","candidate_id":"gemini-1","content_md":"..."},
        {"provider":"gemini","candidate_id":"gemini-2","content_md":"..."}
      ]
    }
  ]
}
```

## Secret / Config Expectations (Future Integration)

- Anthropic:
  - `ANTHROPIC_API_KEY`
  - `ANTHROPIC_MODEL`
  - `ANTHROPIC_BASE_URL` (optional custom gateway)
  - `ANTHROPIC_CUSTOM_HEADERS` (optional)
- Gemini:
  - `GEMINI_API_KEY`
  - `GEMINI_MODEL`
  - `GOOGLE_GEMINI_BASE_URL` (optional custom gateway)
- Behavior:
  - `TRANSLATION_TARGET_MATRIX_JSON`
  - `CLASSIFICATION_CONFIDENCE_THRESHOLD`
  - `VARIANTS_PER_PROVIDER`

## Current Status

Phase 3/4 in progress: Anthropic classification is wired, and candidate generation now emits a structured
candidate artifact for Anthropic + Gemini (dry-run placeholders when provider credentials are absent).
