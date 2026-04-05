#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import {
  parseArgs,
  parseJsonLoose,
  toBool,
  extractJsonObject,
  parseCustomHeaders,
  readArticle,
  readPrompt,
  callAnthropicMessages,
} from "./lib/core.mjs";

function findCandidate(target, candidateId) {
  const list = Array.isArray(target?.candidates) ? target.candidates : [];
  return list.find((c) => c?.candidate_id === candidateId) || list[0] || null;
}

function parseRewriteResult(text) {
  const obj = extractJsonObject(text);
  if (!obj) throw new Error("Anthropic rewrite response did not contain JSON");
  return {
    title: String(obj.title || "").trim(),
    body_markdown: String(obj.body_markdown || obj.body || "").trim(),
  };
}

async function rewriteWithAnthropic({
  systemPrompt,
  sourceLang,
  targetLang,
  articlePath,
  sourceTitle,
  sourceBody,
  candidate,
  feedback,
}) {
  const userText = [
    `Revise the translated markdown from ${sourceLang} to ${targetLang}.`,
    `Article path: ${articlePath}`,
    "",
    `Source title: ${sourceTitle || "(empty)"}`,
    "Source markdown body:",
    sourceBody,
    "",
    `Current translated title: ${candidate.title || "(empty)"}`,
    "Current translated markdown body:",
    candidate.body_markdown || "",
    "",
    "Reviewer feedback to address:",
    ...(feedback.length ? feedback.map((x, i) => `${i + 1}. ${x}`) : ["1. Improve quality while preserving meaning and structure."]),
  ].join("\n");

  const { text } = await callAnthropicMessages({
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.ANTHROPIC_MODEL,
    baseUrl: process.env.ANTHROPIC_BASE_URL || process.env.ANTHROPIC_API_BASE_URL,
    customHeaders: parseCustomHeaders(process.env.ANTHROPIC_CUSTOM_HEADERS || ""),
    system: systemPrompt,
    userText,
    maxTokens: 4000,
    temperature: 0.15,
  });
  return parseRewriteResult(text);
}

async function main() {
  const args = parseArgs(process.argv);
  const repoRoot = path.resolve(args["repo-root"] || process.cwd());
  const dryRun = toBool(args["dry-run"], false);

  const candidatesFile = args["candidates-file"];
  const reviewFile = args["review-file"];
  if (!candidatesFile) throw new Error("--candidates-file is required");
  if (!reviewFile) throw new Error("--review-file is required");

  const candidatesPayload = parseJsonLoose(await fs.readFile(path.resolve(candidatesFile), "utf8"), null);
  const reviewPayload = parseJsonLoose(await fs.readFile(path.resolve(reviewFile), "utf8"), null);
  if (!candidatesPayload?.article_path || !Array.isArray(candidatesPayload.targets)) {
    throw new Error("Invalid candidates payload");
  }
  if (!reviewPayload?.article_path || !Array.isArray(reviewPayload.targets)) {
    throw new Error("Invalid review payload");
  }

  const articlePath = String(candidatesPayload.article_path);
  const article = await readArticle(repoRoot, articlePath);
  const sourceTitle = String(article.frontmatter?.title || "");
  const sourceBody = article.body;
  const sourceLang = candidatesPayload.source_lang || reviewPayload.source_lang || "zh";

  const systemPrompt = await readPrompt(repoRoot, [
    "scripts/translation-ghaw/prompts/rewrite-system.txt",
  ]);

  const out = {
    version: 1,
    article_path: articlePath,
    source_lang: sourceLang,
    targets: [],
    errors: [],
  };

  for (const reviewTarget of reviewPayload.targets) {
    const lang = String(reviewTarget.lang || "");
    if (!lang) continue;

    const candidateTarget = (candidatesPayload.targets || []).find((t) => t?.lang === lang);
    if (!candidateTarget) {
      out.targets.push({
        lang,
        status: "rewrite_failed",
        source_candidate_id: reviewTarget.selected_candidate_id || null,
        error: "No matching candidate target found",
      });
      continue;
    }

    if (reviewTarget.status !== "revise_required") {
      out.targets.push({
        lang,
        status: "no_rewrite_needed",
        source_candidate_id: reviewTarget.selected_candidate_id || null,
      });
      continue;
    }

    const candidate = findCandidate(candidateTarget, reviewTarget.selected_candidate_id);
    if (!candidate) {
      out.targets.push({
        lang,
        status: "rewrite_failed",
        source_candidate_id: reviewTarget.selected_candidate_id || null,
        error: "Selected candidate not found",
      });
      continue;
    }

    const feedback = Array.isArray(reviewTarget.revision_feedback)
      ? reviewTarget.revision_feedback.map(String).filter(Boolean)
      : [];

    try {
      let revised;
      if (dryRun || !process.env.ANTHROPIC_API_KEY || !process.env.ANTHROPIC_MODEL) {
        revised = {
          title: candidate.title || "",
          body_markdown: `<!-- dry-run rewrite for ${lang} -->\n\n${candidate.body_markdown || ""}`,
        };
      } else {
        revised = await rewriteWithAnthropic({
          systemPrompt,
          sourceLang,
          targetLang: lang,
          articlePath,
          sourceTitle,
          sourceBody,
          candidate,
          feedback,
        });
      }

      out.targets.push({
        lang,
        status: "rewritten",
        source_candidate_id: candidate.candidate_id,
        review_feedback: feedback,
        revised_candidate: {
          provider: "anthropic_rewrite",
          candidate_id: `anthropic-rewrite-${lang}`,
          title: revised.title,
          body_markdown: revised.body_markdown,
        },
      });
    } catch (err) {
      out.targets.push({
        lang,
        status: "rewrite_failed",
        source_candidate_id: candidate.candidate_id,
        error: String(err?.message || err),
      });
      out.errors.push({ lang, error: String(err?.message || err) });
    }
  }

  process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});

