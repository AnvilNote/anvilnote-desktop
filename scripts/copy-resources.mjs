// Stage bundled resources into the assembled runtime tree (dist/app):
//   resources/bin       -> dist/app/bin
//   resources/fonts     -> dist/app/fonts
//   resources/templates -> dist/app/templates
//   installer           -> dist/app/installer
//
// These are placeholders (READMEs / .gitkeep) until the Typst binary and
// license-cleared fonts are fetched by CI or staged locally. Nothing here
// requires system-installed Typst or system fonts.

import fs from "node:fs";
import path from "node:path";
import { config, ensureDir, copyInto, logStep } from "./load-env.mjs";

const c = config();
logStep("Copying resources -> dist/app");
ensureDir(c.appDir);

const items = [
  [path.join(c.repoRoot, "resources", "bin"), "bin"],
  [path.join(c.repoRoot, "resources", "fonts"), "fonts"],
  [path.join(c.repoRoot, "resources", "templates"), "templates"],
  [path.join(c.repoRoot, "installer"), "installer"],
];

for (const [src, name] of items) {
  if (!fs.existsSync(src)) {
    console.warn(`  skip (missing): ${src}`);
    continue;
  }
  copyInto(src, c.appDir, name);
}

console.log("resources staged.");
