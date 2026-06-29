// Copy the web build artifact into dist/app/web.
//
// anvilnote-web is a Next.js app. A desktop shell needs a STATIC artifact it can
// load from a file:// URL, i.e. a static export (`output: "export"` -> `out/`).
// We look for, in order: the configured ANVILNOTE_WEB_DIST, then `out`. A plain
// `.next` server build is intentionally NOT accepted (it is not static) — see
// the README runtime contract.

import fs from "node:fs";
import path from "node:path";
import { config, ensureDir, copyInto, fail, logStep } from "./load-env.mjs";

const c = config();
logStep("Copying web build -> dist/app/web");

const candidates = [
  path.join(c.webDir, c.webDist),
  path.join(c.webDir, "out"),
];
const src = candidates.find((p) => fs.existsSync(p));

if (!src) {
  fail(
    `No static web build found. Looked in:\n  ${candidates.join("\n  ")}\n` +
      `anvilnote-web must produce a static export (Next.js output: "export" -> ` +
      `out/) before it can be bundled. See README "Runtime contract".`,
  );
}

const destRoot = path.join(c.appDir, "web");
fs.rmSync(destRoot, { recursive: true, force: true });
ensureDir(c.appDir);
// Copy the contents of the artifact directory to dist/app/web.
copyInto(src, c.appDir, "web");
console.log("web artifact staged.");
