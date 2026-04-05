import fs from "node:fs/promises";
import path from "node:path";

export function parseArgs(argv) {
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

export function toBool(value, defaultValue = false) {
  if (value == null) return defaultValue;
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

export function parseJsonLoose(value, fallback = null) {
  if (value == null || value === "") return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function extractJsonObject(text) {
  if (!text) return null;
  const direct = parseJsonLoose(text, null);
  if (direct && typeof direct === "object") return direct;
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    const parsed = parseJsonLoose(fence[1], null);
    if (parsed && typeof parsed === "object") return parsed;
  }
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  return parseJsonLoose(match[0], null);
}

export function parseCustomHeaders(raw) {
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

export function parseFrontmatter(markdown) {
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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (value === "true") data[key] = true;
    else if (value === "false") data[key] = false;
    else data[key] = value;
  }
  return { data, body, rawFrontmatter: raw };
}

export async function readArticle(repoRoot, articlePath) {
  const absPath = path.join(repoRoot, articlePath);
  const markdown = await fs.readFile(absPath, "utf8");
  const { data, body, rawFrontmatter } = parseFrontmatter(markdown);
  return { absPath, markdown, frontmatter: data, body, rawFrontmatter };
}

export function detectSourceLang(filePath, frontmatterLang, fallbackLang = "zh") {
  const candidate = String(frontmatterLang || "").trim().toLowerCase();
  if (["zh", "en", "ja"].includes(candidate)) return candidate;
  const base = path.basename(filePath).toLowerCase();
  if (base.includes(".zh.")) return "zh";
  if (base.includes(".en.")) return "en";
  if (base.includes(".ja.")) return "ja";
  return fallbackLang;
}

export function targetLangsFor(sourceLang, matrix, allLangs = ["zh", "en", "ja"]) {
  const list = Array.isArray(matrix?.[sourceLang]) ? matrix[sourceLang] : allLangs.filter((x) => x !== sourceLang);
  return list.filter((x) => x !== sourceLang && allLangs.includes(x));
}

export async function readPrompt(repoRoot, relativeCandidates) {
  for (const rel of relativeCandidates) {
    const full = path.join(repoRoot, rel);
    try {
      return await fs.readFile(full, "utf8");
    } catch {
      // continue
    }
  }
  throw new Error(`Missing prompt file. Tried: ${relativeCandidates.join(", ")}`);
}

export async function callAnthropicMessages({
  apiKey,
  model,
  baseUrl,
  customHeaders = {},
  system,
  userText,
  maxTokens = 1200,
  temperature = 0,
  timeoutMs = 60_000,
}) {
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is required");
  if (!model) throw new Error("ANTHROPIC_MODEL is required");

  const endpoint = `${(baseUrl || "https://api.anthropic.com").replace(/\/+$/, "")}/v1/messages`;
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
      max_tokens: maxTokens,
      temperature,
      system,
      messages: [{ role: "user", content: [{ type: "text", text: userText }] }],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Anthropic request failed (${res.status}): ${text.slice(0, 1000)}`);
  }
  const parsed = parseJsonLoose(text, null);
  const contentText = parsed?.content?.map((c) => c?.text || "").join("\n").trim() || "";
  return { raw: parsed ?? text, text: contentText };
}

function normalizeGeminiBaseUrl(baseUrl) {
  const base = (baseUrl || "https://generativelanguage.googleapis.com/v1beta").replace(/\/+$/, "");
  if (/\/v\d/i.test(base)) return base;
  return `${base}/v1beta`;
}

function normalizeGeminiModelName(model) {
  if (!model) return "";
  return String(model).replace(/^models\//, "");
}

function geminiContentText(parsed) {
  return (
    parsed?.candidates?.[0]?.content?.parts
      ?.map((p) => p?.text || "")
      .join("\n")
      .trim() || ""
  );
}

export async function callGeminiGenerateContent({
  apiKey,
  model,
  baseUrl,
  customHeaders = {},
  system,
  userText,
  temperature = 0,
  timeoutMs = 60_000,
}) {
  if (!apiKey) throw new Error("GEMINI_API_KEY is required");
  if (!model) throw new Error("GEMINI_MODEL is required");

  const normalizedBase = normalizeGeminiBaseUrl(baseUrl);
  const normalizedModel = normalizeGeminiModelName(model);
  const endpoint = `${normalizedBase}/models/${encodeURIComponent(normalizedModel)}:generateContent`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": apiKey,
      ...customHeaders,
    },
    body: JSON.stringify({
      systemInstruction: system ? { role: "system", parts: [{ text: system }] } : undefined,
      contents: [{ role: "user", parts: [{ text: userText }] }],
      generationConfig: {
        temperature,
        responseMimeType: "application/json",
      },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Gemini request failed (${res.status}): ${text.slice(0, 1000)}`);
  }
  const parsed = parseJsonLoose(text, null);
  return { raw: parsed ?? text, text: geminiContentText(parsed) };
}

export function clamp01(num, fallback = 0.5) {
  const x = Number(num);
  if (!Number.isFinite(x)) return fallback;
  return Math.max(0, Math.min(1, x));
}

export function clamp100(num, fallback = 0) {
  const x = Number(num);
  if (!Number.isFinite(x)) return fallback;
  return Math.max(0, Math.min(100, Math.round(x)));
}

export function toYamlScalar(value) {
  if (value == null) return "''";
  const s = String(value);
  if (s === "") return "''";
  if (/^[A-Za-z0-9_./:-]+$/.test(s)) return s;
  return JSON.stringify(s);
}

export function escapeRegex(input) {
  return String(input).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
