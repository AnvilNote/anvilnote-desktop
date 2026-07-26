import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { config } from "../scripts/load-env.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stagedApiRoot = path.join(root, "dist", "app", "api");
const stagedAiWriterRoot = path.join(
  stagedApiRoot,
  "node_modules",
  "@anvilnote",
  "ai-writer",
);
const requireFromStagedApi = createRequire(path.join(stagedApiRoot, "package.json"));

async function assetExists(relativePath) {
  try {
    await fs.promises.access(path.join(stagedAiWriterRoot, "dist", relativePath));
    return true;
  } catch {
    return false;
  }
}

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

test("staged API resolves the published AI Writer edit runtime", async () => {
  const stagedAiWriter = requireFromStagedApi("@anvilnote/ai-writer");

  assert.equal(typeof stagedAiWriter.parseDocumentV2, "function");
  assert.equal(typeof stagedAiWriter.applyEditOperations, "function");
  assert.equal(stagedAiWriter.AI_NODE_CAPABILITIES.image, "protected-image");
  assert.ok(await assetExists("prompts/common/edit-structures-v2.md"));

  assert.equal(fs.existsSync(path.join(stagedAiWriterRoot, "src")), false);
  assert.equal(fs.existsSync(path.join(stagedAiWriterRoot, "test")), false);
  assert.equal(fs.existsSync(path.join(stagedAiWriterRoot, "tests")), false);
});
