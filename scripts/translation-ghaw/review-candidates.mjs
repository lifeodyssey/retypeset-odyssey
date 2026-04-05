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
  callGeminiGenerateContent,
  clamp100,
} from "./lib/core.mjs";
import { getStyleContext, formatStyleContext } from "./lib/style-context.mjs";

function normalizeReviewResponse(parsed, candidateId) {
  const score = clamp100(parsed.score, 0);
  const passed = typeof parsed.passed === "boolean" ? parsed.passed : score >= 80;
  return {
    candidate_id: candidateId,
    score,
    passed,
    summary: String(parsed.summary || "").trim(),
    major_issues: Array.isArray(parsed.major_issues) ? parsed.major_issues.map(String) : [],
    minor_issues: Array.isArray(parsed.minor_issues) ? parsed.minor_issues.map(String) : [],
  };
}

async function reviewOneCandidate({ systemPrompt, sourceLang, targetLang, articlePath, sourceTitle, sourceBody, candidate }) {
  const repoRoot = process.env.REPO_ROOT_FOR_STYLE_CONTEXT || "";
  const styleRefsText = repoRoot
    ? formatStyleContext(
        getStyleContext({
          repoRoot,
          sourceArticlePath: articlePath,
          sourceMeta: {
            title: sourceTitle,
            // tags/categories can be added later by richer frontmatter parsing
            tags: [],
            categories: [],
          },
          sourceLang,
          targetLang,
          limit: 3,
        })
      )
    : "";
  const userText = [
    `You are reviewing a translation candidate from ${sourceLang} to ${targetLang}.`,
    `Article path: ${articlePath}`,
    "",
    `Source title: ${sourceTitle || "(empty)"}`,
    "Source markdown body:",
    sourceBody,
    "",
    `Candidate id: ${candidate.candidate_id}`,
    `Candidate provider: ${candidate.provider}`,
    `Candidate title: ${candidate.title || "(empty)"}`,
    "Candidate markdown body:",
    candidate.body_markdown || "",
    "",
    "Style references from similar historical posts (use as style guidance only; do not copy content):",
    styleRefsText || "(none)",
  ].join("\n");

  const { text } = await callGeminiGenerateContent({
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL,
    baseUrl: process.env.GOOGLE_GEMINI_BASE_URL || process.env.GEMINI_API_BASE_URL,
    customHeaders: parseCustomHeaders(process.env.GEMINI_CUSTOM_HEADERS || ""),
    system: systemPrompt,
    userText,
    temperature: 0,
  });

  const obj = extractJsonObject(text);
  if (!obj) throw new Error(`Gemini review returned non-JSON for ${candidate.candidate_id}`);
  return normalizeReviewResponse(obj, candidate.candidate_id);
}

function dryRunReview(candidate, minScore) {
  const providerBias = candidate.provider === "gemini" ? 2 : 0;
  const score = Math.min(99, minScore + providerBias + 5);
  return {
    candidate_id: candidate.candidate_id,
    score,
    passed: score >= minScore,
    summary: "Dry-run heuristic review; accepted placeholder candidate.",
    major_issues: [],
    minor_issues: [],
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const repoRoot = path.resolve(args["repo-root"] || process.cwd());
  const dryRun = toBool(args["dry-run"], false);
  const payload = parseJsonLoose(args["payload-json"] || process.env.PAYLOAD_JSON || "", null);
  const candidatesFile = args["candidates-file"];
  const minScore = Math.max(0, Math.min(100, Number(process.env.VERIFICATION_MIN_SCORE || "80")));

  let candidatesPayload = null;
  if (candidatesFile) {
    candidatesPayload = parseJsonLoose(await fs.readFile(path.resolve(candidatesFile), "utf8"), null);
  } else if (payload) {
    candidatesPayload = payload;
  }
  if (!candidatesPayload?.article_path || !Array.isArray(candidatesPayload.targets)) {
    throw new Error("Need candidates payload with article_path and targets[]");
  }

  const articlePath = String(candidatesPayload.article_path);
  const article = await readArticle(repoRoot, articlePath);
  const sourceTitle = String(article.frontmatter?.title || "");
  const sourceBody = article.body;
  const sourceLang = candidatesPayload.source_lang || "zh";
  process.env.REPO_ROOT_FOR_STYLE_CONTEXT = repoRoot;

  const systemPrompt = await readPrompt(repoRoot, [
    "scripts/translation/prompts/verify-system.txt",
    "scripts/translation-ghaw/prompts/verify-system.txt",
  ]);

  const out = {
    version: 1,
    article_path: articlePath,
    source_lang: sourceLang,
    classification: candidatesPayload.classification || null,
    targets: [],
    errors: [],
  };

  for (const target of candidatesPayload.targets) {
    const targetLang = String(target.lang || "");
    const candidates = Array.isArray(target.candidates) ? target.candidates : [];
    if (!targetLang) continue;

    if (!candidates.length) {
      out.targets.push({
        lang: targetLang,
        status: "failed",
        score: 0,
        selected_candidate_id: null,
        review_notes: "No candidates available for review.",
      });
      continue;
    }

    const reviews = [];
    for (const candidate of candidates) {
      try {
        const review = dryRun || !process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL
          ? dryRunReview(candidate, minScore)
          : await reviewOneCandidate({
              systemPrompt,
              sourceLang,
              targetLang,
              articlePath,
              sourceTitle,
              sourceBody,
              candidate,
            });
        reviews.push(review);
      } catch (err) {
        reviews.push({
          candidate_id: candidate.candidate_id,
          score: 0,
          passed: false,
          summary: `Review error: ${String(err?.message || err)}`,
          major_issues: ["Reviewer error"],
          minor_issues: [],
        });
      }
    }

    reviews.sort((a, b) => b.score - a.score);
    const best = reviews[0];
    const selected = candidates.find((c) => c.candidate_id === best.candidate_id) || candidates[0];
    const passed = Boolean(best.passed) && best.score >= minScore;

    if (passed) {
      out.targets.push({
        lang: targetLang,
        status: "accepted",
        score: best.score,
        selected_candidate_id: best.candidate_id,
        final_title: selected.title || null,
        final_body_markdown: selected.body_markdown || "",
        review_notes: best.summary || "",
        candidate_reviews: reviews,
      });
    } else {
      out.targets.push({
        lang: targetLang,
        status: "revise_required",
        score: best.score,
        selected_candidate_id: best.candidate_id,
        revision_feedback: [
          ...(best.major_issues || []),
          ...(best.minor_issues || []),
        ].filter(Boolean),
        review_notes: best.summary || "",
        candidate_reviews: reviews,
      });
    }
  }

  process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
