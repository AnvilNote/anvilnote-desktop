import fs from "node:fs";
import path from "node:path";
import { config, run, fail, logStep } from "./load-env.mjs";
import {
  assertFuncsBinaryTarget,
  funcsBinaryName,
  pyinstallerAddData,
} from "./funcs-target.mjs";

const c = config();
logStep("Building anvilnote-funcs (PyInstaller onefile)");

const lockfile = path.join(c.funcsDir, "poetry.lock");
if (!fs.existsSync(lockfile)) {
  fail(`anvilnote-funcs: no poetry.lock found at ${c.funcsDir}. Run \`make install\` in anvilnote-funcs first.`);
}

run(
  "poetry",
  [
    "run",
    "pyinstaller",
    "--clean",
    "--noconfirm",
    "--onefile",
    "--name",
    "anvilnote-funcs",
    "--distpath",
    c.funcsDist,
    "--workpath",
    "build",
    "--add-data",
    pyinstallerAddData(process.platform),
    "src/main.py",
  ],
  c.funcsDir,
);

const builtBinary = path.join(c.funcsDir, c.funcsDist, funcsBinaryName(process.platform));
assertFuncsBinaryTarget(builtBinary, process.platform, process.arch);
console.log(`\nfuncs executable built and verified for ${process.platform}-${process.arch}.`);
