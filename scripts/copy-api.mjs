// Copy the API runtime into dist/app/api: the compiled `dist`, package.json,
// and (if present) the Prisma schema. node_modules are intentionally NOT copied.
//
// Runtime contract (see README): anvilnote-api should ship a bundled production
// entry (e.g. dist/desktop.js) so the sidecar runs without external
// node_modules. Until then this stages the tsc output as-is.

import fs from "node:fs";
import path from "node:path";
import { config, ensureDir, copyInto, fail, logStep } from "./load-env.mjs";

const c = config();
logStep("Copying API runtime -> dist/app/api");

const apiDist = path.join(c.apiDir, c.apiDist);
if (!fs.existsSync(apiDist)) {
  fail(`API build not found at ${apiDist}. Run \`pnpm build:api\` first.`);
}

const dest = path.join(c.appDir, "api");
fs.rmSync(dest, { recursive: true, force: true });
ensureDir(dest);

copyInto(apiDist, dest, "dist");
copyInto(path.join(c.apiDir, "package.json"), dest, "package.json");

const prisma = path.join(c.apiDir, "prisma");
if (fs.existsSync(prisma)) copyInto(prisma, dest, "prisma");

console.log(
  "\nNOTE: node_modules were not bundled. For a self-contained app the API must " +
    "provide a bundled production entry — see README runtime contract.",
);
