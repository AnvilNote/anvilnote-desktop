import fs from "node:fs";
import path from "node:path";
import { config, run, fail, logStep } from "./load-env.mjs";

const c = config();
logStep("Building anvilnote-funcs (PyInstaller onefile)");

const lockfile = path.join(c.funcsDir, "poetry.lock");
if (!fs.existsSync(lockfile)) {
  fail(`anvilnote-funcs: no poetry.lock found at ${c.funcsDir}. Run \`make install\` in anvilnote-funcs first.`);
}

run("make", ["build-desktop"], c.funcsDir);
