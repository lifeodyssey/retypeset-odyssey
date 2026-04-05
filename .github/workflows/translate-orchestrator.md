---
on:
  push:
    branches: [master, main]
    paths:
      - "content/posts/**/*.md"
      - "content/posts/**/*.mdx"
  workflow_dispatch:
    inputs:
      base_sha:
        description: Optional base SHA to diff against
        required: false
        type: string
      head_sha:
        description: Optional head SHA to process
        required: false
        type: string
      dry_run:
        description: Plan/review only (no writes, no PR)
        required: false
        default: false
        type: boolean

permissions:
  contents: read
  pull-requests: read
  actions: read

concurrency:
  group: gh-aw-translation-orchestrator
  cancel-in-progress: false

network: defaults
strict: false
safe-outputs:
  create-pull-request:
    max: 1
    draft: false
    labels:
      - translation
      - automated
      - gh-aw
    if-no-changes: ignore
    fallback-as-issue: false

jobs:
  detect-and-plan:
    if: github.actor != 'github-actions[bot]'
    runs-on: ubuntu-latest
    outputs:
      base_sha: ${{ steps.plan.outputs.base_sha }}
      head_sha: ${{ steps.plan.outputs.head_sha }}
      dry_run: ${{ steps.plan.outputs.dry_run }}
      has_articles: ${{ steps.plan.outputs.has_articles }}
      article_count: ${{ steps.plan.outputs.article_count }}
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "22"

      - name: Detect changed source posts and build plan
        id: plan
        env:
          INPUT_BASE_SHA: ${{ github.event.inputs.base_sha }}
          INPUT_HEAD_SHA: ${{ github.event.inputs.head_sha }}
          INPUT_DRY_RUN: ${{ github.event.inputs.dry_run }}
          EVENT_BEFORE: ${{ github.event.before }}
          EVENT_SHA: ${{ github.sha }}
        run: |
          set -euo pipefail
          mkdir -p /tmp/gh-aw-translation/orchestrator

          BASE_SHA="${INPUT_BASE_SHA:-${EVENT_BEFORE:-}}"
          HEAD_SHA="${INPUT_HEAD_SHA:-${EVENT_SHA:-HEAD}}"
          DRY_RUN="${INPUT_DRY_RUN:-false}"

          echo "base_sha=${BASE_SHA:-<auto>}"
          echo "head_sha=${HEAD_SHA:-HEAD}"
          echo "dry_run=${DRY_RUN}"

          node scripts/translation-ghaw/detect-changed-posts.mjs \
            --repo-root "$GITHUB_WORKSPACE" \
            --base "${BASE_SHA:-}" \
            --head "${HEAD_SHA:-HEAD}" \
            --output-file /tmp/gh-aw-translation/orchestrator/plan.json \
            > /tmp/gh-aw-translation/orchestrator/plan.pretty.json

          cat /tmp/gh-aw-translation/orchestrator/plan.pretty.json

          DRY_RUN="$DRY_RUN" node - <<'NODE'
          const fs = require("node:fs");
          const plan = JSON.parse(fs.readFileSync("/tmp/gh-aw-translation/orchestrator/plan.json", "utf8"));
          const out = process.env.GITHUB_OUTPUT;
          const dryRun = String(process.env.DRY_RUN || "false");
          const baseSha = plan?.source_ref?.base_sha || "";
          const headSha = plan?.source_ref?.head_sha || "";
          const articleCount = Array.isArray(plan?.articles) ? plan.articles.length : 0;

          fs.appendFileSync(out, `base_sha=${baseSha}\n`);
          fs.appendFileSync(out, `head_sha=${headSha}\n`);
          fs.appendFileSync(out, `dry_run=${dryRun}\n`);
          fs.appendFileSync(out, `has_articles=${articleCount > 0}\n`);
          fs.appendFileSync(out, `article_count=${articleCount}\n`);
          NODE

      - name: Upload orchestrator plan artifact
        uses: actions/upload-artifact@v4
        with:
          name: orchestrator-plan
          path: /tmp/gh-aw-translation/orchestrator/plan.json
          retention-days: 1

      - name: No eligible source posts
        if: steps.plan.outputs.has_articles != 'true'
        run: |
          echo "No eligible source posts detected after filtering."

  execute-pipeline:
    needs: detect-and-plan
    if: needs.detect-and-plan.outputs.has_articles == 'true'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: read
      actions: read
    outputs:
      has_changes: ${{ steps.changes.outputs.has_changes }}
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "22"

      - name: Download plan artifact
        uses: actions/download-artifact@v4
        with:
          name: orchestrator-plan
          path: /tmp/gh-aw-translation/orchestrator

      - name: Execute translation/review plan (sequential helper chain)
        env:
          WORKFLOW_DRY_RUN: ${{ needs.detect-and-plan.outputs.dry_run }}
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
          DEFAULT_SOURCE_LANG: ${{ secrets.DEFAULT_SOURCE_LANG }}
          TRANSLATION_TARGET_MATRIX_JSON: ${{ secrets.TRANSLATION_TARGET_MATRIX_JSON }}
          CLASSIFICATION_CONFIDENCE_THRESHOLD: ${{ secrets.CLASSIFICATION_CONFIDENCE_THRESHOLD }}
          VERIFICATION_MIN_SCORE: ${{ secrets.VERIFICATION_MIN_SCORE }}
          VARIANTS_PER_PROVIDER: ${{ secrets.VARIANTS_PER_PROVIDER }}
          REVIEW_MAX_REVISIONS: ${{ secrets.REVIEW_MAX_REVISIONS }}
          TRANSLATION_FAIL_ON_ERROR: ${{ secrets.TRANSLATION_FAIL_ON_ERROR }}
        run: |
          mkdir -p /tmp/gh-aw-translation/work /tmp/gh-aw-translation/artifacts /tmp/gh-aw-translation/execution
          node scripts/translation-ghaw/execute-plan.mjs \
            --repo-root "$GITHUB_WORKSPACE" \
            --plan-file /tmp/gh-aw-translation/orchestrator/plan.json \
            --artifacts-root /tmp/gh-aw-translation/artifacts \
            --work-root /tmp/gh-aw-translation/work \
            --dry-run "$WORKFLOW_DRY_RUN" \
            > /tmp/gh-aw-translation/execution/execute-plan-summary.json

          echo "execute-plan summary:"
          cat /tmp/gh-aw-translation/execution/execute-plan-summary.json

      - name: Upload intermediate artifacts
        uses: actions/upload-artifact@v4
        with:
          name: orchestrator-intermediate-artifacts
          path: /tmp/gh-aw-translation/artifacts
          retention-days: 1

      - name: Upload execute-plan summary
        uses: actions/upload-artifact@v4
        with:
          name: execute-plan-summary
          path: /tmp/gh-aw-translation/execution/execute-plan-summary.json
          retention-days: 1

      - name: Render translated markdown outputs
        env:
          WORKFLOW_DRY_RUN: ${{ needs.detect-and-plan.outputs.dry_run }}
          UPDATE_EXISTING_TRANSLATIONS: ${{ secrets.UPDATE_EXISTING_TRANSLATIONS }}
          OVERWRITE_MANUAL_TRANSLATIONS: ${{ secrets.OVERWRITE_MANUAL_TRANSLATIONS }}
          ALLOW_UNREVIEWED_REWRITE: "false"
        run: |
          mkdir -p /tmp/gh-aw-translation/render
          node scripts/translation-ghaw/render-batch.mjs \
            --repo-root "$GITHUB_WORKSPACE" \
            --artifacts-root /tmp/gh-aw-translation/artifacts \
            --dry-run "$WORKFLOW_DRY_RUN" \
            --allow-unreviewed-rewrite "$ALLOW_UNREVIEWED_REWRITE" \
            > /tmp/gh-aw-translation/render/render-batch-summary.json

          echo "render batch summary:"
          cat /tmp/gh-aw-translation/render/render-batch-summary.json

      - name: Upload render summary
        uses: actions/upload-artifact@v4
        with:
          name: render-batch-summary
          path: /tmp/gh-aw-translation/render/render-batch-summary.json
          retention-days: 1

      - name: Detect generated changes
        id: changes
        run: |
          if [[ -n "$(git status --porcelain content/posts)" ]]; then
            echo "has_changes=true" >> "$GITHUB_OUTPUT"
            git status --short content/posts
          else
            echo "has_changes=false" >> "$GITHUB_OUTPUT"
            echo "No translation file changes generated."
          fi

      - name: Build translation patch artifact
        if: steps.changes.outputs.has_changes == 'true' && needs.detect-and-plan.outputs.dry_run != 'true'
        run: |
          mkdir -p /tmp/gh-aw-translation/patch
          git diff --binary -- content/posts > /tmp/gh-aw-translation/patch/translations.patch
          wc -c /tmp/gh-aw-translation/patch/translations.patch

      - name: Upload translation patch artifact
        if: steps.changes.outputs.has_changes == 'true' && needs.detect-and-plan.outputs.dry_run != 'true'
        uses: actions/upload-artifact@v4
        with:
          name: translation-patch
          path: /tmp/gh-aw-translation/patch/translations.patch
          retention-days: 1

      - name: PR creation delegated to gh-aw safe-output agent
        if: steps.changes.outputs.has_changes == 'true' && needs.detect-and-plan.outputs.dry_run != 'true'
        run: |
          echo "Translation changes were generated."
          echo "Patch artifact uploaded. gh-aw agent job should apply patch and call create_pull_request safe-output."

      - name: Dry-run notice
        if: needs.detect-and-plan.outputs.dry_run == 'true'
        run: |
          echo "Dry-run mode enabled: PR creation and file writes were skipped."
