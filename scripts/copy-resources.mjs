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
import { config, ensureDir, copyInto, fail, logStep } from "./load-env.mjs";
import { resolveTypstBuildSource } from "./typst-resource.mjs";
import { resolvePandocBuildSource } from "./pandoc-resource.mjs";

const c = config();
logStep("Copying resources -> dist/app");
ensureDir(c.appDir);

const items = [
  [path.join(c.repoRoot, "resources", "bin"), "bin"],
  [path.join(c.repoRoot, "resources", "fonts"), "fonts"],
  [path.join(c.repoRoot, "resources", "templates"), "templates"],
  [path.join(c.repoRoot, "resources", "typst-packages"), "typst-packages"],
  [path.join(c.repoRoot, "installer"), "installer"],
];

for (const [src, name] of items) {
  if (!fs.existsSync(src)) {
    console.warn(`  skip (missing): ${src}`);
    continue;
  }
  copyInto(src, c.appDir, name);
}

// Merge the renderer's shared font pool (renderer/fonts) into dist/app/fonts.
// ANVILNOTE_FONT_DIR points here at runtime; every template except plain-note
// resolves its fonts from this pool, so without it Typst renders fall back to
// system fonts (missing on a clean machine) and CJK/Latin glyphs disappear.
const rendererFonts = path.join(c.rendererDir, "fonts");
if (fs.existsSync(rendererFonts)) {
  assertFontsArePulled(rendererFonts);
  fs.cpSync(rendererFonts, path.join(c.appDir, "fonts"), { recursive: true });
  console.log(`  merged renderer shared font pool -> ${path.join(c.appDir, "fonts")}`);
} else {
  console.warn(`  warning: renderer shared font pool not found at ${rendererFonts}`);
}

// Guard against shipping Git LFS pointer files (a few hundred bytes of ASCII)
// instead of real fonts. This happens when the renderer repo was cloned without
// git-lfs; Typst then silently drops every bundled font.
function assertFontsArePulled(dir) {
  const fonts = fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && /\.(ttf|otf|ttc)$/i.test(e.name));
  for (const e of fonts) {
    const full = path.join(e.parentPath ?? e.path, e.name);
    if (fs.statSync(full).size < 1024) {
      const head = fs.readFileSync(full, "utf8").slice(0, 64);
      if (head.includes("git-lfs")) {
        fail(
          `Font is a Git LFS pointer, not a real font: ${full}\n` +
            `Run \`git lfs install && git lfs pull\` in ${c.rendererDir} first.`,
        );
      }
    }
  }
}

const typst = resolveTypstBuildSource(c.repoRoot);
const destTypst = path.join(c.appDir, "bin", "typst", path.basename(path.dirname(typst.bundled)), "typst");
ensureDir(path.dirname(destTypst));
fs.cpSync(typst.source, destTypst);
fs.chmodSync(destTypst, 0o755);
console.log(`  staged Typst (${typst.mode}) -> ${destTypst}`);

const pandoc = resolvePandocBuildSource(c.repoRoot);
const destPandoc = path.join(c.appDir, "bin", "pandoc", path.basename(path.dirname(pandoc.bundled)), "pandoc");
ensureDir(path.dirname(destPandoc));
fs.cpSync(pandoc.source, destPandoc);
fs.chmodSync(destPandoc, 0o755);
console.log(`  staged Pandoc (${pandoc.mode}) -> ${destPandoc}`);

console.log("resources staged.");
