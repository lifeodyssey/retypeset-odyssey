#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs, parseJsonLoose, toBool } from "./lib/core.mjs";

function runNode(script, args, options = {}) {
  return execFileSync("node", [script, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
    ...options,
  });
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

function boolEnv(name, fallback) {
  return toBool(process.env[name], fallback);
}

async function writeJson(filePath, value) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function main() {
  const args = parseArgs(process.argv);
  const repoRoot = path.resolve(args["repo-root"] || process.cwd());
  const planFile = path.resolve(args["plan-file"] || "");
  const artifactsRoot = path.resolve(args["artifacts-root"] || "");
  const workRoot = path.resolve(args["work-root"] || path.join(process.cwd(), ".tmp-translation-ghaw"));
  const dryRun = toBool(args["dry-run"], false);
  const failOnError = boolEnv("TRANSLATION_FAIL_ON_ERROR", false);

  if (!planFile) throw new Error("--plan-file is required");
  if (!artifactsRoot) throw new Error("--artifacts-root is required");

  const plan = parseJsonLoose(await fs.readFile(planFile, "utf8"), null);
  const articles = Array.isArray(plan?.articles) ? plan.articles : [];

  await ensureDir(artifactsRoot);
  await ensureDir(workRoot);

  const scriptsDir = path.join(repoRoot, "scripts/translation-ghaw");
  const classifyScript = path.join(scriptsDir, "classify.mjs");
  const generateScript = path.join(scriptsDir, "generate-candidates.mjs");
  const reviewScript = path.join(scriptsDir, "review-candidates.mjs");
  const rewriteScript = path.join(scriptsDir, "rewrite-candidates.mjs");
  const rereviewScript = path.join(scriptsDir, "rereview-rewrites.mjs");
  const reviewMaxRevisions = Math.max(0, Math.min(3, Number(process.env.REVIEW_MAX_REVISIONS || "1")));

  const summary = {
    version: 1,
    dry_run: dryRun,
    plan_source_ref: plan?.source_ref || null,
    totals: {
      articles: articles.length,
      completed: 0,
      failed: 0,
      skipped: 0,
    },
    articles: [],
    errors: [],
  };

  for (const article of articles) {
    const taskId = String(article?.task_id || "");
    const articlePath = String(article?.path || "");
    const changeType = String(article?.change_type || "M");
    if (!taskId || !articlePath) {
      summary.errors.push({ task_id: taskId || null, error: "Invalid article entry in plan" });
      summary.totals.failed += 1;
      if (failOnError) throw new Error("Invalid article entry in plan");
      continue;
    }

    const taskWorkDir = path.join(workRoot, taskId);
    const taskArtifacts = {
      classificationDir: path.join(artifactsRoot, `translate-classification-${taskId}`),
      candidatesDir: path.join(artifactsRoot, `translate-candidates-${taskId}`),
      reviewDir: path.join(artifactsRoot, `review-result-${taskId}`),
      rewritesDir: path.join(artifactsRoot, `review-rewrites-${taskId}`),
    };
    await ensureDir(taskWorkDir);
    await ensureDir(taskArtifacts.classificationDir);
    await ensureDir(taskArtifacts.candidatesDir);
    await ensureDir(taskArtifacts.reviewDir);
    await ensureDir(taskArtifacts.rewritesDir);

    const payload = {
      version: 1,
      task_id: taskId,
      article: {
        path: articlePath,
        change_type: changeType,
      },
      settings: {
        dry_run: dryRun,
      },
    };
    const payloadFile = path.join(taskWorkDir, "payload.json");
    const classificationFile = path.join(taskWorkDir, "classification.json");
    const candidatesFile = path.join(taskWorkDir, "candidates.json");
      const reviewFile = path.join(taskWorkDir, "review.json");
      const rewritesFile = path.join(taskWorkDir, "rewrites.json");
      const rereviewFile = path.join(taskWorkDir, "rereview.json");
      const finalReviewFile = path.join(taskWorkDir, "review.final.json");

    await writeJson(payloadFile, payload);

    const articleSummary = {
      task_id: taskId,
      article_path: articlePath,
      change_type: changeType,
      status: "pending",
      stages: [],
      outputs: {
        classification: path.relative(artifactsRoot, path.join(taskArtifacts.classificationDir, "classification.json")),
        candidates: path.relative(artifactsRoot, path.join(taskArtifacts.candidatesDir, "candidates.json")),
        review: path.relative(artifactsRoot, path.join(taskArtifacts.reviewDir, "review.json")),
        rewrites: path.relative(artifactsRoot, path.join(taskArtifacts.rewritesDir, "rewrites.json")),
      },
      error: null,
    };

    try {
      const classificationStdout = runNode(classifyScript, [
        "--payload-json",
        await fs.readFile(payloadFile, "utf8"),
        "--repo-root",
        repoRoot,
        "--dry-run",
        String(dryRun),
      ]);
      await fs.writeFile(classificationFile, classificationStdout, "utf8");
      await fs.copyFile(classificationFile, path.join(taskArtifacts.classificationDir, "classification.json"));
      const classificationJson = parseJsonLoose(classificationStdout, {});
      articleSummary.stages.push({
        stage: "classify",
        status: "ok",
        classification_status: classificationJson?.status || null,
        should_translate: classificationJson?.gating?.should_translate ?? null,
      });

      const candidatesStdout = runNode(generateScript, [
        "--payload-json",
        await fs.readFile(payloadFile, "utf8"),
        "--classification-file",
        classificationFile,
        "--repo-root",
        repoRoot,
        "--dry-run",
        String(dryRun),
      ]);
      await fs.writeFile(candidatesFile, candidatesStdout, "utf8");
      await fs.copyFile(candidatesFile, path.join(taskArtifacts.candidatesDir, "candidates.json"));
      const candidatesJson = parseJsonLoose(candidatesStdout, {});
      articleSummary.stages.push({
        stage: "generate_candidates",
        status: "ok",
        status_value: candidatesJson?.status || null,
        target_count: Array.isArray(candidatesJson?.targets) ? candidatesJson.targets.length : 0,
      });

      const reviewStdout = runNode(reviewScript, [
        "--candidates-file",
        candidatesFile,
        "--repo-root",
        repoRoot,
        "--dry-run",
        String(dryRun),
      ]);
      await fs.writeFile(reviewFile, reviewStdout, "utf8");
      await fs.copyFile(reviewFile, path.join(taskArtifacts.reviewDir, "review.json"));
      const reviewJson = parseJsonLoose(reviewStdout, {});
      articleSummary.stages.push({
        stage: "review",
        status: "ok",
        accepted: Array.isArray(reviewJson?.targets)
          ? reviewJson.targets.filter((t) => t?.status === "accepted").length
          : 0,
        revise_required: Array.isArray(reviewJson?.targets)
          ? reviewJson.targets.filter((t) => t?.status === "revise_required").length
          : 0,
      });

      const rewritesStdout = runNode(rewriteScript, [
        "--candidates-file",
        candidatesFile,
        "--review-file",
        reviewFile,
        "--repo-root",
        repoRoot,
        "--dry-run",
        String(dryRun),
      ]);
      await fs.writeFile(rewritesFile, rewritesStdout, "utf8");
      await fs.copyFile(rewritesFile, path.join(taskArtifacts.rewritesDir, "rewrites.json"));
      const rewritesJson = parseJsonLoose(rewritesStdout, {});
      articleSummary.stages.push({
        stage: "rewrite",
        status: "ok",
        rewritten: Array.isArray(rewritesJson?.targets)
          ? rewritesJson.targets.filter((t) => t?.status === "rewritten").length
          : 0,
      });

      let finalReviewJson = reviewJson;
      const rewrittenCount = Array.isArray(rewritesJson?.targets)
        ? rewritesJson.targets.filter((t) => t?.status === "rewritten").length
        : 0;

      if (reviewMaxRevisions >= 1 && rewrittenCount > 0) {
        const rereviewStdout = runNode(rereviewScript, [
          "--candidates-file",
          candidatesFile,
          "--review-file",
          reviewFile,
          "--rewrites-file",
          rewritesFile,
          "--repo-root",
          repoRoot,
          "--dry-run",
          String(dryRun),
        ]);
        await fs.writeFile(rereviewFile, rereviewStdout, "utf8");
        const rereviewJson = parseJsonLoose(rereviewStdout, {});
        articleSummary.stages.push({
          stage: "rereview_after_rewrite",
          status: "ok",
          attempted: rereviewJson?.rereview?.targets?.length || 0,
          accepted: rereviewJson?.merged_review?.rereview_summary?.accepted || 0,
          still_rejected: rereviewJson?.merged_review?.rereview_summary?.still_rejected || 0,
        });

        if (rereviewJson?.merged_review) {
          finalReviewJson = rereviewJson.merged_review;
          await fs.writeFile(finalReviewFile, `${JSON.stringify(finalReviewJson, null, 2)}\n`, "utf8");
        }
      }

      // `render-batch` expects review-result-*/review.json to be the final review state.
      if (finalReviewJson) {
        await fs.writeFile(reviewFile, `${JSON.stringify(finalReviewJson, null, 2)}\n`, "utf8");
      }
      await fs.copyFile(reviewFile, path.join(taskArtifacts.reviewDir, "review.json"));
      if (await fs.stat(rereviewFile).catch(() => null)) {
        const rereviewArtifactDir = path.join(artifactsRoot, `review-rereview-${taskId}`);
        await ensureDir(rereviewArtifactDir);
        await fs.copyFile(rereviewFile, path.join(rereviewArtifactDir, "rereview.json"));
      }

      const finalReview = parseJsonLoose(await fs.readFile(reviewFile, "utf8"), null);
      const finalTargets = Array.isArray(finalReview?.targets) ? finalReview.targets : [];
      const anyAccepted = finalTargets.some((t) => t?.status === "accepted");
      articleSummary.status = anyAccepted ? "completed" : "completed_no_accepted_outputs";
      if (articleSummary.status === "completed") summary.totals.completed += 1;
      else summary.totals.skipped += 1;
    } catch (err) {
      articleSummary.status = "failed";
      articleSummary.error = String(err?.message || err);
      summary.totals.failed += 1;
      summary.errors.push({ task_id: taskId, article_path: articlePath, error: articleSummary.error });
      if (failOnError) {
        summary.articles.push(articleSummary);
        throw err;
      }
    }

    summary.articles.push(articleSummary);
  }

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
