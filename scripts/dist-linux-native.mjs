// Build native Linux packages directly on a real Linux machine — no Docker,
// no cross-arch emulation, no host-then-override staging tricks. Mirrors
// dist-windows.mjs's own structure exactly: everything (including
// build-charts.mjs's `uv run pyinstaller`, which cannot cross-compile) runs
// on the actual target OS, so process.platform/process.arch are already
// correct throughout — nothing here needs ANVILNOTE_BUILD_PLATFORM/_ARCH or
// TARGET_ARCH overrides the way dist-linux.mjs's Docker path does (that
// script builds dist/app on a macOS HOST first, then has to re-stage
// target-specific tools — typst/pandoc/charts — inside the container
// afterward; running natively on Linux never has a wrong-platform host step
// to correct in the first place).
//
// Usage (run ON the Linux machine, from this repo's checkout there):
//   pnpm dist:linux:native
// Or via Makefile:
//   make dist-linux-native

import { logStep, repoRoot, run, fail } from "./load-env.mjs";

if (process.platform !== "linux") {
  fail(
    `dist-linux-native must run on Linux; got ${process.platform}. ` +
      `On macOS, use \`pnpm dist:linux\` (Docker) instead — see that script's own header for why.`,
  );
}

logStep(`Preparing Linux ${process.arch} runtime`);
run("pnpm", ["fetch:typst:linux"], repoRoot);
run("pnpm", ["fetch:pandoc:linux"], repoRoot);
run("pnpm", ["prepare:desktop"], repoRoot);
run("pnpm", ["fetch:tectonic:target"], repoRoot);
run("pnpm", ["build:main"], repoRoot);

logStep(`Building Linux ${process.arch} packages (AppImage + deb)`);
run(
  "pnpm",
  [
    "exec",
    "electron-builder",
    "--linux",
    "AppImage",
    "deb",
    `--${process.arch}`,
    "--config",
    "electron-builder.config.cjs",
    "--publish",
    "never",
  ],
  repoRoot,
);

logStep("Done. Artifacts in release/");
