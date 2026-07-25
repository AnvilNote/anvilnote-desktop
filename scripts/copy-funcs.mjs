// Copy the PyInstaller onefile executable into dist/app/funcs. Unlike the
// Node-based CLI repos, there's no node_modules to worry about — PyInstaller
// already bundled sympy/numpy/jinja2/fastapi/uvicorn (and the src/templates
// .tex.jinja files, via the build-desktop Makefile target's --add-data flag)
// into the single binary. tectonic itself is bundled separately (see
// resources/bin/tectonic and electron-builder.config.cjs) — anvilnote-funcs
// only needs TECTONIC_BIN pointed at it via env, set by local-funcs.ts at
// spawn time.

import fs from "node:fs";
import path from "node:path";
import { config, ensureDir, fail, logStep } from "./load-env.mjs";

const c = config();
logStep("Copying funcs runtime -> dist/app/funcs");

const binName = process.platform === "win32" ? "anvilnote-funcs.exe" : "anvilnote-funcs";
const builtBinary = path.join(c.funcsDir, c.funcsDist, binName);
if (!fs.existsSync(builtBinary)) {
  fail(`funcs build not found at ${builtBinary}. Run \`pnpm build:funcs\` first.`);
}

const dest = path.join(c.appDir, "funcs");
fs.rmSync(dest, { recursive: true, force: true });
ensureDir(dest);
fs.copyFileSync(builtBinary, path.join(dest, binName));
fs.chmodSync(path.join(dest, binName), 0o755);

console.log(`\nfuncs executable staged at dist/app/funcs/${binName}.`);
