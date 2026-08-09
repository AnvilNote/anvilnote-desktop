// Copy the PyInstaller onedir bundle into dist/app/charts. Same shape as
// copy-funcs.mjs: verify the built executable actually matches the DECLARED
// build target before staging it, then copy the whole onedir folder — not
// just the executable — since kaleido's bundled Chromium and the Python
// runtime's shared libs live alongside it, not inside a single file.

import path from "node:path";
import { config, fail, logStep } from "./load-env.mjs";
import { chartsBinaryName, stageChartsBundle } from "./charts-target.mjs";

const c = config();
logStep("Copying charts runtime -> dist/app/charts");

// Intentionally mirrors pandoc-resource.mjs/typst-resource.mjs/
// fetch-tectonic-target.mjs's own env-var-first convention
// (ANVILNOTE_BUILD_PLATFORM/_ARCH, falling back to process.platform/arch
// only when unset) rather than reading process.* directly. PyInstaller
// cannot cross-compile — `uv run pyinstaller` always produces a binary for
// whatever OS it's actually invoked on, regardless of which platform
// dist-windows.mjs/dist-linux.mjs are packaging FOR. Reading
// process.platform/arch here (this script's original version) meant the
// verification below compared the host's own build against the host's own
// identity — always self-consistent, so it silently passed even when
// packaging for Windows/Linux on this Mac, shipping an unusable macOS
// Mach-O binary inside those installers with no error at all. Reading the
// declared target instead makes that exact situation throw here, loudly,
// before electron-builder ever gets a chance to zip a broken binary into a
// release artifact — matching how every other bundled tool in this repo
// already fails the same way when built for the wrong platform.
const targetPlatform = process.env.ANVILNOTE_BUILD_PLATFORM ?? process.platform;
const targetArch = process.env.ANVILNOTE_BUILD_ARCH ?? process.arch;

// PyInstaller's spec `name='anvilnote-charts'` COLLECT step, so the onedir
// output lands at <chartsDist>/anvilnote-charts/ (not <chartsDist>/ itself).
const builtDir = path.join(c.chartsDir, c.chartsDist, "anvilnote-charts");

try {
  const staged = stageChartsBundle({
    source: builtDir,
    appDir: c.appDir,
    platform: targetPlatform,
    arch: targetArch,
  });
  console.log(`\ncharts executable staged and verified at ${staged}.`);
} catch (error) {
  if (error?.code === "ENOENT") {
    fail(
      `charts build not found at ${path.join(builtDir, chartsBinaryName(targetPlatform))}. ` +
        `Run \`pnpm prepare:desktop\` first.`,
    );
  }
  if (error instanceof Error && /Invalid charts sidecar/.test(error.message)) {
    fail(
      `${error.message}\n\n` +
        `anvilnote-charts is a PyInstaller build and cannot be cross-compiled: ` +
        `\`uv run pyinstaller\` always produces a binary for the machine it runs ` +
        `on, never for a different declared target. Building for ${targetPlatform}-` +
        `${targetArch} requires actually running \`pnpm build:charts\` (or the full ` +
        `prepare:desktop pipeline) ON a ${targetPlatform} machine/runner/container — ` +
        `there is currently no step in dist-windows.mjs or dist-linux.mjs that does ` +
        `this, so a local macOS build cannot produce a working charts sidecar for ` +
        `either platform yet.`,
    );
  }
  throw error;
}
