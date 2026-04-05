#!/usr/bin/env node

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { parseArgs, parseJsonLoose } from "./lib/core.mjs";

async function githubJson(url, token) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "blog-astro-ghaw-translation",
    },
    signal: AbortSignal.timeout(30_000),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`GitHub API request failed (${res.status}) ${url}: ${text.slice(0, 1000)}`);
  }
  return parseJsonLoose(text, null) ?? text;
}

async function githubDownload(url, token, outFile) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "blog-astro-ghaw-translation",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Artifact download failed (${res.status}): ${text.slice(0, 1000)}`);
  }
  const ab = await res.arrayBuffer();
  await fs.writeFile(outFile, Buffer.from(ab));
}

function extractFileFromZip(zipPath, outPath, preferredName = "") {
  const py = String.raw`
import json, sys, zipfile, os
zip_path, out_path, preferred = sys.argv[1], sys.argv[2], sys.argv[3]
with zipfile.ZipFile(zip_path, 'r') as zf:
    names = zf.namelist()
    target = None
    if preferred:
        for n in names:
            if n.endswith(preferred):
                target = n
                break
    if target is None and len(names) == 1:
        target = names[0]
    if target is None:
        raise SystemExit('Preferred file not found and artifact contains multiple files')
    data = zf.read(target)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, 'wb') as f:
        f.write(data)
    print(json.dumps({"extracted": target, "size": len(data)}))
`;

  const out = execFileSync("python3", ["-c", py, zipPath, outPath, preferredName], {
    encoding: "utf8",
  });
  return parseJsonLoose(out.trim(), { extracted: null, size: null });
}

async function main() {
  const args = parseArgs(process.argv);
  const ref = parseJsonLoose(args["artifact-ref-json"] || process.env.ARTIFACT_REF_JSON || "", null);
  const outFile = path.resolve(args["output-file"] || process.env.OUTPUT_FILE || "");
  if (!ref || typeof ref !== "object") {
    throw new Error("Missing/invalid artifact ref JSON. Use --artifact-ref-json '{...}'.");
  }
  if (!outFile) {
    throw new Error("--output-file is required.");
  }

  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN (or GH_TOKEN) is required to download artifacts.");
  }

  const repository = String(ref.repository || "").trim();
  const runId = String(ref.run_id || "").trim();
  const artifactName = String(ref.artifact_name || "").trim();
  const fileName = String(ref.file_name || "").trim();
  if (!repository || !runId || !artifactName) {
    throw new Error("artifact ref must include repository, run_id, and artifact_name.");
  }

  const listUrl = `https://api.github.com/repos/${repository}/actions/runs/${encodeURIComponent(runId)}/artifacts?per_page=100`;
  const list = await githubJson(listUrl, token);
  const artifacts = Array.isArray(list?.artifacts) ? list.artifacts : [];
  const artifact = artifacts.find((a) => a?.name === artifactName);
  if (!artifact) {
    throw new Error(`Artifact '${artifactName}' not found in run ${runId} (${repository}).`);
  }
  if (artifact.expired) {
    throw new Error(`Artifact '${artifactName}' is expired.`);
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ghaw-artifact-file-"));
  const zipPath = path.join(tmpDir, "artifact.zip");
  await githubDownload(String(artifact.archive_download_url), token, zipPath);
  const info = extractFileFromZip(zipPath, outFile, fileName);

  const result = {
    repository,
    run_id: runId,
    artifact_name: artifactName,
    file_name: fileName || null,
    extracted: info.extracted || null,
    output_file: outFile,
    artifact_id: artifact.id ?? null,
    artifact_size_in_bytes: artifact.size_in_bytes ?? null,
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
