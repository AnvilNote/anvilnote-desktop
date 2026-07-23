import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const packagePath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "package.json");
const repoRoot = path.dirname(packagePath);

test("desktop development prepares the local runtime before Electron starts", () => {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));

  assert.match(
    packageJson.scripts.dev,
    /^pnpm prepare:desktop && pnpm build:main && electron /u,
  );
});

test("hot development has one Desktop entry point for Next hot reload and secure storage", () => {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  const makefile = fs.readFileSync(path.join(repoRoot, "Makefile"), "utf8");

  assert.equal(packageJson.scripts["dev:hot"], "node scripts/dev-hot.mjs");
  assert.match(makefile, /^dev-hot:.*\n\t\$\(PM\) dev:hot$/mu);

  const script = fs.readFileSync(path.join(repoRoot, "scripts/dev-hot.mjs"), "utf8");
  assert.match(script, /prepare:desktop/u);
  assert.match(script, /ANVILNOTE_WEB_DEV_URL/u);
  assert.match(script, /electron/u);
});

test("desktop web build explicitly selects the desktop runtime", () => {
  const buildScript = fs.readFileSync(path.join(repoRoot, "scripts/build-web.mjs"), "utf8");
  const hotScript = fs.readFileSync(path.join(repoRoot, "scripts/dev-hot.mjs"), "utf8");

  assert.match(
    buildScript,
    /process\.env\.NEXT_PUBLIC_ANVILNOTE_RUNTIME = "desktop"/u,
  );
  assert.match(buildScript, /run\("pnpm", \["build"\], c\.webDir\)/u);
  assert.match(hotScript, /spawnTracked\(\["dev"\], c\.webDir\)/u);
});
