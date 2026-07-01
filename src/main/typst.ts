// Resolves the bundled Typst binary and the bundled fonts/templates directories.
//
// Hard rule: the packaged app must NEVER fall back to a Typst on the system
// PATH or to system-installed fonts. Everything is resolved from the bundle.

import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import { runtimePaths, repoResources } from "./paths.js";

/** Bundled Typst arch folder name, matching resources/bin/typst/<platform>. */
function platformDir(): string {
  if (process.platform === "darwin") {
    return process.arch === "arm64" ? "darwin-arm64" : "darwin-x64";
  }
  return `${process.platform}-${process.arch}`;
}

/** Bundled Typst binary filename; Windows needs the .exe suffix. */
function binaryName(): string {
  return process.platform === "win32" ? "typst.exe" : "typst";
}

/**
 * Absolute path to the Typst binary the renderer must use.
 *
 * Dev:
 *   1. ANVILNOTE_TYPST_PATH (if it points at an existing file)
 *   2. resources/bin/typst/<platform>/typst staged in the repo
 *   3. dist/app/bin/typst/<platform>/typst (after `copy:resources`)
 * Packaged:
 *   - process.resourcesPath/bin/typst/<platform>/typst only.
 */
export function resolveTypstBinaryPath(): string {
  const plat = platformDir();
  const bin = binaryName();

  if (!app.isPackaged) {
    const override = process.env.ANVILNOTE_TYPST_PATH;
    if (override && fs.existsSync(override)) return override;

    const repoCandidate = path.join(
      repoResources.bin(),
      "typst",
      plat,
      bin,
    );
    if (fs.existsSync(repoCandidate)) return repoCandidate;
  }

  const bundled = path.join(runtimePaths.bin(), "typst", plat, bin);
  if (fs.existsSync(bundled)) return bundled;

  throw new Error(
    `Typst binary not found for ${plat}. Expected a bundled binary at ` +
      `"${bundled}"` +
      (app.isPackaged
        ? ". The packaged app must ship Typst; the build is incomplete."
        : `, or set ANVILNOTE_TYPST_PATH, or stage it under ` +
          `resources/bin/typst/${plat}/${bin}.`),
  );
}

/** Directory of bundled fonts handed to the renderer via ANVILNOTE_FONT_DIR. */
export function resolveBundledFontDir(): string {
  if (!app.isPackaged) {
    const override = process.env.ANVILNOTE_FONT_DIR;
    if (override && fs.existsSync(override)) return override;
    if (fs.existsSync(repoResources.fonts())) return repoResources.fonts();
  }
  return runtimePaths.fonts();
}

/** Directory of bundled templates handed to the renderer. */
export function resolveBundledTemplateDir(): string {
  if (!app.isPackaged) {
    const override = process.env.ANVILNOTE_TEMPLATE_DIR;
    if (override && fs.existsSync(override)) return override;
    if (fs.existsSync(repoResources.templates())) {
      return repoResources.templates();
    }
  }
  return runtimePaths.templates();
}
