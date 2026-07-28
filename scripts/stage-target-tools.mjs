// Replace only target-dependent portable tools in an already assembled
// runtime. Used by Linux Docker builds after the host prepared shared assets.

import fs from "node:fs";
import path from "node:path";

import { config, ensureDir, logStep } from "./load-env.mjs";
import { resolvePandocBuildSource } from "./pandoc-resource.mjs";
import { resolveTypstBuildSource } from "./typst-resource.mjs";

const c = config();
const platform = process.env.ANVILNOTE_BUILD_PLATFORM ?? process.platform;
const arch = process.env.ANVILNOTE_BUILD_ARCH ?? process.arch;

function stage(name, resolved) {
  const root = path.join(c.appDir, "bin", name);
  const destination = path.join(
    root,
    path.basename(path.dirname(resolved.bundled)),
    path.basename(resolved.bundled),
  );
  fs.rmSync(root, { recursive: true, force: true });
  ensureDir(path.dirname(destination));
  fs.copyFileSync(resolved.source, destination);
  if (platform !== "win32") fs.chmodSync(destination, 0o755);
  console.log(`  staged ${name} (${platform}-${arch}) -> ${destination}`);
}

logStep(`Staging portable tools for ${platform}-${arch}`);
stage("typst", resolveTypstBuildSource(c.repoRoot));
stage("pandoc", resolvePandocBuildSource(c.repoRoot));
