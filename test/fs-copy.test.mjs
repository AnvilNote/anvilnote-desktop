import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { copyDirectoryResolved } from "../scripts/fs-copy.mjs";

test("copyDirectoryResolved materializes symlink targets instead of preserving links", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "anvilnote-fs-copy-"));
  const source = path.join(root, "source");
  const targetDir = path.join(source, "real");
  const dest = path.join(root, "dest");

  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, "value.txt"), "hello");
  fs.symlinkSync(path.join(targetDir, "value.txt"), path.join(source, "linked.txt"));

  copyDirectoryResolved(source, dest);

  const copiedLink = path.join(dest, "linked.txt");
  assert.equal(fs.lstatSync(copiedLink).isSymbolicLink(), false);
  assert.equal(fs.readFileSync(copiedLink, "utf8"), "hello");
});