---

# translate-orchestrator

This `gh-aw` workflow now runs the production path through deterministic jobs and helper scripts:

1. detect changed source posts
2. execute classification + candidate generation + review + rewrite (sequential helper chain)
3. render Markdown outputs deterministically
4. emit a patch artifact for agent safe-output PR creation

`translate-worker.md` and `review-worker.md` are still kept as reusable/debug entry points, but the current
production orchestration runs in one workflow because `gh-aw` frontmatter schema currently blocks `strategy.matrix`
and cross-workflow handoff has payload/run-correlation complexity.

## Model Role Policy (Must Preserve)

- Anthropic:
  - article classification (`tech_share | personal_note | diary_life`)
  - rewrite after failed Gemini review
- Gemini:
  - candidate generation
  - review / scoring / best-candidate selection

## Constraints

- Only `content/posts/**/*.md|mdx` source files are eligible.
- Files with `.zh/.en/.ja` suffixes are treated as translations and ignored as sources.
- `translation_generated: true` files are ignored as sources.
- Output must remain frontmatter + Markdown body with template style preserved.

## Agent Responsibilities (Safe-Output PR Step)

After the deterministic jobs finish:

1. If this run is a `dry_run` or no `translation-patch` artifact exists, do not create a PR.
2. Download `translation-patch` artifact from the current run and apply it to the checked-out repo.
3. Verify there are staged/working-tree changes under `content/posts`.
4. Call `create_pull_request` safe-output exactly once with a branch like `bot/translate-ghaw-${GITHUB_RUN_ID}`.

