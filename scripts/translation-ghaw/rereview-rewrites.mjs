#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseArgs, parseJsonLoose, toBool } from "./lib/core.mjs";

function rewrittenTargetsToCandidatesPayload(candidates, review, rewrites) {
  const rewrittenTargets = Array.isArray(rewrites?.targets)
    ? rewrites.targets.filter((t) => t?.status === "rewritten" && t?.revised_candidate)
    : [];

  if (rewrittenTargets.length === 0) return null;

  const targets = [];
  for (const rt of rewrittenTargets) {
    const lang = String(rt.lang || "");
    if (!lang) continue;
    const originalReview = Array.isArray(review?.targets) ? review.targets.find((t) => t?.lang === lang) : null;
    if (!originalReview || originalReview.status !== "revise_required") continue;

    targets.push({
      lang,
      status: "candidates_ready",
      candidates: [
        {
          provider: rt.revised_candidate.provider || "anthropic_rewrite",
          candidate_id: rt.revised_candidate.candidate_id || `anthropic-rewrite-${lang}`,
          title: rt.revised_candidate.title || "",
          body_markdown: rt.revised_candidate.body_markdown || "",
        },
      ],
      errors: [],
    });
  }

  if (targets.length === 0) return null;

  return {
    version: 1,
    article_path: candidates.article_path,
    source_lang: candidates.source_lang || review.source_lang || "zh",
    classification: candidates.classification || review.classification || null,
    status: "rewrite_candidates_for_rereview",
    targets,
    errors: [],
  };
}

function mergeReviewResults(originalReview, rereview) {
  if (!rereview || !Array.isArray(rereview.targets)) {
    return originalReview;
  }

  const mergedTargets = (Array.isArray(originalReview?.targets) ? originalReview.targets : []).map((target) => {
    const lang = String(target?.lang || "");
    const retry = rereview.targets.find((t) => String(t?.lang || "") === lang);
    if (!retry) return target;

    if (retry.status === "accepted") {
      return {
        ...retry,
        review_pass: "rereview_after_rewrite",
        previous_review: {
          status: target.status,
          score: target.score ?? null,
          selected_candidate_id: target.selected_candidate_id || null,
        },
      };
    }

    return {
      ...target,
      rereview: {
        status: retry.status || "unknown",
        score: retry.score ?? null,
        selected_candidate_id: retry.selected_candidate_id || null,
        review_notes: retry.review_notes || "",
        revision_feedback: Array.isArray(retry.revision_feedback) ? retry.revision_feedback : [],
      },
    };
  });

  return {
    ...originalReview,
    targets: mergedTargets,
    rereview_summary: {
      attempted: rereview.targets.length,
      accepted: rereview.targets.filter((t) => t?.status === "accepted").length,
      still_rejected: rereview.targets.filter((t) => t?.status !== "accepted").length,
    },
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const repoRoot = path.resolve(args["repo-root"] || process.cwd());
  const dryRun = toBool(args["dry-run"], false);

  const candidatesFile = path.resolve(args["candidates-file"] || "");
  const reviewFile = path.resolve(args["review-file"] || "");
  const rewritesFile = path.resolve(args["rewrites-file"] || "");
  if (!candidatesFile || !reviewFile || !rewritesFile) {
    throw new Error("--candidates-file, --review-file and --rewrites-file are required");
  }

  const candidates = parseJsonLoose(await fs.readFile(candidatesFile, "utf8"), null);
  const review = parseJsonLoose(await fs.readFile(reviewFile, "utf8"), null);
  const rewrites = parseJsonLoose(await fs.readFile(rewritesFile, "utf8"), null);
  if (!candidates?.article_path || !Array.isArray(candidates?.targets)) throw new Error("Invalid candidates payload");
  if (!review?.article_path || !Array.isArray(review?.targets)) throw new Error("Invalid review payload");
  if (!rewrites?.article_path || !Array.isArray(rewrites?.targets)) throw new Error("Invalid rewrites payload");

  const rereviewCandidates = rewrittenTargetsToCandidatesPayload(candidates, review, rewrites);
  if (!rereviewCandidates) {
    const out = {
      version: 1,
      article_path: candidates.article_path,
      status: "no_rereview_needed",
      rereview: null,
      merged_review: review,
    };
    process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
    return;
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ghaw-rereview-"));
  const syntheticCandidatesFile = path.join(tmpDir, "rereview-candidates.json");
  await fs.writeFile(syntheticCandidatesFile, `${JSON.stringify(rereviewCandidates, null, 2)}\n`, "utf8");

  const reviewScript = path.join(repoRoot, "scripts/translation-ghaw/review-candidates.mjs");
  const rereviewStdout = execFileSync("node", [
    reviewScript,
    "--candidates-file",
    syntheticCandidatesFile,
    "--repo-root",
    repoRoot,
    "--dry-run",
    String(dryRun),
  ], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });

  const rereview = parseJsonLoose(rereviewStdout, null);
  if (!rereview || !Array.isArray(rereview.targets)) {
    throw new Error("Invalid rereview output from review-candidates.mjs");
  }

  const out = {
    version: 1,
    article_path: candidates.article_path,
    status: "rereview_completed",
    rereview,
    merged_review: mergeReviewResults(review, rereview),
  };
  process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
