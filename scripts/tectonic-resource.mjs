import path from "node:path";

const TARGETS = new Map([
  [
    "win32-x64",
    {
      triple: "x86_64-pc-windows-msvc",
      extension: "zip",
      binary: "tectonic.exe",
    },
  ],
  [
    "linux-x64",
    {
      triple: "x86_64-unknown-linux-gnu",
      extension: "tar.gz",
      binary: "tectonic",
    },
  ],
  [
    "linux-arm64",
    {
      triple: "aarch64-unknown-linux-musl",
      extension: "tar.gz",
      binary: "tectonic",
    },
  ],
]);

export function tectonicReleaseSpec(platform, arch, version) {
  const platformDir = `${platform}-${arch}`;
  const target = TARGETS.get(platformDir);
  if (!target) throw new Error(`Unsupported Tectonic target: ${platformDir}`);
  return {
    archive: `tectonic-${version}-${target.triple}.${target.extension}`,
    binary: target.binary,
    platformDir,
  };
}

export function bundledTectonicPath(repoRoot, platform, arch, version = "0.16.9") {
  const spec = tectonicReleaseSpec(platform, arch, version);
  return path.join(
    repoRoot,
    "dist",
    "app",
    "bin",
    "tectonic",
    spec.platformDir,
    spec.binary,
  );
}
