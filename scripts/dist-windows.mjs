// Build the Windows x64 installer locally. The desktop runtime is JavaScript
// plus portable target binaries, so no Windows-native sidecar compilation is
// required while the dormant funcs feature is excluded from packaging.

import { logStep, repoRoot, run } from "./load-env.mjs";

process.env.ANVILNOTE_BUILD_PLATFORM = "win32";
process.env.ANVILNOTE_BUILD_ARCH = "x64";

logStep("Preparing Windows x64 runtime");
run("pnpm", ["fetch:typst:windows"], repoRoot);
run("pnpm", ["fetch:pandoc:windows"], repoRoot);
run("pnpm", ["prepare:desktop"], repoRoot);
run("pnpm", ["fetch:tectonic:target"], repoRoot);
run("pnpm", ["build:main"], repoRoot);

logStep("Building Windows x64 NSIS installer");
run(
  "pnpm",
  [
    "exec",
    "electron-builder",
    "--win",
    "nsis",
    "--x64",
    "--config",
    "electron-builder.config.cjs",
    "--publish",
    "never",
  ],
  repoRoot,
);
