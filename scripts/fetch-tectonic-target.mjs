import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

import { config, ensureDir, fail, logStep } from "./load-env.mjs";
import {
  bundledTectonicPath,
  tectonicReleaseSpec,
} from "./tectonic-resource.mjs";

const VERSION = process.env.TECTONIC_VERSION ?? "0.16.9";
const platform = process.platform;
const arch = process.arch;
const spec = tectonicReleaseSpec(platform, arch, VERSION);
const c = config();
const root = path.join(c.appDir, "bin", "tectonic");
const dest = bundledTectonicPath(c.repoRoot, platform, arch, VERSION);

fs.rmSync(root, { recursive: true, force: true });
ensureDir(path.dirname(dest));

const override = process.env.ANVILNOTE_TECTONIC_PATH;
if (override) {
  if (!fs.existsSync(override)) fail(`ANVILNOTE_TECTONIC_PATH not found: ${override}`);
  fs.copyFileSync(override, dest);
} else {
  const tag = `tectonic@${VERSION}`;
  const url =
    `https://github.com/tectonic-typesetting/tectonic/releases/download/` +
    `${encodeURIComponent(tag)}/${spec.archive}`;
  logStep(`Fetching Tectonic ${VERSION} (${spec.platformDir})`);
  console.log(`  ${url}`);

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tectonic-"));
  const archive = path.join(tmp, spec.archive);
  try {
    const response = await fetch(url, { redirect: "follow" });
    if (!response.ok) {
      fail(`download failed: ${response.status} ${response.statusText} for ${url}`);
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(archive, bytes);
    console.log(`  downloaded ${(bytes.length / 1024 / 1024).toFixed(1)} MiB`);
    execFileSync("tar", ["-xf", archive, "-C", tmp], { stdio: "inherit" });
    const extracted = path.join(tmp, spec.binary);
    if (!fs.existsSync(extracted)) fail(`expected ${spec.binary} inside ${spec.archive}`);
    fs.copyFileSync(extracted, dest);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

if (platform !== "win32") fs.chmodSync(dest, 0o755);
execFileSync(dest, ["--version"], { stdio: "inherit" });
console.log(`  staged Tectonic -> ${dest}`);
