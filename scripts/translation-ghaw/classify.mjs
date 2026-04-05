#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      args[key] = next;
      i += 1;
    } else {
      args[key] = "true";
    }
  }
  return args;
}

function toBool(value, defaultValue = false) {
  if (value == null) return defaultValue;
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function parseJsonLoose(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function parseFrontmatter(markdown) {
  if (!markdown.startsWith("---")) {
    return { data: {}, body: markdown };
  }

  const end = markdown.indexOf("\n---", 3);
  if (end === -1) {
    return { data: {}, body: markdown };
  }

  const raw = markdown.slice(4, end).replace(/\r\n/g, "\n");
  const body = markdown.slice(end + 4).replace(/^\n/, "");
  const data = {};

  for (const line of raw.split("\n")) {
    if (!line || /^\s*#/.test(line)) continue;
    const m = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    let [, key, value] = m;
    value = value.trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (value === "true") data[key] = true;
    else if (value === "false") data[key] = false;
    else data[key] = value;
  }

  return { data, body };
}

function detectSourceLang(filePath, frontmatterLang, fallbackLang = "zh") {
  const candidate = String(frontmatterLang || "").trim().toLowerCase();
  if (["zh", "en", "ja"].includes(candidate)) return candidate;

  const base = path.basename(filePath).toLowerCase();
  if (base.includes(".zh.")) return "zh";
  if (base.includes(".en.")) return "en";
  if (base.includes(".ja.")) return "ja";
  return fallbackLang;
}

function targetLangsFor(sourceLang, matrix, allLangs = ["zh", "en", "ja"]) {
  const list = Array.isArray(matrix?.[sourceLang]) ? matrix[sourceLang] : allLangs.filter((x) => x !== sourceLang);
  return list.filter((x) => x !== sourceLang && allLangs.includes(x));
}

function extractJsonObject(text) {
  if (!text) return null;
  const direct = parseJsonLoose(text, null);
  if (direct && typeof direct === "object") return direct;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  return parseJsonLoose(match[0], null);
}

function parseCustomHeaders(raw) {
  if (!raw) return {};

  const asJson = parseJsonLoose(raw, null);
  if (asJson && typeof asJson === "object" && !Array.isArray(asJson)) {
    return Object.fromEntries(
      Object.entries(asJson)
        .filter(([k, v]) => typeof k === "string" && v != null)
        .map(([k, v]) => [k, String(v)])
    );
  }

  const headers = {};
  const parts = String(raw).split(/\n|;/).map((s) => s.trim()).filter(Boolean);
  for (const part of parts) {
    const idx = part.indexOf(":");
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!key) continue;
    headers[key] = value;
  }
  return headers;
}

function heuristicClassify({ title, body }) {
  const text = `${title}\n${body}`.toLowerCase();
  const hasCodeFence = body.includes("```");
  const techHits = [
    "algorithm",
    "leetcode",
    "model",
    "training",
    "python",
    "typescript",
    "javascript",
    "node",
    "api",
    "database",
    "docker",
    "kubernetes",
    "linux",
    "机器学习",
    "深度学习",
    "算法",
    "编程",
    "代码",
    "工程",
    "论文",
    "模型",
  ].reduce((acc, kw) => acc + (text.includes(kw) ? 1 : 0), 0);

  const diaryHits = [
    "today",
    "yesterday",
    "feel",
    "life",
    "mood",
    "朋友",
    "心情",
    "生活",
    "今天",
    "昨天",
    "旅行",
    "感受",
    "回忆",
  ].reduce((acc, kw) => acc + (text.includes(kw) ? 1 : 0), 0);

  const shortBody = body.trim().length < 500;

  if (hasCodeFence || techHits >= 3) {
    return {
      label: "tech_share",
      confidence: hasCodeFence ? 0.82 : 0.75,
      reason: "Heuristic fallback: technical keywords/code fences suggest public technical sharing.",
      provider: "heuristic_fallback",
    };
  }

  if (diaryHits >= 2 && !hasCodeFence) {
    return {
      label: "diary_life",
      confidence: 0.68,
      reason: "Heuristic fallback: life/emotion narration signals diary-style writing.",
      provider: "heuristic_fallback",
    };
  }

  return {
    label: shortBody ? "personal_note" : "diary_life",
    confidence: shortBody ? 0.62 : 0.55,
    reason: shortBody
      ? "Heuristic fallback: concise and note-like content without strong public tutorial signals."
      : "Heuristic fallback: no strong technical or note-only signals; treat as personal diary/life.",
    provider: "heuristic_fallback",
  };
}

async function callAnthropicClassifier({
  systemPrompt,
  title,
  body,
  sourceLang,
  articlePath,
  apiKey,
  model,
  baseUrl,
  customHeaders,
}) {
  const endpoint = `${(baseUrl || "https://api.anthropic.com").replace(/\/+$/, "")}/v1/messages`;
  const userPayload = [
    `Article path: ${articlePath}`,
    `Source language: ${sourceLang}`,
    `Title: ${title || "(empty)"}`,
    "",
    "Content (possibly truncated):",
    body.slice(0, 12000),
  ].join("\n");

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      ...customHeaders,
    },
    body: JSON.stringify({
      model,
      max_tokens: 300,
      temperature: 0,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: userPayload }],
        },
      ],
    }),
    signal: AbortSignal.timeout(30_000),
  });

  const rawText = await res.text();
  if (!res.ok) {
    const err = new Error(`Anthropic classify request failed (${res.status}): ${rawText.slice(0, 500)}`);
    err.status = res.status;
    throw err;
  }

  const parsed = parseJsonLoose(rawText, null);
  const contentText = parsed?.content?.map((c) => c?.text || "").join("\n").trim() || "";
  const extracted = extractJsonObject(contentText);
  if (!extracted) {
    throw new Error(`Anthropic classify response did not contain valid JSON: ${contentText.slice(0, 500)}`);
  }

  const rawLabel = String(extracted.label || extracted.type || "").trim();
  const label = ["tech_share", "personal_note", "diary_life"].includes(rawLabel) ? rawLabel : "personal_note";
  const confidenceNum = Number(extracted.confidence);
  const confidence = Number.isFinite(confidenceNum) ? Math.max(0, Math.min(1, confidenceNum)) : 0.5;
  const reason = String(extracted.reason || extracted.rationale || "No rationale provided.").slice(0, 500);

  return {
    label,
    confidence,
    reason,
    provider: "anthropic",
    model,
  };
}

