#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs, parseJsonLoose, toBool } from "./lib/core.mjs";

async function listArtifactDirs(rootDir) {
  try {
    const entries = await fs.readdir(rootDir, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => path.join(rootDir, e.name));
  } catch {
    return [];
  }
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function artifactSuffix(name, prefix) {
  return name.startsWith(prefix) ? name.slice(prefix.length) : "";
}

function runRenderOne({ repoRoot, candidatesFile, reviewFile, rewritesFile, dryRun, allowUnreviewedRewrite }) {
  const script = path.join(repoRoot, "scripts/translation-ghaw/render-translations.mjs");
  const args = [
    script,
    "--repo-root",
    repoRoot,
    "--candidates-file",
    candidatesFile,
    "--review-file",
    reviewFile,
    "--dry-run",
    String(dryRun),
  ];
  if (rewritesFile) {
    args.push("--rewrites-file", rewritesFile);
  }
  if (allowUnreviewedRewrite) {
    args.push("--allow-unreviewed-rewrite", "true");
  }

  const stdout = execFileSync("node", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return parseJsonLoose(stdout, null);
}

async function main() {
  const args = parseArgs(process.argv);
  const repoRoot = path.resolve(args["repo-root"] || process.cwd());
  const artifactsRoot = path.resolve(args["artifacts-root"] || "");
  const dryRun = toBool(args["dry-run"], false);
  const allowUnreviewedRewrite = toBool(args["allow-unreviewed-rewrite"], false);

  if (!artifactsRoot) {
    throw new Error("--artifacts-root is required");
  }

  const dirs = await listArtifactDirs(artifactsRoot);
  const byName = new Map(dirs.map((d) => [path.basename(d), d]));
  const candidateNames = [...byName.keys()].filter((name) => name.startsWith("translate-candidates-"));

  const summary = {
    version: 1,
    dry_run: dryRun,
    allow_unreviewed_rewrite: allowUnreviewedRewrite,
    processed: [],
    skipped: [],
    errors: [],
    render_summaries: [],
    totals: {
      articles_seen: 0,
      outputs: 0,
      skipped_outputs: 0,
      errors: 0,
      writes_attempted: 0,
    },
  };

  for (const candidateArtifactName of candidateNames.sort()) {
    summary.totals.articles_seen += 1;
    const suffix = artifactSuffix(candidateArtifactName, "translate-candidates-");
    const candidateDir = byName.get(candidateArtifactName);
    const reviewDir = byName.get(`review-result-${suffix}`);
    const rewritesDir = byName.get(`review-rewrites-${suffix}`);

    const candidatesFile = path.join(candidateDir, "candidates.json");
    const reviewFile = reviewDir ? path.join(reviewDir, "review.json") : "";
    const rewritesFile = rewritesDir ? path.join(rewritesDir, "rewrites.json") : "";

    if (!(await fileExists(candidatesFile))) {
      summary.errors.push({ task_id: suffix, error: "Missing candidates.json" });
      continue;
    }
    if (!reviewDir || !(await fileExists(reviewFile))) {
      summary.skipped.push({ task_id: suffix, reason: "Missing review artifact" });
      continue;
    }

    try {
      const renderSummary = runRenderOne({
        repoRoot,
        candidatesFile,
        reviewFile,
        rewritesFile: (await fileExists(rewritesFile)) ? rewritesFile : "",
        dryRun,
        allowUnreviewedRewrite,
      });

      summary.processed.push({ task_id: suffix, status: "rendered" });
      summary.render_summaries.push({ task_id: suffix, summary: renderSummary });
      summary.totals.outputs += Array.isArray(renderSummary?.outputs) ? renderSummary.outputs.length : 0;
      summary.totals.skipped_outputs += Array.isArray(renderSummary?.skipped) ? renderSummary.skipped.length : 0;
      summary.totals.errors += Array.isArray(renderSummary?.errors) ? renderSummary.errors.length : 0;
      summary.totals.writes_attempted += Array.isArray(renderSummary?.outputs)
        ? renderSummary.outputs.filter((o) => o?.written === true).length
        : 0;
    } catch (err) {
      summary.errors.push({ task_id: suffix, error: String(err?.message || err) });
      summary.totals.errors += 1;
    }
  }

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
