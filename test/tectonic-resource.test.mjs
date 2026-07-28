import assert from "node:assert/strict";
import test from "node:test";

import {
  bundledTectonicPath,
  tectonicReleaseSpec,
} from "../scripts/tectonic-resource.mjs";

test("maps Windows x64 to the official MSVC archive", () => {
  assert.deepEqual(tectonicReleaseSpec("win32", "x64", "0.16.9"), {
    archive: "tectonic-0.16.9-x86_64-pc-windows-msvc.zip",
    binary: "tectonic.exe",
    platformDir: "win32-x64",
  });
});

test("maps native Linux architectures to runnable release archives", () => {
  assert.deepEqual(tectonicReleaseSpec("linux", "x64", "0.16.9"), {
    archive: "tectonic-0.16.9-x86_64-unknown-linux-gnu.tar.gz",
    binary: "tectonic",
    platformDir: "linux-x64",
  });
  assert.deepEqual(tectonicReleaseSpec("linux", "arm64", "0.16.9"), {
    archive: "tectonic-0.16.9-aarch64-unknown-linux-musl.tar.gz",
    binary: "tectonic",
    platformDir: "linux-arm64",
  });
});

test("rejects unsupported release targets", () => {
  assert.throws(
    () => tectonicReleaseSpec("win32", "arm64", "0.16.9"),
    /Unsupported Tectonic target: win32-arm64/,
  );
});

test("builds the packaged Tectonic destination from the target", () => {
  assert.equal(
    bundledTectonicPath("/repo", "win32", "x64"),
    "/repo/dist/app/bin/tectonic/win32-x64/tectonic.exe",
  );
});
