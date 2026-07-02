// Fetch the pinned Pandoc binary for Windows x64 and stage it straight into
// the assembled runtime tree (dist/app/bin/pandoc/win32-x64).
//
// Unlike fetch-pandoc-linux.mjs, this does not require running on Windows:
// the Pandoc Windows release is a plain zip, so it can be fetched and
// extracted on any host (e.g. macOS, right before `electron-builder --win`).
//
// Override the version with PANDOC_VERSION; override the download with
// ANVILNOTE_PANDOC_PATH (an existing pandoc.exe, copied as-is).

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { config, ensureDir, logStep, fail } from "./load-env.mjs";

// Keep in sync with the macOS bundled Pandoc (currently 3.10).
const PANDOC_VERSION = process.env.PANDOC_VERSION ?? "3.10";

const c = config();
const pandocRoot = path.join(c.appDir, "bin", "pandoc");
const destDir = path.join(pandocRoot, "win32-x64");
const dest = path.join(destDir, "pandoc.exe");

// Ship exactly one Pandoc binary per package: clear any other platform's dir
// (e.g. the macOS one staged by the host's prepare:desktop).
fs.rmSync(pandocRoot, { recursive: true, force: true });
ensureDir(destDir);

const override = process.env.ANVILNOTE_PANDOC_PATH;
if (override) {
  if (!fs.existsSync(override)) fail(`ANVILNOTE_PANDOC_PATH not found: ${override}`);
  logStep(`Staging Pandoc from ANVILNOTE_PANDOC_PATH -> ${dest}`);
  fs.copyFileSync(override, dest);
  console.log(`  staged Pandoc (env) -> ${dest}`);
  process.exit(0);
}

const zipName = `pandoc-${PANDOC_VERSION}-windows-x86_64.zip`;
const url = `https://github.com/jgm/pandoc/releases/download/${PANDOC_VERSION}/${zipName}`;

logStep(`Fetching Pandoc ${PANDOC_VERSION} (windows-x86_64)`);
console.log(`  ${url}`);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pandoc-"));
const zipPath = path.join(tmp, zipName);

const res = await fetch(url, { redirect: "follow" });
if (!res.ok) fail(`download failed: ${res.status} ${res.statusText} for ${url}`);
const buf = Buffer.from(await res.arrayBuffer());
fs.writeFileSync(zipPath, buf);
console.log(`  downloaded ${(buf.length / 1024 / 1024).toFixed(1)} MiB`);

// The zip expands to pandoc-<version>/pandoc.exe.
execFileSync("unzip", ["-o", zipPath, "-d", tmp], { stdio: "inherit" });
const extracted = path.join(tmp, `pandoc-${PANDOC_VERSION}`, "pandoc.exe");
if (!fs.existsSync(extracted)) fail(`expected ${extracted} inside ${zipName}`);

fs.copyFileSync(extracted, dest);
fs.rmSync(tmp, { recursive: true, force: true });

console.log(`  staged Pandoc (download) -> ${dest}`);
