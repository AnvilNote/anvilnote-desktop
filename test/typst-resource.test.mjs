import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  expectedBundledTypstPath,
  resolveTypstBuildSource,
} from "../scripts/typst-resource.mjs";

function makeRepoRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "anvilnote-typst-test-"));
}

function writeExecutable(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, "#!/bin/sh\nexit 0\n");
  fs.chmodSync(file, 0o755);
}

test("resolveTypstBuildSource prefers bundled binary when staged", () => {
  const repoRoot = makeRepoRoot();
  const bundled = expectedBundledTypstPath(repoRoot);
  writeExecutable(bundled);

  const resolved = resolveTypstBuildSource(repoRoot, {});

  assert.equal(resolved.mode, "bundled");
  assert.equal(resolved.source, bundled);
});

test("resolveTypstBuildSource falls back to ANVILNOTE_TYPST_PATH", () => {
  const repoRoot = makeRepoRoot();
  const override = path.join(repoRoot, "custom", "typst");
  writeExecutable(override);

  const resolved = resolveTypstBuildSource(repoRoot, {
    ANVILNOTE_TYPST_PATH: override,
  });

  assert.equal(resolved.mode, "env");
  assert.equal(resolved.source, override);
});

test("resolveTypstBuildSource throws when no usable Typst exists", () => {
  const repoRoot = makeRepoRoot();

  assert.throws(
    () => resolveTypstBuildSource(repoRoot, { PATH: "" }),
    /Typst binary missing/,
  );
});
