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
  // pnpm install reliably finishes its actual work (every package resolved
  // and written to disk, "Done in Xs" printed) but then the node process
  // itself SIGABRTs on exit under QEMU emulation — a libuv/epoll race
  // ("uv__io_poll: Assertion `errno == EEXIST' failed") in teardown, not a
  // real install failure. `|| true` stops that from killing the whole
  // container (which --rm would otherwise tear down, discarding the
  // already-populated node_modules); if the install genuinely failed
  // partway, the next step (fetch-typst-linux / build:main) fails loudly
  // on the missing files instead.
  "(pnpm install --frozen-lockfile --prod=false || true)",
  // Hard check instead of trusting pnpm's own exit code (see above): fail
  // loudly here if the install genuinely didn't finish, rather than limping
  // into later steps with a half-populated node_modules.
  "test -x node_modules/.bin/electron-builder",
  "node scripts/fetch-typst-linux.mjs",
  "node scripts/fetch-pandoc-linux.mjs",
  // NOT `pnpm build:main`: running anything through the pnpm CLI again here
  // re-triggers its own dependency-status check, which decides the just-
  // crashed install above left node_modules "inconsistent" (pnpm's internal
  // bookkeeping didn't get to finalize before the SIGABRT, even though the
  // files themselves are all there) and silently re-runs a full install —
  // which then hits the exact same teardown crash, every time. Calling tsc
  // directly skips pnpm's CLI (and that check) entirely.
  "npx tsc -p tsconfig.json",
  "test -f dist/main/main.js",
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
    // libuv's io_uring path is unreliable under QEMU's syscall translation —
    // it reproducibly crashes pnpm install with
    // "uv__io_poll: Assertion `errno == EEXIST' failed" partway through.
    // Forcing the epoll fallback avoids it; epoll emulates correctly under QEMU.
    "-e", "UV_USE_IO_URING=0",
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
