// Copy the charts CLI runtime into dist/app/charts: just the esbuild bundle
// (dist/cli.cjs), no node_modules needed. Unlike docx-exporter (system
// Pandoc), the charts CLI's `typst` binary + `@preview/simple-plot` package
// are the SAME bundled ones anvilnote-renderer already uses (see
// resources/typst-packages/preview/simple-plot/ and TYPST_PACKAGE_CACHE_PATH
// wiring) — nothing charts-specific to stage beyond the CLI itself.

import fs from "node:fs";
import path from "node:path";
import { config, ensureDir, copyInto, fail, logStep } from "./load-env.mjs";

const c = config();
logStep("Copying charts runtime -> dist/app/charts");

const chartsDist = path.join(c.chartsDir, c.chartsDist);
if (!fs.existsSync(chartsDist)) {
  fail(`charts build not found at ${chartsDist}. Run \`pnpm build:charts\` first.`);
}

const dest = path.join(c.appDir, "charts");
fs.rmSync(dest, { recursive: true, force: true });
ensureDir(dest);

copyInto(chartsDist, dest, "dist");

console.log("\ncharts CLI staged. dist/cli.cjs is the esbuild bundle, so no node_modules are needed at runtime.");
