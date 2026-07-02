// Fetch the pinned Pandoc binary for the current Linux platform/arch and stage
// it straight into the assembled runtime tree (dist/app/bin/pandoc/linux-<arch>).
//
// This is meant to run *inside* the Linux build container (see
// scripts/dist-linux.mjs), right after fetch-typst-linux.mjs. The host's
// `prepare:desktop` already populated dist/app with the platform-independent
// pieces and a macOS Pandoc binary; here we drop the macOS Pandoc dir and
// stage the matching Linux one so each Linux package ships exactly one Pandoc.
//
// Override the version with PANDOC_VERSION; override the download with
// ANVILNOTE_PANDOC_PATH (an existing executable, copied as-is).

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { config, ensureDir, logStep, fail } from "./load-env.mjs";

// Keep in sync with the macOS bundled Pandoc (currently 3.10).
const PANDOC_VERSION = process.env.PANDOC_VERSION ?? "3.10";

if (process.platform !== "linux") {
  fail(`fetch-pandoc-linux must run on Linux; got ${process.platform}. Use scripts/dist-linux.mjs.`);
}

// Same reasoning as fetch-typst-linux.mjs: the container is always amd64, so
// the target arch comes from TARGET_ARCH, not the container's own process.arch.
const arch = process.env.TARGET_ARCH ?? process.arch;
const SUPPORTED = new Set(["x64", "arm64"]);
if (!SUPPORTED.has(arch)) fail(`Unsupported Linux arch: ${arch} (expected x64 or arm64)`);

// Pandoc's own release asset naming: amd64/arm64, not x64/arm64.
const assetArch = arch === "x64" ? "amd64" : "arm64";

const c = config();
const pandocRoot = path.join(c.appDir, "bin", "pandoc");
const destDir = path.join(pandocRoot, `linux-${arch}`);
const dest = path.join(destDir, "pandoc");

// Ship exactly one Pandoc binary per package: clear any other platform's dir
// (e.g. the macOS one staged by the host's prepare:desktop).
fs.rmSync(pandocRoot, { recursive: true, force: true });
ensureDir(destDir);

const override = process.env.ANVILNOTE_PANDOC_PATH;
if (override) {
  if (!fs.existsSync(override)) fail(`ANVILNOTE_PANDOC_PATH not found: ${override}`);
  logStep(`Staging Pandoc from ANVILNOTE_PANDOC_PATH -> ${dest}`);
  fs.copyFileSync(override, dest);
  fs.chmodSync(dest, 0o755);
  console.log(`  staged Pandoc (env) -> ${dest}`);
  process.exit(0);
}

const tarName = `pandoc-${PANDOC_VERSION}-linux-${assetArch}.tar.gz`;
const url = `https://github.com/jgm/pandoc/releases/download/${PANDOC_VERSION}/${tarName}`;

logStep(`Fetching Pandoc ${PANDOC_VERSION} (linux-${assetArch})`);
console.log(`  ${url}`);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pandoc-"));
const tarPath = path.join(tmp, tarName);

const res = await fetch(url, { redirect: "follow" });
if (!res.ok) fail(`download failed: ${res.status} ${res.statusText} for ${url}`);
const buf = Buffer.from(await res.arrayBuffer());
fs.writeFileSync(tarPath, buf);
console.log(`  downloaded ${(buf.length / 1024 / 1024).toFixed(1)} MiB`);

// The tarball expands to pandoc-<version>/bin/pandoc.
execFileSync("tar", ["-xzf", tarPath, "-C", tmp], { stdio: "inherit" });
const extracted = path.join(tmp, `pandoc-${PANDOC_VERSION}`, "bin", "pandoc");
if (!fs.existsSync(extracted)) fail(`expected ${extracted} inside ${tarName}`);

fs.copyFileSync(extracted, dest);
fs.chmodSync(dest, 0o755);
fs.rmSync(tmp, { recursive: true, force: true });

console.log(`  staged Pandoc (download) -> ${dest}`);
