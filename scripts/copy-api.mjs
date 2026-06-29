// Copy the API runtime into dist/app/api: the compiled `dist`, the generated
// SQLite Prisma client, package.json, the Prisma schemas, and a self-contained
// production node_modules.
//
// The API is not bundled (Prisma), so it needs its prod dependencies at runtime.
// We install them with a HOISTED linker so the result is a real, copyable,
// packageable node_modules (pnpm's default symlinked store is not). The runtime
// only loads the SQLite client (require of dist/generated/sqlite-client, which
// ships its own engine); @prisma/client is imported type-only, so no default
// client generation is required.
//
// IMPORTANT: the Prisma SQLite engine is platform-specific. Run `prepare`/`pack`
// on the TARGET macOS arch so build:desktop generates the darwin engine
// (prisma/sqlite.prisma sets binaryTargets darwin/darwin-arm64). Set
// ANVILNOTE_SKIP_API_DEPS=1 to skip the install during fast dev iteration.

import fs from "node:fs";
import path from "node:path";
import { config, ensureDir, copyInto, fail, run, logStep } from "./load-env.mjs";

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

// Production node_modules (hoisted so it's self-contained and packageable).
if (process.env.ANVILNOTE_SKIP_API_DEPS === "1") {
  console.log("\nANVILNOTE_SKIP_API_DEPS=1 — skipping prod node_modules install.");
} else {
  const lock = path.join(c.apiDir, "pnpm-lock.yaml");
  if (!fs.existsSync(lock)) {
    fail(`pnpm-lock.yaml not found at ${lock}; cannot stage a reproducible node_modules.`);
  }
  copyInto(lock, dest, "pnpm-lock.yaml");
  logStep("Installing API production node_modules (hoisted) -> dist/app/api/node_modules");
  run(
    "pnpm",
    [
      "install",
      "--prod",
      "--config.node-linker=hoisted",
      "--ignore-workspace",
      "--no-frozen-lockfile",
    ],
    dest,
  );
  console.log("API prod node_modules staged.");
}
