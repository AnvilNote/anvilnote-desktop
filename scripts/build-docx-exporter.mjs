import fs from "node:fs";
import path from "node:path";
import { config, run, fail, logStep } from "./load-env.mjs";

const c = config();
logStep("Building anvilnote-docx-exporter (bundled desktop CLI)");

const pkg = path.join(c.docxExporterDir, "package.json");
if (!fs.existsSync(pkg)) fail(`anvilnote-docx-exporter: package.json not found at ${pkg}`);
const json = JSON.parse(fs.readFileSync(pkg, "utf8"));
if (!json.scripts?.["build:desktop"]) {
  fail(
    `anvilnote-docx-exporter: no "build:desktop" script. Update it to add the ` +
      `esbuild bundle (dist/cli.js) so it runs without node_modules.`,
  );
}
run("pnpm", ["build:desktop"], c.docxExporterDir);
