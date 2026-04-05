---
on:
  workflow_dispatch:
    inputs:
      payload_json:
        description: JSON payload containing source article and translation candidates
        required: false
        type: string
      candidates_artifact_ref_json:
        description: JSON reference to a candidates artifact (repository, run_id, artifact_name, optional file_name)
        required: false
        type: string
      dry_run:
        description: Evaluate without writing outputs
        required: false
        default: false
        type: boolean

permissions:
  actions: read
  contents: read

concurrency:
  group: gh-aw-review-worker
  cancel-in-progress: false

network: defaults

jobs:
  validate-review-payload:
    runs-on: ubuntu-latest
    steps:
      - name: Validate payload_json (minimal)
        env:
          PAYLOAD_JSON: ${{ github.event.inputs.payload_json }}
          CANDIDATES_ARTIFACT_REF_JSON: ${{ github.event.inputs.candidates_artifact_ref_json }}
        run: |
          node - <<'NODE'
          const payloadRaw = (process.env.PAYLOAD_JSON || "").trim();
          const artifactRaw = (process.env.CANDIDATES_ARTIFACT_REF_JSON || "").trim();
          if (!payloadRaw && !artifactRaw) {
            console.error("Provide either payload_json or candidates_artifact_ref_json");
            process.exit(1);
          }
          if (artifactRaw) {
            try {
              const ref = JSON.parse(artifactRaw);
              if (!ref.repository || !ref.run_id || !ref.artifact_name) {
                console.error("candidates_artifact_ref_json requires repository, run_id, artifact_name");
                process.exit(1);
              }
              console.log("Artifact-ref mode:", ref.repository, ref.run_id, ref.artifact_name);
            } catch (err) {
              console.error("Invalid candidates_artifact_ref_json:", err.message);
              process.exit(1);
            }
          } else {
            let parsed;
            try {
              parsed = JSON.parse(payloadRaw);
            } catch (err) {
              console.error("Invalid payload_json:", err.message);
              process.exit(1);
            }
            if (!parsed.article_path || !Array.isArray(parsed.targets)) {
              console.error("Missing article_path or targets[]");
              process.exit(1);
            }
            console.log("Inline payload mode: targets =", parsed.targets.length);
          }
          NODE

  review-candidates:
    needs: validate-review-payload
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

      - name: Run Gemini review/selection (Phase 4)
        env:
          PAYLOAD_JSON: ${{ github.event.inputs.payload_json }}
          CANDIDATES_ARTIFACT_REF_JSON: ${{ github.event.inputs.candidates_artifact_ref_json }}
          WORKER_DRY_RUN: ${{ github.event.inputs.dry_run || 'false' }}
          GITHUB_TOKEN: ${{ github.token }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          GEMINI_MODEL: ${{ secrets.GEMINI_MODEL }}
          GOOGLE_GEMINI_BASE_URL: ${{ secrets.GOOGLE_GEMINI_BASE_URL }}
          GEMINI_API_BASE_URL: ${{ secrets.GEMINI_API_BASE_URL }}
          GEMINI_CUSTOM_HEADERS: ${{ secrets.GEMINI_CUSTOM_HEADERS }}
          VERIFICATION_MIN_SCORE: ${{ secrets.VERIFICATION_MIN_SCORE }}
        run: |
          mkdir -p /tmp/gh-aw-translation-review
          if [[ -n "${CANDIDATES_ARTIFACT_REF_JSON:-}" ]]; then
            node scripts/translation-ghaw/fetch-run-artifact-json.mjs \
              --artifact-ref-json "$CANDIDATES_ARTIFACT_REF_JSON" \
              --output-file /tmp/gh-aw-translation-review/candidates.json \
              > /tmp/gh-aw-translation-review/artifact-fetch.json
            echo "artifact fetch summary:"
            cat /tmp/gh-aw-translation-review/artifact-fetch.json
          else
            printf '%s\n' "$PAYLOAD_JSON" > /tmp/gh-aw-translation-review/candidates.json
          fi
          node scripts/translation-ghaw/review-candidates.mjs \
            --candidates-file /tmp/gh-aw-translation-review/candidates.json \
            --repo-root "$GITHUB_WORKSPACE" \
            --dry-run "$WORKER_DRY_RUN" \
            > /tmp/gh-aw-translation-review/review.json

          echo "review summary:"
          node - <<'NODE'
          const fs = require("node:fs");
          const p = JSON.parse(fs.readFileSync("/tmp/gh-aw-translation-review/review.json", "utf8"));
          console.log(JSON.stringify({
            article_path: p.article_path,
            targets: (p.targets || []).map(t => ({
              lang: t.lang,
              status: t.status,
              score: t.score,
              selected_candidate_id: t.selected_candidate_id || null,
            })),
          }, null, 2));
          NODE

      - name: Run Anthropic rewrite on rejected targets (Phase 3/4 bridge)
        env:
          WORKER_DRY_RUN: ${{ github.event.inputs.dry_run || 'false' }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          ANTHROPIC_MODEL: ${{ secrets.ANTHROPIC_MODEL }}
          ANTHROPIC_BASE_URL: ${{ secrets.ANTHROPIC_BASE_URL }}
          ANTHROPIC_API_BASE_URL: ${{ secrets.ANTHROPIC_API_BASE_URL }}
          ANTHROPIC_CUSTOM_HEADERS: ${{ secrets.ANTHROPIC_CUSTOM_HEADERS }}
        run: |
          node scripts/translation-ghaw/rewrite-candidates.mjs \
            --candidates-file /tmp/gh-aw-translation-review/candidates.json \
            --review-file /tmp/gh-aw-translation-review/review.json \
            --repo-root "$GITHUB_WORKSPACE" \
            --dry-run "$WORKER_DRY_RUN" \
            > /tmp/gh-aw-translation-review/rewrites.json

          echo "rewrite summary:"
          node - <<'NODE'
          const fs = require("node:fs");
          const p = JSON.parse(fs.readFileSync("/tmp/gh-aw-translation-review/rewrites.json", "utf8"));
          console.log(JSON.stringify({
            article_path: p.article_path,
            targets: (p.targets || []).map(t => ({
              lang: t.lang,
              status: t.status,
              source_candidate_id: t.source_candidate_id || null,
              rewritten_candidate_id: t.revised_candidate?.candidate_id || null,
            })),
          }, null, 2));
          NODE

      - name: Upload review artifact
        uses: actions/upload-artifact@v4
        with:
          name: review-worker-result
          path: /tmp/gh-aw-translation-review/review.json
          retention-days: 1

      - name: Upload rewrite artifact
        uses: actions/upload-artifact@v4
        with:
          name: review-worker-rewrites
          path: /tmp/gh-aw-translation-review/rewrites.json
          retention-days: 1
---

# review-worker

You review translation candidates for one article and decide whether each target language is accepted
or requires revision.

## Responsibilities

1. Read source article, classification result, and translation candidates from `payload_json`.
2. Retrieve style context from similar historical content in the same category/language family.
3. Use Gemini as the reviewer and selector:
   - score candidates
   - choose best candidate
   - produce actionable feedback when score is below threshold
4. If review fails threshold, return `revise_required` feedback for Anthropic rewrite.
5. If review passes, return a final approved Markdown candidate for rendering/writing.

## Input Contract Note (Current Limitation)

- `payload_json` is acceptable for scaffolding and small test payloads.
- `candidates_artifact_ref_json` is the preferred production input path for larger payloads.
- Real candidate payloads can exceed `workflow_dispatch` input size limits, so orchestrator should dispatch review
  workers using artifact references (repository + run_id + artifact_name), not inline candidate JSON.

## Review Criteria (Must Preserve)

- Faithfulness to source meaning
- Technical terminology correctness
- Markdown structure preservation
- Readability in target language
- Consistency with similar historical blog style

## Expected Output (Target State)

```json
{
  "version": 1,
  "article_path": "content/posts/example-post.md",
  "targets": [
    {
      "lang": "en",
      "status": "accepted",
      "score": 88,
      "selected_candidate_id": "gemini-2",
      "final_content_md": "...",
      "review_notes": "..."
    },
    {
      "lang": "ja",
      "status": "revise_required",
      "score": 73,
      "selected_candidate_id": "anthropic-1",
      "revision_feedback": [
        "Fix terminology consistency for ...",
        "Preserve code comment nuance in section 3"
      ]
    }
  ]
}
```

## Hard Rules

- Gemini is the review authority in this worker.
- Anthropic rewrite requests must be explicit and structured when review fails.
- Do not write files directly in this worker (render/write happens in a deterministic post-review step).
- Avoid style drift by grounding feedback in nearby same-category examples.

## Secret / Config Expectations (Future Integration)

- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `GOOGLE_GEMINI_BASE_URL` (optional)
- `VERIFICATION_MIN_SCORE`
- `REVIEW_MAX_REVISIONS`

## Current Status

Phase 4 in progress: Gemini review/selection helper is wired and emits structured review artifacts.
Anthropic rewrite-after-review is now wired as a bridge step and emits rewrite artifacts. Style-context
retrieval and second-pass re-review loop integration remain for subsequent phases.
