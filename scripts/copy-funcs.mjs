// Copy the PyInstaller onefile executable into dist/app/funcs. Unlike the
// Node-based CLI repos, there's no node_modules to worry about — PyInstaller
// already bundled sympy/numpy/jinja2/fastapi/uvicorn (and the src/templates
// .tex.jinja files, via the build-desktop Makefile target's --add-data flag)
// into the single binary. tectonic itself is bundled separately (see
// resources/bin/tectonic and electron-builder.config.cjs) — anvilnote-funcs
// only needs TECTONIC_BIN pointed at it via env, set by local-funcs.ts at
// spawn time.

import path from "node:path";
import { config, fail, logStep } from "./load-env.mjs";
import { funcsBinaryName, stageFuncsBinary } from "./funcs-target.mjs";

const c = config();
logStep("Copying funcs runtime -> dist/app/funcs");

const binName = funcsBinaryName(process.platform);
const builtBinary = path.join(c.funcsDir, c.funcsDist, binName);
if (!path.isAbsolute(builtBinary)) {
  fail(`funcs build path must be absolute: ${builtBinary}`);
}
try {
  const staged = stageFuncsBinary({
    source: builtBinary,
    appDir: c.appDir,
    platform: process.platform,
    arch: process.arch,
  });
  console.log(`\nfuncs executable staged and verified at ${staged}.`);
} catch (error) {
  if (error?.code === "ENOENT") {
    fail(`funcs build not found at ${builtBinary}. Run \`pnpm prepare:desktop\` first.`);
  }
  throw error;
}
