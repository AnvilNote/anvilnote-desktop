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

const destination = path.join(c.appDir, "anvilnote-ai-writer");
fs.rmSync(destination, { recursive: true, force: true });
ensureDir(destination);
copyInto(sourceDist, destination, "dist");

for (const file of ["package.json", "LICENSE", "README.md", "THIRD_PARTY_NOTICES.md"]) {
  const source = path.join(c.aiWriterDir, file);
  if (!fs.existsSync(source)) fail(`AI Writer package file not found: ${source}`);
  copyInto(source, destination, file);
}

console.log("AI Writer runtime package staged.");
