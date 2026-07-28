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
  assert.ok(
    linuxAssembly.indexOf("pnpm prepare:desktop") <
      linuxAssembly.indexOf("pnpm fetch:tectonic:target"),
  );

  const windowsScript = packageJson.scripts["dist:win"];
  assert.ok(
    windowsScript.indexOf("pnpm fetch:typst:windows") <
      windowsScript.indexOf("pnpm prepare:desktop"),
  );
  assert.ok(
    windowsScript.indexOf("pnpm prepare:desktop") <
      windowsScript.indexOf("pnpm fetch:tectonic:target"),
  );

  for (const scriptName of [
    "fetch-typst-linux.mjs",
    "fetch-typst-windows.mjs",
    "fetch-pandoc-linux.mjs",
    "fetch-pandoc-windows.mjs",
  ]) {
    const script = fs.readFileSync(path.join(repoRoot, "scripts", scriptName), "utf8");
    assert.match(script, /c\.repoRoot,\s*"resources",\s*"bin"/u);
    assert.doesNotMatch(script, /path\.join\(c\.appDir,\s*"bin"/u);
  }
});

test("Makefile prevents cross-platform sidecars and exposes one native release command", () => {
  const makefile = fs.readFileSync(path.join(repoRoot, "Makefile"), "utf8");

  assert.match(
    makefile,
    /^dist-win:.*\n\tnode scripts\/assert-native-target\.mjs win32 x64$/mu,
  );
  assert.match(
    makefile,
    /^dist-linux-x64:.*\n\tnode scripts\/assert-native-target\.mjs linux x64$/mu,
  );
  assert.match(
    makefile,
    /^dist-linux-arm64:.*\n\tnode scripts\/assert-native-target\.mjs linux arm64$/mu,
  );
  assert.match(makefile, /^release-native:/mu);
  assert.match(
    makefile,
    /gh workflow run release-native-platforms\.yml -f tag=\$\(TAG\)/u,
  );
});