Use this artifact reference shape to download the patch (via local helper script):

```json
{
  "repository": "<owner/repo>",
  "run_id": "<current_run_id>",
  "artifact_name": "translation-patch",
  "file_name": "translations.patch"
}
```

Suggested shell sequence for the agent (adapt paths as needed):

```bash
mkdir -p /tmp/gh-aw-translation/agent
node scripts/translation-ghaw/fetch-run-artifact-file.mjs \
  --artifact-ref-json '{"repository":"'"$GITHUB_REPOSITORY"'","run_id":"'"$GITHUB_RUN_ID"'","artifact_name":"translation-patch","file_name":"translations.patch"}' \
  --output-file /tmp/gh-aw-translation/agent/translations.patch
git apply /tmp/gh-aw-translation/agent/translations.patch
git status --short content/posts
```

Then create the PR via safe-output tool:
- title: `chore(translation): add automated translations (gh-aw)`
- body should mention:
  - trigger SHA
  - Anthropic + Gemini candidate generation
  - Gemini review
  - Anthropic rewrite path (and that second-pass Gemini re-review is pending)

## Pending Work

- Second-pass Gemini re-review after Anthropic rewrite is not yet wired.
- Cross-workflow dispatch remains scaffolded in worker workflows for future retry granularity.
- End-to-end runtime validation of `create-pull-request` safe-output path is still pending (compile-time integration is added).

Do not bypass the deterministic render helper when writing translated Markdown files.
