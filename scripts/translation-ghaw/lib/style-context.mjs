import fs from "node:fs";
import path from "node:path";
import { detectSourceLang } from "./core.mjs";

const SOURCE_EXT_RE = /\.(md|mdx)$/i;
let cache = null;

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
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
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
      return inner.split(",").map(s => s.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean);
    }
    let j = i + 1;
    while (j < lines.length) {
      const li = lines[j];
      if (/^\s*-\s+/.test(li)) {
        result.push(li.replace(/^\s*-\s+/, "").trim().replace(/^['"]|['"]$/g, ""));
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

function walkFiles(dir, out) {
  let ents = [];
  try {
    ents = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of ents) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walkFiles(full, out);
    } else if (SOURCE_EXT_RE.test(ent.name)) {
      out.push(full);
    }
  }
}

function relToRepo(repoRoot, absPath) {
  return path.relative(repoRoot, absPath).replace(/\\/g, "/");
}

function buildCorpus(repoRoot, defaultSourceLang = "zh") {
  const base = path.join(repoRoot, "content/posts");
  const files = [];
  walkFiles(base, files);
  const corpus = [];
  for (const file of files) {
    try {
      const raw = fs.readFileSync(file, "utf8");
      const { frontmatter, body } = splitFrontmatterRaw(raw);
      const title = readScalar(frontmatter, "title") || path.basename(file);
      const lang = detectSourceLang(file, readScalar(frontmatter, "lang"), defaultSourceLang);
      const draft = readScalar(frontmatter, "draft");
      const password = readScalar(frontmatter, "password");
      if (String(draft).toLowerCase() === "true" || password) continue;
      const excerpt = compactText(body).slice(0, 420);
      if (excerpt.length < 80) continue;
      corpus.push({
        path: relToRepo(repoRoot, file),
        title,
        lang,
        tags: readList(frontmatter, "tags"),
        categories: readList(frontmatter, "categories"),
        excerpt,
      });
    } catch {
      // ignore parse failures
    }
  }
  return corpus;
}

export function getStyleContext({ repoRoot, sourceArticlePath, sourceMeta = {}, sourceLang = "zh", targetLang, limit = 3 }) {
  if (!cache || cache.repoRoot !== repoRoot) {
    cache = {
      repoRoot,
      corpus: buildCorpus(repoRoot, sourceLang || "zh"),
    };
  }

  const srcCats = new Set([...(sourceMeta.categories || []), ...(sourceMeta.tags || [])].map(x => String(x).toLowerCase()));
  const srcTitleTokens = new Set(
    String(sourceMeta.title || "")
      .toLowerCase()
      .split(/[^a-z0-9\u4e00-\u9fff\u3040-\u30ff]+/i)
      .filter(Boolean)
      .slice(0, 12)
  );

  return cache.corpus
    .filter(item => item.lang === targetLang)
    .filter(item => item.path !== sourceArticlePath)
    .map((item) => {
      let score = 0;
      for (const c of [...(item.categories || []), ...(item.tags || [])]) {
        if (srcCats.has(String(c).toLowerCase())) score += 10;
      }
      for (const t of String(item.title || "").toLowerCase().split(/[^a-z0-9\u4e00-\u9fff\u3040-\u30ff]+/i)) {
        if (t && srcTitleTokens.has(t)) score += 1;
      }
      if (item.path.includes(`.${targetLang}.`)) score += 2;
      return { item, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(x => x.item);
}

export function formatStyleContext(refs) {
  if (!refs || refs.length === 0) return "";
  return refs.map((ref, idx) => {
    const cats = [...(ref.categories || []), ...(ref.tags || [])].join(", ") || "(none)";
    return [
      `[StyleRef ${idx + 1}]`,
      `Path: ${ref.path}`,
      `Title: ${ref.title}`,
      `Labels: ${cats}`,
      `Excerpt: ${ref.excerpt}`,
    ].join("\n");
  }).join("\n\n");
}

