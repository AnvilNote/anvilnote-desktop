import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import {
  assertFuncsBinaryTarget,
  funcsBinaryName,
  pyinstallerAddData,
  stageFuncsBinary,
} from "../scripts/funcs-target.mjs";

const require = createRequire(import.meta.url);
const electronBuilderConfig = require("../electron-builder.config.cjs");
const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function writeFixture(buffer) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "anvilnote-funcs-target-"));
  const file = path.join(dir, "sidecar");
  fs.writeFileSync(file, buffer);
  return { dir, file };
}

function peFixture(machine) {
  const buffer = Buffer.alloc(128);
  buffer.write("MZ", 0, "ascii");
  buffer.writeUInt32LE(64, 0x3c);
  buffer.write("PE\0\0", 64, "binary");
  buffer.writeUInt16LE(machine, 68);
  return buffer;
}

function elfFixture(machine) {
  const buffer = Buffer.alloc(64);
  buffer.set([0x7f, 0x45, 0x4c, 0x46, 2, 1], 0);
  buffer.writeUInt16LE(machine, 18);
  return buffer;
}

test("rejects a macOS sidecar staged for Windows", () => {
  const buffer = Buffer.alloc(64);
  buffer.writeUInt32LE(0xfeedfacf, 0);
  buffer.writeUInt32LE(0x0100000c, 4);
  const { dir, file } = writeFixture(buffer);

  try {
    assert.throws(
      () => assertFuncsBinaryTarget(file, "win32", "x64"),
      /expected win32-x64.*found darwin-arm64/,
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("accepts native Windows x64 and Linux arm64 sidecars", () => {
  const fixtures = [
    [peFixture(0x8664), "win32", "x64"],
    [elfFixture(0xb7), "linux", "arm64"],
  ];

  for (const [buffer, platform, arch] of fixtures) {
    const { dir, file } = writeFixture(buffer);
    try {
      assert.doesNotThrow(() => assertFuncsBinaryTarget(file, platform, arch));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

test("uses target-native binary names and PyInstaller data separators", () => {
  assert.equal(funcsBinaryName("win32"), "anvilnote-funcs.exe");
  assert.equal(funcsBinaryName("linux"), "anvilnote-funcs");
  assert.equal(pyinstallerAddData("win32"), "src/templates;src/templates");
  assert.equal(pyinstallerAddData("linux"), "src/templates:src/templates");
});

test("stages only a binary matching the requested target", () => {
  const source = writeFixture(peFixture(0x8664));
  const appDir = fs.mkdtempSync(path.join(os.tmpdir(), "anvilnote-app-"));

  try {
    const staged = stageFuncsBinary({
      source: source.file,
      appDir,
      platform: "win32",
      arch: "x64",
    });
    assert.equal(staged, path.join(appDir, "funcs", "anvilnote-funcs.exe"));
    assert.deepEqual(fs.readFileSync(staged), fs.readFileSync(source.file));
  } finally {
    fs.rmSync(source.dir, { recursive: true, force: true });
    fs.rmSync(appDir, { recursive: true, force: true });
  }
});

test("desktop release omits the dormant funcs sidecar", () => {
  assert.equal(
    electronBuilderConfig.extraResources.some(
      (entry) => entry.from === "dist/app/funcs" && entry.to === "funcs",
    ),
    false,
    "dormant funcs must not be copied into packaged resources",
  );

  const prepare = fs.readFileSync(
    path.join(repoRoot, "scripts/prepare-desktop.mjs"),
    "utf8",
  );
  assert.doesNotMatch(prepare, /build-funcs|copy-funcs/u);

  const workflow = fs.readFileSync(
    path.join(repoRoot, ".github/workflows/release-native-platforms.yml"),
    "utf8",
  );
  assert.doesNotMatch(workflow, /anvilnote-funcs|verify:funcs|Install funcs/u);

  const main = fs.readFileSync(path.join(repoRoot, "src/main/main.ts"), "utf8");
  assert.doesNotMatch(main, /startLocalFuncs|stopLocalFuncs|funcsPort/u);
});
