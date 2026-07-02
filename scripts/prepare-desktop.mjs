// Assemble the full desktop runtime tree (dist/app) by running each step in
// order. Any failing step aborts with a clear error (see load-env `run`/`fail`).

import path from "node:path";
import { fileURLToPath } from "node:url";
import { run, logStep, repoRoot } from "./load-env.mjs";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));

const steps = [
  "clean.mjs",
  "ensure-sibling-repos.mjs",
  "build-web.mjs",
  "build-api.mjs",
  "build-renderer.mjs",
  "build-docx-exporter.mjs",
  "copy-web.mjs",
  "copy-api.mjs",
  "copy-renderer.mjs",
  "copy-docx-exporter.mjs",
  "copy-resources.mjs",
];

logStep("Preparing desktop runtime (dist/app)");
for (const step of steps) {
  logStep(`prepare: ${step}`);
  run("node", [path.join(scriptsDir, step)], repoRoot);
}

console.log("\n✓ Desktop runtime assembled at dist/app");
