// Copy the docx-exporter runtime into dist/app/docx-exporter: compiled `dist`
// (the esbuild bundle, no node_modules needed) and the assets (callout.lua +
// reference.docx) Pandoc reads at export time.
//
// The exporter needs a system-installed Pandoc — unlike Typst, we don't
// bundle it. See anvilnote-docx-exporter/README.md.

import fs from "node:fs";
import path from "node:path";
import { config, ensureDir, copyInto, fail, logStep } from "./load-env.mjs";

const c = config();
logStep("Copying docx-exporter runtime -> dist/app/docx-exporter");

const exporterDist = path.join(c.docxExporterDir, c.docxExporterDist);
if (!fs.existsSync(exporterDist)) {
  fail(`docx-exporter build not found at ${exporterDist}. Run \`pnpm build:docx-exporter\` first.`);
}

const dest = path.join(c.appDir, "docx-exporter");
fs.rmSync(dest, { recursive: true, force: true });
ensureDir(dest);

copyInto(exporterDist, dest, "dist");

const assets = path.join(c.docxExporterDir, "assets");
if (!fs.existsSync(assets)) {
  fail(`docx-exporter assets not found at ${assets} (expected callout.lua + reference.docx).`);
}
copyInto(assets, dest, "assets");

console.log(
  "\ndocx-exporter staged. dist/cli.cjs is the esbuild bundle, so no node_modules " +
    "are needed at runtime; assets/ (callout.lua + reference.docx) is copied alongside.",
);
