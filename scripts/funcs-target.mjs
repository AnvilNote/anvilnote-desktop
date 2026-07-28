import fs from "node:fs";
import path from "node:path";

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

export function funcsBinaryName(platform) {
  return platform === "win32" ? "anvilnote-funcs.exe" : "anvilnote-funcs";
}

export function pyinstallerAddData(platform) {
  const separator = platform === "win32" ? ";" : ":";
  return `src/templates${separator}src/templates`;
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

export function identifyFuncsBinary(file) {
  const buffer = fs.readFileSync(file);
  return identifyPe(buffer) ?? identifyElf(buffer) ?? identifyMachO(buffer);
}

export function assertFuncsBinaryTarget(file, platform, arch) {
  const actual = identifyFuncsBinary(file);
  const expected = `${platform}-${arch}`;
  if (!actual) {
    throw new Error(`Invalid funcs sidecar at "${file}": expected ${expected}, found unknown binary format`);
  }
  const found = `${actual.platform}-${actual.arch}`;
  if (found !== expected) {
    throw new Error(`Invalid funcs sidecar at "${file}": expected ${expected}, found ${found}`);
  }
}

export function stageFuncsBinary({ source, appDir, platform, arch }) {
  assertFuncsBinaryTarget(source, platform, arch);
  const destDir = path.join(appDir, "funcs");
  const dest = path.join(destDir, funcsBinaryName(platform));
  fs.rmSync(destDir, { recursive: true, force: true });
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(source, dest);
  if (platform !== "win32") fs.chmodSync(dest, 0o755);
  return dest;
}
