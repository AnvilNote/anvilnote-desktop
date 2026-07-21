// Build Linux desktop packages (AppImage + deb) for x64 and arm64 by driving
// electron-builder inside a Linux container on the host (Docker on macOS).
//
// Why Docker: deb packaging needs dpkg/fakeroot and the linux-native
// app-builder-bin helper, none of which exist on macOS. The
// electronuserland/builder image carries all of it.
//
// Flow:
//   1. host: prepare:desktop -> dist/app (web/api/renderer/fonts/templates,
//      platform-independent). Reused as-is unless ANVILNOTE_LINUX_FRESH=1.
//   2. per arch, in a matching-platform container:
//        pnpm install (linux-native deps, isolated from the host node_modules)
//        fetch-typst-linux  (stages the Linux Typst into dist/app/bin)
//        fetch-pandoc-linux (stages the Linux Pandoc into dist/app/bin)
//        build:main         (tsc)
//        electron-builder --linux AppImage deb --<arch>
//
// Artifacts land in release/ on the host (bind-mounted).

import fs from "node:fs";
import path from "node:path";
import { config, run, logStep, fail, repoRoot } from "./load-env.mjs";

const IMAGE = process.env.ANVILNOTE_LINUX_IMAGE ?? "electronuserland/builder:latest";
const TARGETS = (process.env.ANVILNOTE_LINUX_TARGETS ?? "AppImage deb").trim();

// Accept arches from CLI (`node scripts/dist-linux.mjs x64`) or env, default both.
const cliArchs = process.argv.slice(2).filter(Boolean);
const archs = (cliArchs.length ? cliArchs : (process.env.ANVILNOTE_LINUX_ARCHS ?? "x64 arm64").split(/\s+/))
  .filter(Boolean);

const SUPPORTED = new Set(["x64", "arm64"]);
for (const a of archs) {
  if (!SUPPORTED.has(a)) fail(`Unsupported arch "${a}" (expected x64 or arm64)`);
}

// Sanity: Docker present.
try {
  run("docker", ["--version"]);
} catch {
  fail("Docker not found. Install Docker Desktop and retry.");
}

const c = config();
if (process.env.ANVILNOTE_LINUX_FRESH === "1" || !fs.existsSync(path.join(c.appDir, "web"))) {
  logStep("Preparing runtime tree on host (prepare:desktop)");
  run("pnpm", ["prepare:desktop"], repoRoot);
} else {
  console.log(`Reusing existing ${c.appDir} (set ANVILNOTE_LINUX_FRESH=1 to rebuild it)`);
}

const inContainer = [
  "set -euo pipefail",
  "corepack enable",
  "pnpm install --frozen-lockfile --prod=false",
  "node scripts/fetch-typst-linux.mjs",
  "node scripts/fetch-pandoc-linux.mjs",
  "pnpm build:main",
  `npx electron-builder --linux ${TARGETS} --__ARCH__ -c electron-builder.config.cjs`,
].join(" && ");

for (const arch of archs) {
  logStep(`Building Linux ${arch} (${TARGETS}) in ${IMAGE}`);
  const cmd = inContainer.replace("__ARCH__", arch);
  run("docker", [
    "run", "--rm",
    // No --platform: the image is amd64-only. electron-builder cross-packages
    // arm64 from it; on Apple Silicon the amd64 container runs under emulation.
    "-e", `TARGET_ARCH=${arch}`,
    "-v", `${repoRoot}:/project`,
    // pnpm resolves the "@anvilnote/ai-writer": "file:../anvilnote-ai-writer"
    // dependency relative to /project, i.e. /anvilnote-ai-writer inside the
    // container — bind-mount the sibling repo there to match.
    "-v", `${c.aiWriterDir}:/anvilnote-ai-writer`,
    // Anonymous volume shadows the host node_modules so the linux-native install
    // inside the container never clobbers the host's macOS node_modules.
    "-v", "/project/node_modules",
    "-w", "/project",
    IMAGE,
    "bash", "-lc", cmd,
  ]);
}

logStep(`Done. Artifacts in ${path.join(repoRoot, "release")}`);
