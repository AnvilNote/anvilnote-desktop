import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

function bundledPlatformDir(platform = process.platform, arch = process.arch) {
  if (platform === "darwin") {
    return arch === "arm64" ? "darwin-arm64" : "darwin-x64";
  }
  return `${platform}-${arch}`;
}

function bundledBinaryName(platform = process.platform) {
  return platform === "win32" ? "typst.exe" : "typst";
}

function isExecutable(file, platform = process.platform) {
  try {
    // Windows has no X_OK bit; existence is enough.
    fs.accessSync(file, platform === "win32" ? fs.constants.F_OK : fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export function expectedBundledTypstPath(repoRoot, platform = process.platform, arch = process.arch) {
  return path.join(
    repoRoot,
    "resources",
    "bin",
    "typst",
    bundledPlatformDir(platform, arch),
    bundledBinaryName(platform),
  );
}

export function resolveTypstBuildSource(repoRoot, env = process.env) {
  const bundled = expectedBundledTypstPath(repoRoot);
  if (isExecutable(bundled)) {
    return { source: bundled, bundled, mode: "bundled" };
  }

  const override = env.ANVILNOTE_TYPST_PATH;
  if (override && isExecutable(override)) {
    return { source: override, bundled, mode: "env" };
  }

  try {
    const which = execFileSync("which", ["typst"], {
      encoding: "utf8",
      env: { ...process.env, ...env },
    }).trim();
    if (which && isExecutable(which)) {
      return { source: which, bundled, mode: "system" };
    }
  } catch {
    // Fall through to the explicit error below.
  }

  throw new Error(
    `Typst binary missing for build target ${bundledPlatformDir()}. ` +
      `Expected ${bundled}, or set ANVILNOTE_TYPST_PATH to an executable Typst binary, ` +
      `or install Typst so \`which typst\` succeeds before packaging.`,
  );
}
