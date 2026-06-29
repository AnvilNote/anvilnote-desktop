import fs from "node:fs";
import path from "node:path";
import { config, run, fail, logStep } from "./load-env.mjs";

const c = config();
logStep("Building anvilnote-api (desktop: Postgres + SQLite clients + tsc)");

const pkg = path.join(c.apiDir, "package.json");
if (!fs.existsSync(pkg)) fail(`anvilnote-api: package.json not found at ${pkg}`);
const json = JSON.parse(fs.readFileSync(pkg, "utf8"));
if (!json.scripts?.["build:desktop"]) {
  fail(
    `anvilnote-api: no "build:desktop" script. The API must generate the SQLite ` +
      `client (prisma/sqlite.prisma) and compile for the desktop sidecar.`,
  );
}
run("pnpm", ["build:desktop"], c.apiDir);
