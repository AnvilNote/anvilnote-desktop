import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

test("native release builds dependencies and fetches target tools before assembly", () => {
  const workflow = fs.readFileSync(
    path.join(repoRoot, ".github/workflows/release-native-platforms.yml"),
    "utf8",
  );
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"),
  );

  assert.equal(
    workflow.match(/^\s+lfs: true$/gmu)?.length,
    2,
    "both renderer checkouts must fetch Git LFS fonts",
  );

  for (const job of workflow.split("      - name: Install Node dependencies").slice(0, 2)) {
    assert.match(job, /- name: Build AI Writer dependency/u);
  }

  const linuxAssembly = workflow.match(
    /- name: Assemble native Linux runtime[\s\S]*?pnpm build:main/u,
  )?.[0];
  assert.ok(linuxAssembly);
  assert.ok(
    linuxAssembly.indexOf("pnpm fetch:typst:linux") <
      linuxAssembly.indexOf("pnpm prepare:desktop"),
  );

  const windowsScript = packageJson.scripts["dist:win"];
  assert.ok(
    windowsScript.indexOf("pnpm fetch:typst:windows") <
      windowsScript.indexOf("pnpm prepare:desktop"),
  );
});
