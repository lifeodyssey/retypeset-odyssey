#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import {
  parseArgs,
  parseJsonLoose,
  toBool,
  parseFrontmatter,
  readArticle,
  toYamlScalar,
  escapeRegex,
} from "./lib/core.mjs";

function splitFrontmatterLines(markdown) {
  const match = markdown.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!match) return { frontmatter: "", body: markdown, hasFrontmatter: false };
  return { frontmatter: match[1], body: match[2] || "", hasFrontmatter: true };
}

function setOrInsertScalar(lines, key, serializedValue) {
  const keyRe = new RegExp(`^${escapeRegex(key)}:\\s*`);
  const idx = lines.findIndex(line => keyRe.test(line));
  const newLine = `${key}: ${serializedValue}`;
  if (idx >= 0) {
    lines[idx] = newLine;
    return;
  }
  if (key === "lang") {
    const titleIdx = lines.findIndex(line => /^title:\s*/.test(line));
    if (titleIdx >= 0) {
      lines.splice(titleIdx + 1, 0, newLine);
      return;
    }
  }
  lines.push(newLine);
}

function buildTranslatedFrontmatter(rawFrontmatter, { title, lang }) {
  const lines = String(rawFrontmatter || "")
    .split(/\r?\n/)
    .filter((line, idx, arr) => !(idx === arr.length - 1 && line.trim() === ""));
  const next = [...lines];
  setOrInsertScalar(next, "title", toYamlScalar(title));
  setOrInsertScalar(next, "lang", toYamlScalar(lang));
  setOrInsertScalar(next, "translation_generated", "true");
  return next.join("\n").trimEnd();
}

function deriveTargetPath(sourcePath, targetLang) {
  const m = sourcePath.match(/^(.*?)(\.(?:zh|en|ja))?(\.(?:md|mdx))$/i);
  if (!m) throw new Error(`Unsupported source path for translation output: ${sourcePath}`);
  const [, prefix, , ext] = m;
  return `${prefix}.${targetLang}${ext}`;
}

function pickTargetContent({ reviewTarget, rewriteTarget }) {
  if (reviewTarget?.status === "accepted") {
    return {
      source: "review_accepted",
      title: reviewTarget.final_title || "",
      body_markdown: reviewTarget.final_body_markdown || "",
      status: "ready",
    };
  }
  if (rewriteTarget?.status === "rewritten" && rewriteTarget?.revised_candidate) {
    return {
      source: "anthropic_rewrite_unreviewed",
      title: rewriteTarget.revised_candidate.title || "",
      body_markdown: rewriteTarget.revised_candidate.body_markdown || "",
      status: "rewritten_unreviewed",
    };
  }
  return null;
}

async function main() {
  const args = parseArgs(process.argv);
  const repoRoot = path.resolve(args["repo-root"] || process.cwd());
  const dryRun = toBool(args["dry-run"], false);
  const allowUnreviewedRewrite = toBool(args["allow-unreviewed-rewrite"], false);
  const updateExisting = toBool(process.env.UPDATE_EXISTING_TRANSLATIONS, true);
  const overwriteManual = toBool(process.env.OVERWRITE_MANUAL_TRANSLATIONS, false);

  const candidatesFile = path.resolve(args["candidates-file"] || "");
  const reviewFile = path.resolve(args["review-file"] || "");
  const rewritesFile = args["rewrites-file"] ? path.resolve(args["rewrites-file"]) : null;
  if (!candidatesFile || !reviewFile) {
    throw new Error("--candidates-file and --review-file are required");
  }

  const candidates = parseJsonLoose(await fs.readFile(candidatesFile, "utf8"), null);
  const review = parseJsonLoose(await fs.readFile(reviewFile, "utf8"), null);
  const rewrites = rewritesFile ? parseJsonLoose(await fs.readFile(rewritesFile, "utf8"), null) : { targets: [] };

  if (!candidates?.article_path || !Array.isArray(candidates.targets)) throw new Error("Invalid candidates payload");
  if (!review?.article_path || !Array.isArray(review.targets)) throw new Error("Invalid review payload");

  const sourcePath = String(candidates.article_path);
  const source = await readArticle(repoRoot, sourcePath);
  const { frontmatter: sourceMeta, markdown: sourceMarkdown, rawFrontmatter } = source;
  const sourceSplit = splitFrontmatterLines(sourceMarkdown);

  const summary = {
    version: 1,
    article_path: sourcePath,
    outputs: [],
    skipped: [],
    errors: [],
  };

  for (const reviewTarget of review.targets) {
    const lang = String(reviewTarget.lang || "");
    if (!lang) continue;
    const rewriteTarget = (rewrites?.targets || []).find(t => t?.lang === lang);
    const content = pickTargetContent({ reviewTarget, rewriteTarget });

    if (!content) {
      summary.skipped.push({ lang, reason: "No accepted or rewritten content available" });
      continue;
    }
    if (content.status === "rewritten_unreviewed" && !allowUnreviewedRewrite) {
      summary.skipped.push({ lang, reason: "Rewrite exists but re-review not completed" });
      continue;
    }

    const outputRel = deriveTargetPath(sourcePath, lang);
    const outputAbs = path.join(repoRoot, outputRel);

    let existingState = { exists: false, translationGenerated: false };
    try {
      const existingRaw = await fs.readFile(outputAbs, "utf8");
      const existing = parseFrontmatter(existingRaw);
      existingState = {
        exists: true,
        translationGenerated:
          existing.data.translation_generated === true ||
          String(existing.data.translation_generated || "").toLowerCase() === "true",
      };
    } catch {
      // no existing file
    }

    if (existingState.exists && !updateExisting) {
      summary.skipped.push({ lang, path: outputRel, reason: "UPDATE_EXISTING_TRANSLATIONS=false" });
      continue;
    }
    if (existingState.exists && !existingState.translationGenerated && !overwriteManual) {
      summary.skipped.push({ lang, path: outputRel, reason: "Manual translation file exists and overwrite is disabled" });
      continue;
    }

    const translatedFrontmatter = buildTranslatedFrontmatter(sourceSplit.hasFrontmatter ? rawFrontmatter : "", {
      title: content.title || sourceMeta.title || "",
      lang,
    });

    const rendered = `---\n${translatedFrontmatter}\n---\n\n${String(content.body_markdown || "").trimEnd()}\n`;
    if (!dryRun) {
      await fs.mkdir(path.dirname(outputAbs), { recursive: true });
      await fs.writeFile(outputAbs, rendered, "utf8");
    }

    summary.outputs.push({
      lang,
      path: outputRel,
      source: content.source,
      written: !dryRun,
      bytes: Buffer.byteLength(rendered, "utf8"),
    });
  }

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});

