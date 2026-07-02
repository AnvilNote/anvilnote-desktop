// Resolves the bundled Pandoc binary (see typst.ts for the same pattern).
//
// Hard rule: the packaged app must NEVER fall back to a Pandoc on the system
// PATH — it may not exist, or may be a dynamically-linked Homebrew build that
// won't run once copied elsewhere (see resources/bin/pandoc/README.md).

import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import { runtimePaths, repoResources } from "./paths.js";

/** Bundled Pandoc arch folder name, matching resources/bin/pandoc/<platform>. */
function platformDir(): string {
  if (process.platform === "darwin") {
    return process.arch === "arm64" ? "darwin-arm64" : "darwin-x64";
  }
  return `${process.platform}-${process.arch}`;
}

/** Bundled Pandoc binary filename; Windows needs the .exe suffix. */
function binaryName(): string {
  return process.platform === "win32" ? "pandoc.exe" : "pandoc";
}

/**
 * Absolute path to the Pandoc binary the docx exporter must use.
 *
 * Dev:
 *   1. ANVILNOTE_PANDOC_PATH (if it points at an existing file)
 *   2. resources/bin/pandoc/<platform>/pandoc staged in the repo
 *   3. dist/app/bin/pandoc/<platform>/pandoc (after `copy:resources`)
 * Packaged:
 *   - process.resourcesPath/bin/pandoc/<platform>/pandoc only.
 */
export function resolvePandocBinaryPath(): string {
  const plat = platformDir();
  const bin = binaryName();

  if (!app.isPackaged) {
    const override = process.env.ANVILNOTE_PANDOC_PATH;
    if (override && fs.existsSync(override)) return override;

    const repoCandidate = path.join(repoResources.bin(), "pandoc", plat, bin);
    if (fs.existsSync(repoCandidate)) return repoCandidate;
  }

  const bundled = path.join(runtimePaths.bin(), "pandoc", plat, bin);
  if (fs.existsSync(bundled)) return bundled;

  throw new Error(
    `Pandoc binary not found for ${plat}. Expected a bundled binary at ` +
      `"${bundled}"` +
      (app.isPackaged
        ? ". The packaged app must ship Pandoc; the build is incomplete."
        : `, or set ANVILNOTE_PANDOC_PATH, or stage it under ` +
          `resources/bin/pandoc/${plat}/${bin}.`),
  );
}
