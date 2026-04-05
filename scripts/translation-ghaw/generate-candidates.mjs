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
  callGeminiGenerateContent,
} from "./lib/core.mjs";

function parseCandidateResult(text, provider, candidateId) {
  const parsed = extractJsonObject(text);
  if (!parsed) {
    throw new Error(`${provider} candidate ${candidateId} did not return JSON`);
  }
  return {
    provider,
    candidate_id: candidateId,
    title: String(parsed.title || "").trim(),
    body_markdown: String(parsed.body_markdown || parsed.body || "").trim(),
  };
}

async function anthropicTranslate({
  systemPrompt,
  sourceLang,
  targetLang,
  articlePath,
  title,
  body,
  variantIndex,
}) {
  const userText = [
    `Translate the markdown article from ${sourceLang} to ${targetLang}.`,
    `Target language code: ${targetLang}`,
    `Variant index: ${variantIndex + 1}`,
    `Article path: ${articlePath}`,
    "",
    `Source title: ${title || "(empty)"}`,
    "",
    "Source markdown body:",
    body,
  ].join("\n");

  const { text } = await callAnthropicMessages({
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.ANTHROPIC_MODEL,
    baseUrl: process.env.ANTHROPIC_BASE_URL || process.env.ANTHROPIC_API_BASE_URL,
    customHeaders: parseCustomHeaders(process.env.ANTHROPIC_CUSTOM_HEADERS || ""),
    system: systemPrompt,
    userText,
    maxTokens: 4000,
    temperature: Math.min(0.6, 0.15 + variantIndex * 0.15),
  });
  return parseCandidateResult(text, "anthropic", `anthropic-${variantIndex + 1}`);
}

async function geminiTranslate({
  systemPrompt,
  sourceLang,
  targetLang,
  articlePath,
  title,
  body,
  variantIndex,
}) {
  const userText = [
    `Translate the markdown article from ${sourceLang} to ${targetLang}.`,
    `Target language code: ${targetLang}`,
    `Variant index: ${variantIndex + 1}`,
    `Article path: ${articlePath}`,
    "",
    `Source title: ${title || "(empty)"}`,
    "",
    "Source markdown body:",
    body,
  ].join("\n");

  const { text } = await callGeminiGenerateContent({
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL,
    baseUrl: process.env.GOOGLE_GEMINI_BASE_URL || process.env.GEMINI_API_BASE_URL || process.env.GEMINI_API_BASE_URL,
    customHeaders: parseCustomHeaders(process.env.GEMINI_CUSTOM_HEADERS || ""),
    system: systemPrompt,
    userText,
    temperature: Math.min(0.6, 0.15 + variantIndex * 0.15),
  });
  return parseCandidateResult(text, "gemini", `gemini-${variantIndex + 1}`);
}

function buildDryRunCandidate(provider, sourceTitle, body, targetLang, index) {
  return {
    provider,
    candidate_id: `${provider}-${index + 1}`,
    title: `[${targetLang}] ${sourceTitle || "Untitled"}`,
    body_markdown: `<!-- dry-run candidate ${provider}-${index + 1} -->\n\n${body}`,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const repoRoot = path.resolve(args["repo-root"] || process.cwd());
  const payload = parseJsonLoose(args["payload-json"] || process.env.PAYLOAD_JSON || "", null);
  const classificationFile = args["classification-file"];
  const dryRun = toBool(args["dry-run"], false);

  if (!payload?.article?.path) throw new Error("payload.article.path is required");
  if (!classificationFile) throw new Error("--classification-file is required");

  const classification = parseJsonLoose(await fs.readFile(path.resolve(classificationFile), "utf8"), null);
  if (!classification || typeof classification !== "object") throw new Error("Invalid classification file JSON");

  const articlePath = String(payload.article.path);
  const article = await readArticle(repoRoot, articlePath);
  const sourceLang = classification.source_lang || "zh";
  const targets = Array.isArray(classification.target_langs) ? classification.target_langs : [];
  const frontmatter = article.frontmatter || {};
  const sourceTitle = String(frontmatter.title || "");
  const sourceBody = article.body;
  const variantsPerProvider = Math.max(1, Math.min(4, Number(process.env.VARIANTS_PER_PROVIDER || "2")));

  if (classification.status !== "classification_pass" || !classification.gating?.should_translate) {
    const result = {
      version: 1,
      article_path: articlePath,
      source_lang: sourceLang,
      classification,
      status: "skip",
      targets: targets.map((lang) => ({ lang, status: "skipped", candidates: [] })),
      errors: [],
    };
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  const systemPrompt = await readPrompt(repoRoot, [
    "scripts/translation/prompts/translate-system.txt",
    "scripts/translation-ghaw/prompts/translate-system.txt",
  ]);

  const result = {
    version: 1,
    article_path: articlePath,
    source_lang: sourceLang,
    classification,
    status: "candidates_generated",
    targets: [],
    errors: [],
  };

  for (const targetLang of targets) {
    const targetEntry = {
      lang: targetLang,
      status: "candidates_ready",
      candidates: [],
      errors: [],
    };

    for (let i = 0; i < variantsPerProvider; i += 1) {
      if (dryRun || !process.env.ANTHROPIC_API_KEY || !process.env.ANTHROPIC_MODEL) {
        targetEntry.candidates.push(buildDryRunCandidate("anthropic", sourceTitle, sourceBody, targetLang, i));
      } else {
        try {
          targetEntry.candidates.push(
            await anthropicTranslate({
              systemPrompt,
              sourceLang,
              targetLang,
              articlePath,
              title: sourceTitle,
              body: sourceBody,
              variantIndex: i,
            })
          );
        } catch (err) {
          targetEntry.errors.push({ provider: "anthropic", variant: i + 1, error: String(err?.message || err) });
        }
      }
    }

    for (let i = 0; i < variantsPerProvider; i += 1) {
      if (dryRun || !process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) {
        targetEntry.candidates.push(buildDryRunCandidate("gemini", sourceTitle, sourceBody, targetLang, i));
      } else {
        try {
          targetEntry.candidates.push(
            await geminiTranslate({
              systemPrompt,
              sourceLang,
              targetLang,
              articlePath,
              title: sourceTitle,
              body: sourceBody,
              variantIndex: i,
            })
          );
        } catch (err) {
          targetEntry.errors.push({ provider: "gemini", variant: i + 1, error: String(err?.message || err) });
        }
      }
    }

    if (!targetEntry.candidates.length) {
      targetEntry.status = "failed";
      result.errors.push({ target_lang: targetLang, error: "No candidates generated" });
    }

    result.targets.push(targetEntry);
  }

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});

