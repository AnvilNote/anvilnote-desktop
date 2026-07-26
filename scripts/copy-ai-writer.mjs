// Stage the built AI Writer package next to the API. The API's existing
// `file:../anvilnote-ai-writer` dependency then resolves during its isolated
// production install without relying on a developer checkout or stale dist.

import fs from "node:fs";
import path from "node:path";
import { config, ensureDir, copyInto, fail, logStep } from "./load-env.mjs";

const c = config();
logStep("Copying AI Writer package -> dist/app/anvilnote-ai-writer");

const sourceDist = path.join(c.aiWriterDir, c.aiWriterDist);
if (!fs.existsSync(sourceDist)) {
  fail(`AI Writer build not found at ${sourceDist}. Run \`pnpm build:ai-writer\` first.`);
}

const packageJsonSource = path.join(c.aiWriterDir, "package.json");
if (!fs.existsSync(packageJsonSource)) {
  fail(`AI Writer package file not found: ${packageJsonSource}`);
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonSource, "utf8"));
if (!Array.isArray(packageJson.files) || !packageJson.files.includes(c.aiWriterDist)) {
  fail(`AI Writer package must publish its ${c.aiWriterDist} runtime directory.`);
}

const publishedFiles = packageJson.files.map((file) => {
  if (
    typeof file !== "string" ||
    path.isAbsolute(file) ||
    file.split(/[\\/]/u).some((part) => part === "..")
  ) {
    fail(`Invalid AI Writer published file entry: ${String(file)}`);
  }
  return file;
});

const destination = path.join(c.appDir, "anvilnote-ai-writer");
fs.rmSync(destination, { recursive: true, force: true });
ensureDir(destination);
copyInto(packageJsonSource, destination, "package.json");
for (const file of publishedFiles) {
  const source = path.join(c.aiWriterDir, file);
  if (!fs.existsSync(source)) fail(`AI Writer published file not found: ${source}`);
  copyInto(source, destination, file);
}

console.log("AI Writer runtime package staged.");
