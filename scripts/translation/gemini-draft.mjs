#!/usr/bin/env node

/**
 * gemini-draft.mjs --- Call Gemini 2.5 Pro (thinking mode) to produce a draft translation.
 *
 * Usage:
 *   node scripts/translation/gemini-draft.mjs \
 *     --source content/posts/my-post.md \
 *     --target-lang en \
 *     --style-refs /tmp/style-refs.txt \
 *     --repo-root /path/to/repo
 *
 * Environment variables:
 *   GEMINI_API_KEY        --- Required. API key for Gemini.
 *   GEMINI_API_BASE_URL   --- Required. Custom base URL for Gemini API.
 *
 * Outputs translated content to stdout. Logs to stderr.
 */

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

// ---------------------------------------------------------------------------
// Argument parsing (reuses pattern from existing translation-ghaw/lib/core.mjs)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Frontmatter parser (lightweight, same as core.mjs)
// ---------------------------------------------------------------------------

function parseFrontmatter(markdown) {
  if (!markdown.startsWith("---")) {
    return { data: {}, body: markdown, rawFrontmatter: "" };
  }
  const end = markdown.indexOf("\n---", 3);
  if (end === -1) {
    return { data: {}, body: markdown, rawFrontmatter: "" };
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
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (value === "true") data[key] = true;
    else if (value === "false") data[key] = false;
    else data[key] = value;
  }
  return { data, body, rawFrontmatter: raw };
}

// ---------------------------------------------------------------------------
// Gemini API call with thinking mode
// ---------------------------------------------------------------------------

function normalizeGeminiBaseUrl(baseUrl) {
  const base = (
    baseUrl || "https://generativelanguage.googleapis.com/v1beta"
  ).replace(/\/+$/, "");
  if (/\/v\d/i.test(base)) return base;
  return `${base}/v1beta`;
}

async function callGeminiWithThinking({
  apiKey,
  baseUrl,
  system,
  userText,
  thinkingBudget = 8192,
  maxOutputTokens = 16384,
  timeoutMs = 300_000,
}) {
  if (!apiKey) throw new Error("GEMINI_API_KEY is required");
  if (!baseUrl) throw new Error("GEMINI_API_BASE_URL is required");

  const model = "gemini-2.5-pro";
  const normalizedBase = normalizeGeminiBaseUrl(baseUrl);
  const endpoint = `${normalizedBase}/models/${encodeURIComponent(model)}:generateContent`;

  const requestBody = {
    systemInstruction: system
      ? { role: "system", parts: [{ text: system }] }
      : undefined,
    contents: [{ role: "user", parts: [{ text: userText }] }],
    generationConfig: {
      maxOutputTokens,
      thinkingConfig: {
        thinkingBudget,
      },
    },
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(timeoutMs),
  });

  const responseText = await res.text();
  if (!res.ok) {
    throw new Error(
      `Gemini request failed (${res.status}): ${responseText.slice(0, 1000)}`
    );
  }

  const parsed = JSON.parse(responseText);
  // Extract text parts (skip thinking parts)
  const textParts =
    parsed?.candidates?.[0]?.content?.parts?.filter((p) => p?.text && !p?.thought) || [];
  const output = textParts.map((p) => p.text).join("\n").trim();

  if (!output) {
    throw new Error("Gemini returned empty content");
  }

  return output;
}

// ---------------------------------------------------------------------------
// Author style profile (embedded for self-contained script)
// ---------------------------------------------------------------------------

const AUTHOR_STYLE_PROFILE = `
## Author's Writing Style Profile

Analyzed from 45+ existing human-translated posts on zhenjia.org.

### Chinese technical writing
- Conversational yet technical --- mixes formal explanation with casual remarks
- Narrative-first: starts with the problem/failure, then walks through discovery, then solution
- Self-deprecating humor and parenthetical asides
- Code appears early, alongside or before explanation --- never relegated to the end
- Comparison tables for trade-offs, not prose paragraphs
- English technical terms used directly: "agent", "stdout", "JSON", "API" --- never translated

### English writing
- More formal and structured than Chinese
- Longer sentences with subordinate clauses
- Explicit meta-narrative: "Let's see the result...", "The key points are:"
- Hedging language: "might", "typically", "often"

### Japanese writing
- Consistent desu/masu form (polite register)
- Heavy use of numbered lists and structured formatting
- Parenthetical term definitions: "Reflection（省察）は..."
- More academic/polished tone than Chinese
`.trim();

// ---------------------------------------------------------------------------
// Translation direction guidance
// ---------------------------------------------------------------------------

