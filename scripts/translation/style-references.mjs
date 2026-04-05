#!/usr/bin/env node

/**
 * style-references.mjs --- Find similar translated posts as few-shot examples.
 *
 * Usage:
 *   node scripts/translation/style-references.mjs \
 *     --source content/posts/my-post.md \
 *     --target-lang en \
 *     --repo-root /path/to/repo \
 *     --limit 5
 *
 * Finds 3-5 existing human-translated post pairs with similar topics
 * (matched by tags/categories). Outputs source+translation excerpts
 * that serve as few-shot examples of the author's translation style.
 *
 * Output goes to stdout for piping into other scripts.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SOURCE_EXT_RE = /\.(md|mdx)$/i;
const LANG_SUFFIX_RE = /\.(zh|en|ja)\.(md|mdx)$/i;
const DEFAULT_LIMIT = 5;
const EXCERPT_LENGTH = 600;

// ---------------------------------------------------------------------------
// Argument parsing
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
// Frontmatter parsing (lightweight, same pattern as core.mjs)
// ---------------------------------------------------------------------------

function splitFrontmatterRaw(raw) {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!match) return { frontmatter: "", body: raw };
  return { frontmatter: match[1], body: match[2] || "" };
}

function readScalar(frontmatter, key) {
  if (!frontmatter) return "";
  const re = new RegExp(`^${key}:\\s*(.+)$`, "m");
  const m = frontmatter.match(re);
  if (!m) return "";
  let v = m[1].trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  return v;
}

function readList(frontmatter, key) {
  if (!frontmatter) return [];
  const lines = frontmatter.split(/\r?\n/);
  const result = [];
  const keyRe = new RegExp(`^${key}:\\s*(.*)$`);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const m = line.match(keyRe);
    if (!m) continue;
    const inline = m[1].trim();
    if (inline.startsWith("[") && inline.endsWith("]")) {
      const inner = inline.slice(1, -1).trim();
      if (!inner) return [];
      return inner
        .split(",")
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
        .filter(Boolean);
    }
    let j = i + 1;
    while (j < lines.length) {
      const li = lines[j];
      if (/^\s*-\s+/.test(li)) {
        result.push(
          li
            .replace(/^\s*-\s+/, "")
            .trim()
            .replace(/^['"]|['"]$/g, "")
        );
        j += 1;
        continue;
      }
      if (/^\s+/.test(li)) {
        j += 1;
        continue;
      }
      break;
    }
    if (result.length) return result.filter(Boolean);
    if (inline) return [inline.replace(/^['"]|['"]$/g, "")];
    return [];
  }
  return [];
}

// ---------------------------------------------------------------------------
// Text cleaning (strip code blocks, links, formatting for excerpt)
// ---------------------------------------------------------------------------

function compactText(text) {
  return String(text || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[[^\]]+\]\([^)]+\)/g, " ")
    .replace(/[#>*_\-]{1,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// File walker
// ---------------------------------------------------------------------------

function walkFiles(dir, out) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walkFiles(full, out);
    } else if (SOURCE_EXT_RE.test(ent.name)) {
      out.push(full);
    }
  }
}

// ---------------------------------------------------------------------------
// Detect source language from filename
// ---------------------------------------------------------------------------

function detectLang(filePath, frontmatterLang) {
  const candidate = String(frontmatterLang || "").trim().toLowerCase();
  if (["zh", "en", "ja"].includes(candidate)) return candidate;
  const base = path.basename(filePath).toLowerCase();
  if (base.includes(".zh.")) return "zh";
  if (base.includes(".en.")) return "en";
  if (base.includes(".ja.")) return "ja";
  return "zh";
}

// ---------------------------------------------------------------------------
// Build corpus of translated post pairs
// ---------------------------------------------------------------------------

function buildTranslatedPairs(repoRoot, targetLang) {
  const postsDir = path.join(repoRoot, "content/posts");
  const notesDir = path.join(repoRoot, "content/notes");
  const allFiles = [];
  walkFiles(postsDir, allFiles);
  walkFiles(notesDir, allFiles);

  // Group files by base name (without language suffix)
  const groups = new Map();
  for (const filePath of allFiles) {
    const rel = path.relative(repoRoot, filePath).replace(/\\/g, "/");
    const langMatch = rel.match(LANG_SUFFIX_RE);
    let baseName;
    let lang;

    if (langMatch) {
      lang = langMatch[1];
      baseName = rel.replace(LANG_SUFFIX_RE, ".md");
    } else {
      lang = "zh"; // default: no suffix = Chinese
      baseName = rel;
    }

    if (!groups.has(baseName)) {
      groups.set(baseName, {});
    }
    groups.get(baseName)[lang] = { path: rel, absPath: filePath };
  }

  // Find pairs where source + targetLang translation exist
  // and the translation is human-written (no translation_generated: true)
  const pairs = [];
  for (const [baseName, langs] of groups) {
    const targetFile = langs[targetLang];
    if (!targetFile) continue;

    // Find the source (non-target language)
    let sourceFile = null;
    let sourceLang = null;
    for (const [lang, file] of Object.entries(langs)) {
      if (lang !== targetLang) {
        sourceFile = file;
        sourceLang = lang;
        break;
      }
    }
    if (!sourceFile) continue;

    try {
      const targetContent = fs.readFileSync(targetFile.absPath, "utf8");
      const { frontmatter: targetFm } = splitFrontmatterRaw(targetContent);
      // Skip machine-generated translations --- we only want human examples
      if (readScalar(targetFm, "translation_generated") === "true") continue;
      if (readScalar(targetFm, "draft") === "true") continue;

      const sourceContent = fs.readFileSync(sourceFile.absPath, "utf8");
      const { frontmatter: sourceFm, body: sourceBody } =
        splitFrontmatterRaw(sourceContent);
      const { body: targetBody } = splitFrontmatterRaw(targetContent);

      if (readScalar(sourceFm, "draft") === "true") continue;
      if (readScalar(sourceFm, "password")) continue;

      const sourceExcerpt = compactText(sourceBody);
      const targetExcerpt = compactText(targetBody);
      if (sourceExcerpt.length < 80 || targetExcerpt.length < 80) continue;

      pairs.push({
        baseName,
        sourceLang,
        sourceFile: sourceFile.path,
        targetFile: targetFile.path,
        title: readScalar(sourceFm, "title") || path.basename(baseName),
        tags: readList(sourceFm, "tags"),
        categories: readList(sourceFm, "categories"),
        sourceExcerpt: sourceExcerpt.slice(0, EXCERPT_LENGTH),
        targetExcerpt: targetExcerpt.slice(0, EXCERPT_LENGTH),
      });
    } catch {
      // skip unreadable files
    }
  }

  return pairs;
}

// ---------------------------------------------------------------------------
// Similarity scoring (same logic as style-context.mjs)
// ---------------------------------------------------------------------------

function scoreSimilarity(sourcePost, candidatePair) {
  const srcLabels = new Set(
    [...(sourcePost.tags || []), ...(sourcePost.categories || [])].map((x) =>
      String(x).toLowerCase()
    )
  );
  const srcTitleTokens = new Set(
    String(sourcePost.title || "")
      .toLowerCase()
      .split(/[^a-z0-9\u4e00-\u9fff\u3040-\u30ff]+/i)
      .filter(Boolean)
      .slice(0, 12)
  );

  let score = 0;

  // Tag/category overlap (heavily weighted)
  for (const label of [
    ...(candidatePair.tags || []),
    ...(candidatePair.categories || []),
  ]) {
    if (srcLabels.has(String(label).toLowerCase())) score += 10;
  }

  // Title token overlap
  for (const t of String(candidatePair.title || "")
    .toLowerCase()
    .split(/[^a-z0-9\u4e00-\u9fff\u3040-\u30ff]+/i)) {
    if (t && srcTitleTokens.has(t)) score += 1;
  }

  // Prefer longer content (more useful as reference)
  if (candidatePair.sourceExcerpt.length > 400) score += 2;

  return score;
}

// ---------------------------------------------------------------------------
// Format output
// ---------------------------------------------------------------------------

const LANG_NAMES = { zh: "Chinese", en: "English", ja: "Japanese" };

function formatPairs(pairs, sourceLang, targetLang) {
  if (!pairs.length) {
    return `No existing ${LANG_NAMES[sourceLang]} -> ${LANG_NAMES[targetLang]} translation pairs found as style references.`;
  }

  const sections = pairs.map((pair, idx) => {
    const labels =
      [...(pair.categories || []), ...(pair.tags || [])].join(", ") || "(none)";
    return `=== Style Reference ${idx + 1} ===
Title: ${pair.title}
Direction: ${LANG_NAMES[pair.sourceLang]} -> ${LANG_NAMES[targetLang]}
Labels: ${labels}

--- Source (${LANG_NAMES[pair.sourceLang]}) ---
${pair.sourceExcerpt}

--- Translation (${LANG_NAMES[targetLang]}) ---
${pair.targetExcerpt}
`;
  });

  return sections.join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv);
  const sourcePath = args["source"];
  const targetLang = args["target-lang"];
  const repoRoot = args["repo-root"] || process.cwd();
  const limit = parseInt(args["limit"] || String(DEFAULT_LIMIT), 10);

  if (!sourcePath) {
    console.error("Error: --source is required");
    process.exit(1);
  }
  if (!targetLang || !["zh", "en", "ja"].includes(targetLang)) {
    console.error("Error: --target-lang must be zh, en, or ja");
    process.exit(1);
  }

  // Read source post metadata
  const absSourcePath = path.resolve(repoRoot, sourcePath);
  let sourceTitle = "";
  let sourceTags = [];
  let sourceCategories = [];
  let sourceLang = "zh";

  try {
    const sourceContent = fs.readFileSync(absSourcePath, "utf8");
    const { frontmatter } = splitFrontmatterRaw(sourceContent);
    sourceTitle = readScalar(frontmatter, "title") || path.basename(sourcePath);
    sourceTags = readList(frontmatter, "tags");
    sourceCategories = readList(frontmatter, "categories");
    sourceLang = detectLang(sourcePath, readScalar(frontmatter, "lang"));
  } catch (err) {
    console.error(`Warning: Could not read source post: ${err.message}`);
  }

  const sourcePost = {
    title: sourceTitle,
    tags: sourceTags,
    categories: sourceCategories,
  };

  console.error(
    `Finding style references for: ${sourcePath} (${LANG_NAMES[sourceLang]} -> ${LANG_NAMES[targetLang]})`
  );

  // Build corpus of translated pairs
  const pairs = buildTranslatedPairs(repoRoot, targetLang);
  console.error(`Found ${pairs.length} existing ${LANG_NAMES[targetLang]} translations`);

  // Score and rank by similarity
  const scored = pairs
    .map((pair) => ({
      pair,
      score: scoreSimilarity(sourcePost, pair),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.pair);

  console.error(`Selected ${scored.length} best matches as style references`);

  // Output formatted references to stdout
  const output = formatPairs(scored, sourceLang, targetLang);
  process.stdout.write(output);
}

main();
