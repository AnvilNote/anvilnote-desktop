// Verifies the sibling repos exist and look buildable. Exits non-zero with a
// clear report when any are missing — never touches the sibling repos.

import fs from "node:fs";
import path from "node:path";
import { config, logStep } from "./load-env.mjs";

const c = config();
const nodeRepos = [
  ["anvilnote-web", c.webDir],
  ["anvilnote-api", c.apiDir],
  ["anvilnote-ai-writer", c.aiWriterDir],
  ["anvilnote-renderer", c.rendererDir],
  ["anvilnote-docx-exporter", c.docxExporterDir],
];
// anvilnote-charts is a pure-Python (uv-managed) project, not Node — it has
// no package.json, so it needs its own marker file check rather than being
// lumped into nodeRepos above (which is what this looked like before,
// unnoticed until an actual pack/dist run hit it — build-charts.mjs and
// copy-charts.mjs had the exact same wrong assumption, already fixed).
const pythonRepos = [["anvilnote-charts", c.chartsDir, "pyproject.toml"]];

logStep("Checking sibling repos");
let ok = true;

for (const [name, dir] of nodeRepos) {
  if (!fs.existsSync(dir)) {
    console.error(`✖ ${name}: directory not found: ${dir}`);
    ok = false;
    continue;
  }
  if (!fs.existsSync(path.join(dir, "package.json"))) {
    console.error(`✖ ${name}: package.json not found in ${dir}`);
    ok = false;
    continue;
  }
  console.log(`✓ ${name}: ${dir}`);
}

for (const [name, dir, marker] of pythonRepos) {
  if (!fs.existsSync(dir)) {
    console.error(`✖ ${name}: directory not found: ${dir}`);
    ok = false;
    continue;
  }
  if (!fs.existsSync(path.join(dir, marker))) {
    console.error(`✖ ${name}: ${marker} not found in ${dir}`);
    ok = false;
    continue;
  }
  console.log(`✓ ${name}: ${dir}`);
}

if (!ok) {
  console.error(
    "\nOne or more sibling repos are missing. Expected them next to this repo " +
      "(see README) or configured via .env (ANVILNOTE_WEB_DIR, etc).",
  );
  process.exit(1);
}
console.log("\nAll sibling repos present.");