async function readPrompt(repoRoot) {
  const candidates = [
    path.join(repoRoot, "scripts/translation-ghaw/prompts/classify-system.txt"),
    path.join(repoRoot, "scripts/translation/prompts/classify-system.txt"),
  ];
  for (const p of candidates) {
    try {
      return await fs.readFile(p, "utf8");
    } catch {}
  }
  throw new Error("Missing classify system prompt file.");
}

async function main() {
  const args = parseArgs(process.argv);
  const payload = parseJsonLoose(args["payload-json"] || process.env.PAYLOAD_JSON || "", null);
  if (!payload || typeof payload !== "object") {
    throw new Error("Missing or invalid payload JSON. Pass --payload-json '<json>'.");
  }

  const repoRoot = path.resolve(args["repo-root"] || process.cwd());
  const dryRun = toBool(args["dry-run"], false);
  const articlePath = String(payload.article?.path || "").trim();
  if (!articlePath) throw new Error("payload.article.path is required.");

  const absPath = path.join(repoRoot, articlePath);
  const markdown = await fs.readFile(absPath, "utf8");
  const { data, body } = parseFrontmatter(markdown);
  const sourceLang = detectSourceLang(articlePath, data.lang, process.env.DEFAULT_SOURCE_LANG || "zh");
  const title = String(data.title || "").trim();

  const targetMatrix = parseJsonLoose(process.env.TRANSLATION_TARGET_MATRIX_JSON || "", {
    zh: ["en", "ja"],
    en: ["zh", "ja"],
    ja: ["zh", "en"],
  });
  const targetLangs = targetLangsFor(sourceLang, targetMatrix);

  const threshold = Number(process.env.CLASSIFICATION_CONFIDENCE_THRESHOLD || "0.75");
  const translationGenerated = data.translation_generated === true || String(data.translation_generated || "").toLowerCase() === "true";
  const translationDirective = String(data.translation || "").trim().toLowerCase();

  let classification;
  let error = null;

  if (!dryRun && process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_MODEL) {
    try {
      const systemPrompt = await readPrompt(repoRoot);
      classification = await callAnthropicClassifier({
        systemPrompt,
        title,
        body,
        sourceLang,
        articlePath,
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: process.env.ANTHROPIC_MODEL,
        baseUrl: process.env.ANTHROPIC_BASE_URL || process.env.ANTHROPIC_API_BASE_URL,
        customHeaders: parseCustomHeaders(process.env.ANTHROPIC_CUSTOM_HEADERS || ""),
      });
    } catch (err) {
      error = String(err?.message || err);
    }
  }

  if (!classification) {
    classification = heuristicClassify({ title, body });
  }

  const forced = translationDirective === "force";
  const skipped = translationDirective === "skip";
  const eligibleByClass = classification.label === "tech_share" && classification.confidence >= (Number.isFinite(threshold) ? threshold : 0.75);
  const shouldTranslate = !translationGenerated && !skipped && (forced || eligibleByClass);

  const result = {
    version: 1,
    article_path: articlePath,
    source_lang: sourceLang,
    target_langs: targetLangs,
    frontmatter: {
      title,
      lang: data.lang ?? null,
      translation: data.translation ?? null,
      translation_generated: translationGenerated,
    },
    classification,
    gating: {
      forced,
      skipped,
      confidence_threshold: Number.isFinite(threshold) ? threshold : 0.75,
      eligible_by_class: eligibleByClass,
      should_translate: shouldTranslate,
    },
    status: shouldTranslate ? "classification_pass" : "classification_skip",
    error,
  };

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
