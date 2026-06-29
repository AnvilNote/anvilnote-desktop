// Copy the renderer runtime into dist/app/renderer: compiled `dist`,
// package.json, and the templates the renderer loads at runtime.
//
// The renderer must never depend on a system-installed Typst; the API sidecar
// passes it ANVILNOTE_TYPST_PATH / TYPST_BIN, ANVILNOTE_FONT_DIR, and
// ANVILNOTE_TEMPLATE_DIR (resolved from the bundle by the Electron main).

import fs from "node:fs";
import path from "node:path";
import { config, ensureDir, copyInto, fail, logStep } from "./load-env.mjs";

const c = config();
logStep("Copying renderer runtime -> dist/app/renderer");

const rendDist = path.join(c.rendererDir, c.rendererDist);
if (!fs.existsSync(rendDist)) {
  fail(`Renderer build not found at ${rendDist}. Run \`pnpm build:renderer\` first.`);
}

const dest = path.join(c.appDir, "renderer");
fs.rmSync(dest, { recursive: true, force: true });
ensureDir(dest);

copyInto(rendDist, dest, "dist");
copyInto(path.join(c.rendererDir, "package.json"), dest, "package.json");

const templates = path.join(c.rendererDir, "templates");
if (fs.existsSync(templates)) copyInto(templates, dest, "templates");

console.log(
  "\nrenderer staged. dist/cli.js is the esbuild bundle (build:desktop), so no " +
    "node_modules are needed at runtime; templates are copied alongside.",
);
