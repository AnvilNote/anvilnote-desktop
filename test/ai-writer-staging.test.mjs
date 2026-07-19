import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { config } from "../scripts/load-env.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("desktop packaging resolves and builds AI Writer before consumers", () => {
  const c = config();
  assert.equal(path.basename(c.aiWriterDir), "anvilnote-ai-writer");

  const prepare = fs.readFileSync(path.join(root, "scripts/prepare-desktop.mjs"), "utf8");
  const buildWriter = prepare.indexOf('"build-ai-writer.mjs"');
  const buildWeb = prepare.indexOf('"build-web.mjs"');
  const buildApi = prepare.indexOf('"build-api.mjs"');
  const copyWeb = prepare.indexOf('"copy-web.mjs"');
  const copyWriter = prepare.indexOf('"copy-ai-writer.mjs"');
  const copyApi = prepare.indexOf('"copy-api.mjs"');

  assert.ok(buildWriter >= 0 && buildWriter < buildWeb && buildWriter < buildApi);
  assert.ok(copyWriter >= 0 && copyWriter < copyWeb && copyWriter < copyApi);
});

test("AI Writer staging copies only published runtime package files", () => {
  const script = fs.readFileSync(path.join(root, "scripts/copy-ai-writer.mjs"), "utf8");
  assert.match(script, /package\.json/);
  assert.match(script, /THIRD_PARTY_NOTICES\.md/);
  assert.doesNotMatch(script, /copyInto\([^\n]*["']src["']/);
  assert.doesNotMatch(script, /copyInto\([^\n]*["']tests?["']/);
});
