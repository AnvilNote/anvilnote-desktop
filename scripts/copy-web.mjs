// Assemble the Next.js standalone build into dist/app/web.
//
// `next build` with output:"standalone" emits `.next/standalone/` (server.js +
// pruned node_modules + server files) but NOT the static assets or public/ —
// those must be placed next to server.js. Final layout:
//
//   dist/app/web/
//     server.js, package.json, node_modules/, .next/  (from standalone)
//     .next/static/                                    (copied separately)
//     public/                                          (if present)

import fs from "node:fs";
import path from "node:path";
import { config, ensureDir, copyInto, fail, logStep } from "./load-env.mjs";

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

// 1. The standalone tree (server.js, node_modules, .next server files).
fs.cpSync(standalone, dest, { recursive: true });
console.log(`  copied ${standalone} -> ${dest}`);

// 2. Static assets next to the server.
if (fs.existsSync(staticDir)) {
  copyInto(staticDir, path.join(dest, ".next"), "static");
} else {
  console.warn(`  warning: ${staticDir} not found (no static assets?)`);
}

// 3. public/ if the web app has one.
const publicDir = path.join(c.webDir, "public");
if (fs.existsSync(publicDir)) copyInto(publicDir, dest, "public");

if (!fs.existsSync(path.join(dest, "server.js"))) {
  fail(`Assembled web is missing server.js at ${dest}`);
}
console.log("web standalone staged.");
