// Builds anvilnote-charts as a PyInstaller *onedir* bundle (not the
// Node/esbuild CLI this script used to look for — anvilnote-charts is a
// pure-Python project, uv-managed, rewritten to Python+Plotly+kaleido a
// while back; nothing here was updated to match at the time). Onedir, not
// onefile, matching anvilnote-charts.spec's own COLLECT step: kaleido
// bundles its own Chromium, which needs to sit next to the executable on
// disk, not be re-extracted from a single-file archive on every launch.

import fs from "node:fs";
import path from "node:path";
import { config, run, fail, logStep } from "./load-env.mjs";

const c = config();
logStep("Building anvilnote-charts (PyInstaller onedir)");

const specFile = path.join(c.chartsDir, "anvilnote-charts.spec");
if (!fs.existsSync(specFile)) {
  fail(`anvilnote-charts: spec file not found at ${specFile}`);
}

const lockfile = path.join(c.chartsDir, "uv.lock");
if (!fs.existsSync(lockfile)) {
  fail(`anvilnote-charts: no uv.lock found at ${c.chartsDir}. Run \`uv sync\` in anvilnote-charts first.`);
}

run("uv", ["run", "pyinstaller", "--clean", "--noconfirm", "anvilnote-charts.spec"], c.chartsDir);
