// Fetch the pinned Typst binary for Windows x64 and stage it straight into the
// assembled runtime tree (dist/app/bin/typst/win32-x64).
//
// Unlike fetch-typst-linux.mjs, this does not require running on Windows: the
// Typst release is a plain zip, so it can be fetched and extracted on any host
// (e.g. macOS, right before `electron-builder --win`).
//
// Override the version with TYPST_VERSION; override the download with
// ANVILNOTE_TYPST_PATH (an existing typst.exe, copied as-is).

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { config, ensureDir, logStep, fail } from "./load-env.mjs";

// Keep in sync with the macOS bundled Typst (currently 0.14.2).
const TYPST_VERSION = process.env.TYPST_VERSION ?? "0.14.2";
const TRIPLE = "x86_64-pc-windows-msvc";

const c = config();
const typstRoot = path.join(c.appDir, "bin", "typst");
const destDir = path.join(typstRoot, "win32-x64");
const dest = path.join(destDir, "typst.exe");

// Ship exactly one Typst binary per package: clear any other platform's dir
// (e.g. the macOS one staged by the host's prepare:desktop).
fs.rmSync(typstRoot, { recursive: true, force: true });
ensureDir(destDir);

const override = process.env.ANVILNOTE_TYPST_PATH;
if (override) {
  if (!fs.existsSync(override)) fail(`ANVILNOTE_TYPST_PATH not found: ${override}`);
  logStep(`Staging Typst from ANVILNOTE_TYPST_PATH -> ${dest}`);
  fs.copyFileSync(override, dest);
  console.log(`  staged Typst (env) -> ${dest}`);
  process.exit(0);
}

const zipName = `typst-${TRIPLE}.zip`;
const url = `https://github.com/typst/typst/releases/download/v${TYPST_VERSION}/${zipName}`;

logStep(`Fetching Typst ${TYPST_VERSION} (${TRIPLE})`);
console.log(`  ${url}`);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "typst-"));
const zipPath = path.join(tmp, zipName);

const res = await fetch(url, { redirect: "follow" });
if (!res.ok) fail(`download failed: ${res.status} ${res.statusText} for ${url}`);
const buf = Buffer.from(await res.arrayBuffer());
fs.writeFileSync(zipPath, buf);
console.log(`  downloaded ${(buf.length / 1024 / 1024).toFixed(1)} MiB`);

// The zip expands to typst-<triple>/typst.exe.
execFileSync("unzip", ["-o", zipPath, "-d", tmp], { stdio: "inherit" });
const extracted = path.join(tmp, `typst-${TRIPLE}`, "typst.exe");
if (!fs.existsSync(extracted)) fail(`expected ${extracted} inside ${zipName}`);

fs.copyFileSync(extracted, dest);
fs.rmSync(tmp, { recursive: true, force: true });

console.log(`  staged Typst (download) -> ${dest}`);