function getDirectionGuide(sourceLang, targetLang) {
  const guides = {
    "zh->en": `Translating Chinese to English:
- Keep the storytelling flow but shift to slightly more formal sentence structure
- Preserve parenthetical asides and self-deprecating humor --- adapt them naturally
- Do NOT sanitize casual remarks into corporate prose
- Use hedging language where appropriate: "might", "typically", "often"
- Add explicit meta-narrative transitions: "Let's see...", "The key point here is..."`,

    "zh->ja": `Translating Chinese to Japanese:
- Use です・ます form consistently throughout
- Add parenthetical term definitions for technical concepts: "Reflection（省察）は..."
- Structure content with clear numbered lists where appropriate
- The tone should be polished and academic but not stiff
- Preserve the author's explanatory approach`,

    "en->zh": `Translating English to Chinese:
- Make it MORE conversational than the English source
- Add casual markers: 但是、然后、所以、其实、反正
- Use short sentences connected by casual connectors
- Preserve and enhance any humor or asides
- Self-deprecating remarks are welcome
- Code blocks and technical terms stay in English`,

    "en->ja": `Translating English to Japanese:
- Use です・ます form consistently throughout
- Add parenthetical term definitions for technical concepts
- Structure content with clear numbered lists where appropriate
- Polished and academic but not stiff
- Preserve the explanatory structure of the English source`,

    "ja->zh": `Translating Japanese to Chinese:
- Make it conversational --- add casual markers
- Adapt the polished Japanese tone to a more relaxed Chinese voice
- Preserve all technical content and code blocks unchanged`,

    "ja->en": `Translating Japanese to English:
- Shift to the author's English voice: structured with meta-narrative
- Use hedging language and subordinate clauses
- Preserve all technical content and code blocks unchanged`,
  };

  return guides[`${sourceLang}->${targetLang}`] || "";
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv);
  const sourcePath = args["source"];
  const targetLang = args["target-lang"];
  const styleRefsPath = args["style-refs"];
  const repoRoot = args["repo-root"] || process.cwd();

  if (!sourcePath) {
    console.error("Error: --source is required");
    process.exit(1);
  }
  if (!targetLang || !["zh", "en", "ja"].includes(targetLang)) {
    console.error("Error: --target-lang must be zh, en, or ja");
    process.exit(1);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const baseUrl = process.env.GEMINI_API_BASE_URL;

  if (!apiKey) {
    console.error("Error: GEMINI_API_KEY environment variable is required");
    process.exit(1);
  }
  if (!baseUrl) {
    console.error("Error: GEMINI_API_BASE_URL environment variable is required");
    process.exit(1);
  }

  // Read source file
  const absSourcePath = path.resolve(repoRoot, sourcePath);
  const sourceContent = await fs.readFile(absSourcePath, "utf8");
  const { data: frontmatter, body: sourceBody } = parseFrontmatter(sourceContent);

  // Detect source language
  const basename = path.basename(sourcePath).toLowerCase();
  let sourceLang = "zh";
  if (basename.includes(".en.")) sourceLang = "en";
  else if (basename.includes(".ja.")) sourceLang = "ja";
  else if (basename.includes(".zh.")) sourceLang = "zh";
  if (frontmatter.lang) {
    const fmLang = String(frontmatter.lang).trim().toLowerCase();
    if (["zh", "en", "ja"].includes(fmLang)) sourceLang = fmLang;
  }

  // Read style references if provided
  let styleRefs = "";
  if (styleRefsPath) {
    try {
      styleRefs = await fs.readFile(styleRefsPath, "utf8");
    } catch {
      console.error(`Warning: Could not read style refs from ${styleRefsPath}`);
    }
  }

  const langNames = { zh: "Chinese", en: "English", ja: "Japanese" };
  const directionGuide = getDirectionGuide(sourceLang, targetLang);

  // Build system prompt
  const systemPrompt = `You are a professional multilingual translator for a personal tech blog (zhenjia.org).
You translate from ${langNames[sourceLang]} to ${langNames[targetLang]}.

${AUTHOR_STYLE_PROFILE}

${directionGuide}

## Universal Translation Rules
- NEVER translate English technical terms (agent, API, JSON, stdout, CI/CD, Docker, Kubernetes, webpack, npm, etc.)
- Preserve ALL code blocks exactly as they are --- do not translate code or comments in code
- Preserve ALL URLs, image paths, and HTML tags unchanged
- Keep comparison tables as tables --- do not convert to prose
- Preserve the narrative arc: problem -> discovery -> solution
- Code should appear early (before or alongside explanation, not after)

## Output Format
- Output ONLY the translated body content (no frontmatter)
- Preserve all Markdown formatting (headings, lists, bold, italic, links, images, code blocks)
- Do not add any preamble, explanation, or commentary --- just the translated text`;

  // Build user prompt
  let userPrompt = `Translate the following blog post from ${langNames[sourceLang]} to ${langNames[targetLang]}.

## Source Post Metadata
- Title: ${frontmatter.title || "(untitled)"}
- Tags: ${frontmatter.tags || "(none)"}
- Categories: ${frontmatter.categories || "(none)"}
`;

  if (styleRefs) {
    userPrompt += `
## Style References (existing human translations by the same author)
Use these as examples of how the author's voice sounds in ${langNames[targetLang]}:

${styleRefs}

---
`;
  }

  userPrompt += `
## Source Content (${langNames[sourceLang]})

${sourceBody}`;

  console.error(
    `Translating: ${sourcePath} (${sourceLang} -> ${targetLang})`
  );
  console.error(`Using Gemini 2.5 Pro with thinking mode...`);

  const translated = await callGeminiWithThinking({
    apiKey,
    baseUrl,
    system: systemPrompt,
    userText: userPrompt,
    thinkingBudget: 8192,
    maxOutputTokens: 16384,
    timeoutMs: 300_000,
  });

  // Output to stdout for the calling workflow to capture
  process.stdout.write(translated);

  console.error(`Translation complete (${translated.length} chars)`);
}

main().catch((err) => {
  console.error(`Fatal error: ${err.message}`);
  process.exit(1);
});
