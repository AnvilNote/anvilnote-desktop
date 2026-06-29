// Copy the API runtime into dist/app/api: the compiled `dist`, the generated
// SQLite Prisma client, package.json, and the Prisma schemas.
//
// IMPORTANT (production node_modules): the API is not bundled, so it needs its
// production dependencies (@prisma/client, the generated SQLite client's engine,
// express, etc.) at runtime. Because pnpm uses a symlinked store, those are NOT
// copied here. During macOS packaging, produce a self-contained, prod-only
// node_modules next to dist/app/api — e.g.:
//
//     pnpm --dir <anvilnote-api> deploy --prod --legacy <dist/app/api>
//
// and ensure the Prisma engines for the target macOS arch are present
// (prisma/sqlite.prisma sets binaryTargets darwin/darwin-arm64). This must run
// on (or fetch engines for) macOS — see README runtime contract.

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

// The runtime selector (lib/prisma.js) does require("../generated/sqlite-client")
// relative to dist/lib, so the generated client must live at dist/generated.
const generated = path.join(c.apiDir, "src", "generated");
if (fs.existsSync(generated)) {
  copyInto(generated, path.join(dest, "dist"), "generated");
} else {
  fail(
    `Generated SQLite client not found at ${generated}. Run \`pnpm build:api\` ` +
      `(which runs the API's build:desktop and generates prisma/sqlite.prisma).`,
  );
}

console.log(
  "\nNOTE: production node_modules (incl. Prisma engines for macOS) are NOT " +
    "bundled here — add them during macOS packaging (see file header / README).",
);
