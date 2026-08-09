// Same sidecar-arch-verification approach as funcs-target.mjs (kept as its
// own copy rather than a shared module — these packaging scripts have no
// existing shared-util file to put it in, and every other sidecar here
// already duplicates its own small helpers rather than reaching across
// scripts). Charts stages a whole PyInstaller *onedir* folder rather than a
// single onefile binary — kaleido bundles its own Chromium alongside the
// Python runtime, which needs to sit next to the executable, not inside it.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const PE_MACHINES = new Map([
  [0x8664, "x64"],
  [0xaa64, "arm64"],
]);

const ELF_MACHINES = new Map([
  [0x3e, "x64"],
  [0xb7, "arm64"],
]);

const MACHO_CPUS = new Map([
  [0x01000007, "x64"],
  [0x0100000c, "arm64"],
]);

export function chartsBinaryName(platform) {
  return platform === "win32" ? "anvilnote-charts.exe" : "anvilnote-charts";
}

function identifyPe(buffer) {
  if (buffer.length < 70 || buffer.toString("ascii", 0, 2) !== "MZ") return undefined;
  const peOffset = buffer.readUInt32LE(0x3c);
  if (
    peOffset + 6 > buffer.length ||
    buffer.toString("binary", peOffset, peOffset + 4) !== "PE\0\0"
  ) {
    return undefined;
  }
  const arch = PE_MACHINES.get(buffer.readUInt16LE(peOffset + 4));
  return arch ? { platform: "win32", arch } : undefined;
}

function identifyElf(buffer) {
  if (
    buffer.length < 20 ||
    buffer[0] !== 0x7f ||
    buffer.toString("ascii", 1, 4) !== "ELF" ||
    buffer[5] !== 1
  ) {
    return undefined;
  }
  const arch = ELF_MACHINES.get(buffer.readUInt16LE(18));
  return arch ? { platform: "linux", arch } : undefined;
}

function identifyMachO(buffer) {
  if (buffer.length < 8 || buffer.readUInt32LE(0) !== 0xfeedfacf) return undefined;
  const arch = MACHO_CPUS.get(buffer.readUInt32LE(4));
  return arch ? { platform: "darwin", arch } : undefined;
}

export function identifyChartsBinary(file) {
  const buffer = fs.readFileSync(file);
  return identifyPe(buffer) ?? identifyElf(buffer) ?? identifyMachO(buffer);
}

export function assertChartsBinaryTarget(file, platform, arch) {
  const actual = identifyChartsBinary(file);
  const expected = `${platform}-${arch}`;
  if (!actual) {
    throw new Error(`Invalid charts sidecar at "${file}": expected ${expected}, found unknown binary format`);
  }
  const found = `${actual.platform}-${actual.arch}`;
  if (found !== expected) {
    throw new Error(`Invalid charts sidecar at "${file}": expected ${expected}, found ${found}`);
  }
}

// `source` is the onedir folder PyInstaller's COLLECT step produced (e.g.
// anvilnote-charts/dist/anvilnote-charts/), copied whole into
// dist/app/charts so the executable keeps its bundled libs/Chromium
// alongside it.
export function stageChartsBundle({ source, appDir, platform, arch }) {
  const binPath = path.join(source, chartsBinaryName(platform));
  assertChartsBinaryTarget(binPath, platform, arch);

  const destDir = path.join(appDir, "charts");
  fs.rmSync(destDir, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(destDir), { recursive: true });
  if (platform === "darwin") {
    // NOT fs.cpSync here: Node silently resolves relative symlinks to an
    // ABSOLUTE path before recreating them at the destination (a known
    // cpSync quirk — it reads the link's realpath, not its raw readlink()
    // string). Harmless for a plain file tree, but PyInstaller's onedir
    // output for a macOS Python build embeds a real Python.framework, whose
    // Versions/Current symlink structure is RELATIVE by design (standard
    // framework layout). cpSync turned those into absolute symlinks
    // pointing at THIS MACHINE'S build directory (e.g.
    // /Users/.../anvilnote-charts/dist/.../Python) — broken for anyone
    // else, and codesign's hardened-runtime check rejects it outright
    // ("unsealed contents present in the root directory of an embedded
    // framework") since a framework whose own symlinks escape its bundle
    // can't be sealed. The system `cp -R` preserves a symlink's raw target
    // string as-is, same behavior every other unpacked macOS .app ships
    // with. `cp` is guaranteed present on macOS (unlike Windows, where it
    // isn't a standard command at all), so this branch is macOS-only.
    execFileSync("cp", ["-R", source, destDir]);
  } else {
    // Windows/Linux PyInstaller onedir output has no framework-style
    // symlinks to preserve (Windows never uses them for this; Linux's own
    // onedir layout is a flat directory of regular files and .so's) — plain
    // fs.cpSync is correct and portable here, and `cp` isn't reliably on
    // PATH on a native Windows build host the way it always is on macOS.
    fs.cpSync(source, destDir, { recursive: true });
  }

  const destBin = path.join(destDir, chartsBinaryName(platform));
  if (platform !== "win32") fs.chmodSync(destBin, 0o755);
  return destBin;
}
