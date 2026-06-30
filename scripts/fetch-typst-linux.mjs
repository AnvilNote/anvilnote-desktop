// Fetch the pinned Typst binary for the current Linux platform/arch and stage it
// straight into the assembled runtime tree (dist/app/bin/typst/linux-<arch>).
//
// This is meant to run *inside* the Linux build container (see
// scripts/dist-linux.mjs). The host's `prepare:desktop` already populated
// dist/app with the platform-independent web/api/renderer/fonts/templates and a
// macOS Typst binary; here we drop the macOS Typst dir and stage the matching
// Linux one so each Linux package ships exactly one (correct) Typst binary.
//
// Override the version with TYPST_VERSION; override the download with
// ANVILNOTE_TYPST_PATH (an existing executable, copied as-is).

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { config, ensureDir, logStep, fail } from "./load-env.mjs";

// Keep in sync with the macOS bundled Typst (currently 0.14.2).
const TYPST_VERSION = process.env.TYPST_VERSION ?? "0.14.2";

const TRIPLES = {
  x64: "x86_64-unknown-linux-musl",
  arm64: "aarch64-unknown-linux-musl",
};

if (process.platform !== "linux") {
  fail(`fetch-typst-linux must run on Linux; got ${process.platform}. Use scripts/dist-linux.mjs.`);
}

// The build container is always amd64 (electronuserland/builder ships no arm64
// manifest); electron-builder cross-packages arm64 from it. So the Typst arch
// comes from the *target* (TARGET_ARCH), not the container's process.arch.
const arch = process.env.TARGET_ARCH ?? process.arch;
const triple = TRIPLES[arch];
if (!triple) fail(`Unsupported Linux arch: ${arch} (expected x64 or arm64)`);

const c = config();
const typstRoot = path.join(c.appDir, "bin", "typst");
const destDir = path.join(typstRoot, `linux-${arch}`);
const dest = path.join(destDir, "typst");

// Ship exactly one Typst binary per package: clear any other platform's dir
// (e.g. the macOS one staged by the host's prepare:desktop).
fs.rmSync(typstRoot, { recursive: true, force: true });
ensureDir(destDir);

const override = process.env.ANVILNOTE_TYPST_PATH;
if (override) {
  if (!fs.existsSync(override)) fail(`ANVILNOTE_TYPST_PATH not found: ${override}`);
  logStep(`Staging Typst from ANVILNOTE_TYPST_PATH -> ${dest}`);
  fs.copyFileSync(override, dest);
  fs.chmodSync(dest, 0o755);
  console.log(`  staged Typst (env) -> ${dest}`);
  process.exit(0);
}

const tarName = `typst-${triple}.tar.xz`;
const url = `https://github.com/typst/typst/releases/download/v${TYPST_VERSION}/${tarName}`;

logStep(`Fetching Typst ${TYPST_VERSION} (${triple})`);
console.log(`  ${url}`);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "typst-"));
const tarPath = path.join(tmp, tarName);

const res = await fetch(url, { redirect: "follow" });
if (!res.ok) fail(`download failed: ${res.status} ${res.statusText} for ${url}`);
const buf = Buffer.from(await res.arrayBuffer());
fs.writeFileSync(tarPath, buf);
console.log(`  downloaded ${(buf.length / 1024 / 1024).toFixed(1)} MiB`);

// The tarball expands to typst-<triple>/typst.
execFileSync("tar", ["-xJf", tarPath, "-C", tmp], { stdio: "inherit" });
const extracted = path.join(tmp, `typst-${triple}`, "typst");
if (!fs.existsSync(extracted)) fail(`expected ${extracted} inside ${tarName}`);

fs.copyFileSync(extracted, dest);
fs.chmodSync(dest, 0o755);
fs.rmSync(tmp, { recursive: true, force: true });

console.log(`  staged Typst (download) -> ${dest}`);
