// Builds anvilnote-charts as a PyInstaller *onedir* bundle (not the
// Node/esbuild CLI this script used to look for — anvilnote-charts is a
// pure-Python project, uv-managed, rewritten to Python+Plotly+kaleido a
// while back; nothing here was updated to match at the time). Onedir, not
// onefile, matching anvilnote-charts.spec's own COLLECT step: kaleido
// bundles its own Chromium, which needs to sit next to the executable on
// disk, not be re-extracted from a single-file archive on every launch.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { config, run, fail, logStep } from "./load-env.mjs";

const c = config();
logStep("Building anvilnote-charts (PyInstaller onedir)");

const specFile = path.join(c.chartsDir, "anvilnote-charts.spec");
if (!fs.existsSync(specFile)) {
  fail(`anvilnote-charts: spec file not found at ${specFile}`);
}

const lockfile = path.join(c.chartsDir, "uv.lock");
if (!fs.existsSync(lockfile)) {
  fail(`anvilnote-charts: no uv.lock found at ${c.chartsDir}. Run \`uv sync\` in anvilnote-charts first.`);
}

const targetArch = process.env.ANVILNOTE_BUILD_ARCH ?? process.arch;

// PyInstaller can never cross-compile — `uv run pyinstaller` always produces
// a binary for whatever process actually runs it, never a declared target
// (see copy-charts.mjs's own error message for the general case: Linux/
// Windows targets from this Mac need a real matching-OS machine/container).
// The one cross-arch case this Mac CAN satisfy on its own is macOS x64 from
// an arm64 host: Rosetta 2 runs a genuine x86_64 process, so an x86_64 uv +
// x86_64 CPython (fetched fresh into an isolated env below, never touching
// the normal arm64 `.venv`) produce a real x86_64 PyInstaller build, not an
// emulated stand-in — verified empirically (file(1) reports a real x86_64
// Mach-O, and the binary runs and answers `--help` under `arch -x86_64`).
const needsRosettaCrossBuild =
  process.platform === "darwin" && targetArch === "x64" && process.arch !== "x64";

const UV_X64_VERSION = process.env.ANVILNOTE_UV_X64_VERSION ?? "0.12.5";
const UV_X64_PYTHON = process.env.ANVILNOTE_UV_X64_PYTHON ?? "cpython-3.12.14-macos-x86_64-none";

function resolveX64Uv() {
  const override = process.env.ANVILNOTE_UV_X64_PATH;
  if (override) {
    if (!fs.existsSync(override)) fail(`ANVILNOTE_UV_X64_PATH not found: ${override}`);
    return override;
  }

  const cacheDir = path.join(os.homedir(), ".cache", "anvilnote-build-tools", "uv-x64");
  const dest = path.join(cacheDir, "uv");
  if (fs.existsSync(dest)) return dest;

  logStep(`Fetching x86_64 uv ${UV_X64_VERSION} (one-time, cached at ${dest})`);
  fs.mkdirSync(cacheDir, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "uv-x64-"));
  try {
    const url = `https://github.com/astral-sh/uv/releases/download/${UV_X64_VERSION}/uv-x86_64-apple-darwin.tar.gz`;
    const archive = path.join(tmp, "uv-x64.tar.gz");
    execFileSync("curl", ["-fL", "-o", archive, url], { stdio: "inherit" });
    execFileSync("tar", ["-xf", archive, "-C", tmp], { stdio: "inherit" });
    fs.copyFileSync(path.join(tmp, "uv-x86_64-apple-darwin", "uv"), dest);
    fs.chmodSync(dest, 0o755);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  return dest;
}

if (needsRosettaCrossBuild) {
  const uvX64 = resolveX64Uv();
  // Isolated from the normal arm64 `.venv` (a different interpreter arch
  // cannot share a venv) and from `dist`/`build` (so a native rebuild
  // afterward doesn't inherit x64 leftovers, and vice versa).
  const envDir = path.join(c.chartsDir, ".venv-x64");
  const distDir = process.env.ANVILNOTE_CHARTS_DIST ?? "dist-x64";
  process.env.UV_PROJECT_ENVIRONMENT = envDir;

  run("arch", ["-x86_64", uvX64, "sync", "--python", UV_X64_PYTHON], c.chartsDir);
  run(
    "arch",
    [
      "-x86_64",
      uvX64,
      "run",
      "--python",
      UV_X64_PYTHON,
      "pyinstaller",
      "--clean",
      "--noconfirm",
      "--distpath",
      distDir,
      "--workpath",
      "build-x64",
      "anvilnote-charts.spec",
    ],
    c.chartsDir,
  );
} else {
  run("uv", ["run", "pyinstaller", "--clean", "--noconfirm", "anvilnote-charts.spec"], c.chartsDir);
}
