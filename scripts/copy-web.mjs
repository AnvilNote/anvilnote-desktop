// Assemble the Next.js standalone build into dist/app/web.
//
// `next build` with output:"standalone" emits `.next/standalone/` (server.js,
// package.json, .next server files, and a pnpm-shaped node_modules). We do NOT
// copy its node_modules directly because Next may emit broken symlinks under
// `.pnpm/node_modules/*`; instead we copy the server files and then install a
// fresh hoisted production node_modules from the web repo's lockfile. Final
// layout:
//
//   dist/app/web/
//     server.js, package.json, .next/                 (from standalone)
//     node_modules/                                   (reinstalled, hoisted)
//     .next/static/                                   (copied separately)
//     public/                                         (if present)

import fs from "node:fs";
import path from "node:path";
import { config, ensureDir, copyInto, fail, logStep, run } from "./load-env.mjs";
import { copyDirectoryResolved } from "./fs-copy.mjs";

const c = config();
logStep("Copying Next standalone build -> dist/app/web");

const nextDir = path.join(c.webDir, ".next");
const standalone = path.join(nextDir, "standalone");
const staticDir = path.join(nextDir, "static");

if (!fs.existsSync(standalone)) {
  fail(
    `Standalone build not found at ${standalone}. Ensure anvilnote-web has ` +
      `output:"standalone" in next.config and run \`pnpm build:web\` first.`,
  );
}

const dest = path.join(c.appDir, "web");
fs.rmSync(dest, { recursive: true, force: true });
ensureDir(dest);

// 1. Standalone server entry + manifests, excluding standalone node_modules.
copyInto(path.join(standalone, "server.js"), dest, "server.js");
copyInto(path.join(standalone, "package.json"), dest, "package.json");
copyDirectoryResolved(path.join(standalone, ".next"), path.join(dest, ".next"));
console.log(`  copied ${standalone}/.next -> ${dest}/.next`);

// 2. Static assets next to the server.
if (fs.existsSync(staticDir)) {
  copyInto(staticDir, path.join(dest, ".next"), "static");
} else {
  console.warn(`  warning: ${staticDir} not found (no static assets?)`);
}

// 3. public/ if the web app has one.
const publicDir = path.join(c.webDir, "public");
if (fs.existsSync(publicDir)) copyInto(publicDir, dest, "public");

// 4. Production node_modules (hoisted so electron-builder signs real files).
const lock = path.join(c.webDir, "pnpm-lock.yaml");
if (!fs.existsSync(lock)) {
  fail(`pnpm-lock.yaml not found at ${lock}; cannot stage a reproducible web node_modules.`);
}
copyInto(lock, dest, "pnpm-lock.yaml");
logStep("Installing web production node_modules (hoisted) -> dist/app/web/node_modules");
run(
  "pnpm",
  [
    "install",
    "--prod",
    "--config.node-linker=hoisted",
    "--ignore-workspace",
    "--no-frozen-lockfile",
    "--config.strict-dep-builds=false",
  ],
  dest,
);
console.log("web prod node_modules staged.");

if (!fs.existsSync(path.join(dest, "server.js"))) {
  fail(`Assembled web is missing server.js at ${dest}`);
}
console.log("web standalone staged.");
