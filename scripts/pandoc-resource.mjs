import fs from "node:fs";
import path from "node:path";

function bundledPlatformDir(platform = process.platform, arch = process.arch) {
  if (platform === "darwin") {
    return arch === "arm64" ? "darwin-arm64" : "darwin-x64";
  }
  return `${platform}-${arch}`;
}

function bundledBinaryName(platform = process.platform) {
  return platform === "win32" ? "pandoc.exe" : "pandoc";
}

function isExecutable(file, platform = process.platform) {
  try {
    fs.accessSync(file, platform === "win32" ? fs.constants.F_OK : fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export function expectedBundledPandocPath(repoRoot, platform = process.platform, arch = process.arch) {
  return path.join(
    repoRoot,
    "resources",
    "bin",
    "pandoc",
    bundledPlatformDir(platform, arch),
    bundledBinaryName(platform),
  );
}

// Unlike Typst, a Pandoc found via `which` is deliberately NOT accepted here:
// a system install is very likely a dynamically-linked Homebrew build (see
// resources/bin/pandoc/README.md) that would silently break once copied into
// the packaged app.
export function resolvePandocBuildSource(repoRoot, env = process.env) {
  const bundled = expectedBundledPandocPath(repoRoot);
  if (isExecutable(bundled)) {
    return { source: bundled, bundled, mode: "bundled" };
  }

  const override = env.ANVILNOTE_PANDOC_PATH;
  if (override && isExecutable(override)) {
    return { source: override, bundled, mode: "env" };
  }

  throw new Error(
    `Pandoc binary missing for build target ${bundledPlatformDir()}. ` +
      `Expected ${bundled} — download the official portable release from ` +
      `https://github.com/jgm/pandoc/releases (pandoc-<ver>-<arch>-macOS.zip, ` +
      `NOT a Homebrew install, which is dynamically linked and won't run once ` +
      `copied elsewhere), or set ANVILNOTE_PANDOC_PATH to an executable Pandoc binary.`,
  );
}
