// Resolves the bundled tectonic binary + pre-warmed package cache (see
// pandoc.ts/typst.ts for the same binary-resolution pattern).
//
// Hard rule: never fall back to a system `tectonic` — it may not exist, and
// the packaged app must be fully self-contained.

import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import { runtimePaths, repoResources } from "./paths.js";

function platformDir(): string {
  if (process.platform === "darwin") {
    return process.arch === "arm64" ? "darwin-arm64" : "darwin-x64";
  }
  return `${process.platform}-${process.arch}`;
}

function binaryName(): string {
  return process.platform === "win32" ? "tectonic.exe" : "tectonic";
}

/**
 * Absolute path to the tectonic binary.
 *
 * Dev:
 *   1. ANVILNOTE_TECTONIC_PATH (if it points at an existing file)
 *   2. resources/bin/tectonic/<platform>/tectonic staged in the repo
 *   3. dist/app/bin/tectonic/<platform>/tectonic (after `copy:resources`)
 * Packaged:
 *   - process.resourcesPath/bin/tectonic/<platform>/tectonic only.
 */
export function resolveTectonicBinaryPath(): string {
  const plat = platformDir();
  const bin = binaryName();

  if (!app.isPackaged) {
    const override = process.env.ANVILNOTE_TECTONIC_PATH;
    if (override && fs.existsSync(override)) return override;

    const repoCandidate = path.join(repoResources.bin(), "tectonic", plat, bin);
    if (fs.existsSync(repoCandidate)) return repoCandidate;
  }

  const bundled = path.join(runtimePaths.bin(), "tectonic", plat, bin);
  if (fs.existsSync(bundled)) return bundled;

  throw new Error(
    `tectonic binary not found for ${plat}. Expected a bundled binary at ` +
      `"${bundled}"` +
      (app.isPackaged
        ? ". The packaged app must ship tectonic; the build is incomplete."
        : `, or set ANVILNOTE_TECTONIC_PATH, or stage it under ` +
          `resources/bin/tectonic/${plat}/${bin}.`),
  );
}

/** Pre-warmed tectonic package cache handed to tectonic via TECTONIC_CACHE_DIR
 *  (tectonic's own env var, read directly by the `tectonic` binary — not
 *  something anvilnote-funcs re-interprets), so pgfplots/newtxtext/newtxmath/
 *  standalone/amsmath/amssymb resolve offline. Same offline-bundling shape as
 *  typst.ts's resolveBundledTypstPackageCacheDir. */
export function resolveBundledTectonicCacheDir(): string {
  if (!app.isPackaged && fs.existsSync(repoResources.tectonicCache())) {
    return repoResources.tectonicCache();
  }
  return runtimePaths.tectonicCache();
}
