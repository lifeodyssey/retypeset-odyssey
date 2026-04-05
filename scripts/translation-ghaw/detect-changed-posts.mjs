#!/usr/bin/env node

import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs, parseFrontmatter, parseJsonLoose } from "./lib/core.mjs";

const SOURCE_EXT_RE = /\.(md|mdx)$/i;
const GENERATED_LANG_SUFFIX_RE = /\.(zh|en|ja)\.(md|mdx)$/i;
const ZERO_SHA_RE = /^0+$/;

function isTruthy(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

function git(repoRoot, args) {
  return execFileSync("git", ["-C", repoRoot, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function maybeGit(repoRoot, args) {
  try {
    return git(repoRoot, args);
  } catch {
    return "";
  }
}

function normalizeSha(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (ZERO_SHA_RE.test(raw)) return "";
  return raw;
}

function buildTaskId(changeType, filePath) {
  const digest = crypto.createHash("sha256").update(`${changeType}:${filePath}`).digest("hex");
  return digest.slice(0, 12);
}

function parseDiffNameStatus(text) {
  if (!text) return [];
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\t+/);
      if (parts.length < 2) return null;
      const [statusRaw, filePath] = parts;
      const changeType = String(statusRaw || "").charAt(0).toUpperCase();
      return { change_type: changeType, path: String(filePath || "") };
    })
    .filter(Boolean);
}

function isEligibleSourcePath(filePath) {
  const p = String(filePath || "");
  if (!p.startsWith("content/posts/")) return false;
  if (!SOURCE_EXT_RE.test(p)) return false;
  if (GENERATED_LANG_SUFFIX_RE.test(p)) return false;
  return true;
}

async function isManagedTranslation(repoRoot, relPath) {
  try {
    const raw = await fs.readFile(path.join(repoRoot, relPath), "utf8");
    const { data } = parseFrontmatter(raw);
    return (
      data.translation_generated === true ||
      String(data.translation_generated || "").trim().toLowerCase() === "true"
    );
  } catch {
    return false;
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const repoRoot = path.resolve(args["repo-root"] || process.cwd());
  const headSha = normalizeSha(args.head || process.env.HEAD_SHA || "HEAD") || "HEAD";
  let baseSha = normalizeSha(args.base || process.env.BASE_SHA || "");
  const includeManagedTranslations = isTruthy(
    args["include-managed-translations"] || process.env.INCLUDE_MANAGED_TRANSLATIONS || "false"
  );
  const outputFile = args["output-file"] ? path.resolve(args["output-file"]) : "";

  if (!baseSha) {
    // Fallback for manual runs or first push-like contexts.
    baseSha = maybeGit(repoRoot, ["rev-parse", `${headSha}^`]);
  }

  let diffText = "";
  if (baseSha) {
    diffText = maybeGit(repoRoot, [
      "diff",
      "--name-status",
      "--diff-filter=AM",
      baseSha,
      headSha,
      "--",
      "content/posts",
    ]);
  } else {
    diffText = maybeGit(repoRoot, [
      "diff-tree",
      "--root",
      "--name-status",
      "--diff-filter=AM",
      "-r",
      headSha,
      "--",
      "content/posts",
    ]);
  }

  const diffRows = parseDiffNameStatus(diffText);
  const filtered = [];
  const skipped = [];

  for (const row of diffRows) {
    if (!isEligibleSourcePath(row.path)) {
      skipped.push({ path: row.path, reason: "not source post path or is translated suffix" });
      continue;
    }
    if (!includeManagedTranslations && (await isManagedTranslation(repoRoot, row.path))) {
      skipped.push({ path: row.path, reason: "translation_generated source file" });
      continue;
    }
    filtered.push({
      task_id: buildTaskId(row.change_type, row.path),
      path: row.path,
      change_type: row.change_type,
    });
  }

  const dedupedMap = new Map();
  for (const row of filtered) {
    if (!dedupedMap.has(row.path)) {
      dedupedMap.set(row.path, row);
      continue;
    }
    // Prefer "A" if somehow both A and M appear in combined input.
    const prev = dedupedMap.get(row.path);
    if (prev.change_type !== "A" && row.change_type === "A") dedupedMap.set(row.path, row);
  }
  const articles = [...dedupedMap.values()];

  const plan = {
    version: 1,
    source_ref: {
      base_sha: baseSha || null,
      head_sha: headSha === "HEAD" ? maybeGit(repoRoot, ["rev-parse", "HEAD"]) || null : headSha,
    },
    settings: {
      diff_filter: "AM",
      include_managed_translations: includeManagedTranslations,
    },
    articles,
    matrix: {
      include: articles.map((a) => ({
        task_id: a.task_id,
        article_path: a.path,
        change_type: a.change_type,
      })),
    },
    summary: {
      total_diff_rows: diffRows.length,
      eligible_articles: articles.length,
      skipped: skipped.length,
    },
    skipped,
  };

  const rendered = `${JSON.stringify(plan, null, 2)}\n`;
  if (outputFile) {
    await fs.mkdir(path.dirname(outputFile), { recursive: true });
    await fs.writeFile(outputFile, rendered, "utf8");
  }
  process.stdout.write(rendered);
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
