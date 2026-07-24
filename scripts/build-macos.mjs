import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { buildMacContainers } from "./build-macos-containers.mjs";

const require = createRequire(import.meta.url);
const { finalizeMacSignature } = require("./notarize-macos.cjs");
const builderConfig = require("../electron-builder.config.cjs");
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appPath = path.join(repoRoot, "release", "mac-arm64", "AnvilNote.app");

const targetMap = {
  dir: [],
  dmg: ["dmg"],
  pkg: ["pkg"],
  zip: ["zip"],
  all: ["dmg", "pkg", "zip"],
};

// electron-builder normally embeds this itself (an afterPack hook, gated on
// that pack invocation's own target list already including "dmg"/"zip") so
// the running app knows which GitHub repo to poll for updates. Our two-phase
// build calls `--mac dir` with NO installer target at all — that gate never
// fires, so electron-builder never writes the file and every
// autoUpdater.checkForUpdates() throws ENOENT, forever, regardless of what
// we build afterward. Writing it ourselves, from the same `publish` config
// block electron-builder would have used, sidesteps that gate entirely. Must
// happen before finalizeMacSignature — it re-signs the whole bundle, so this
// file has to already be in place to be covered by that signature. See the
// Makefile's dist-mac-release target for the full writeup (also covers the
// separate "zip" requirement for the actual update *download* step).
function writeAppUpdateYml() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  const { provider, owner, repo } = builderConfig.publish;
  const updaterCacheDirName = `${packageJson.name.toLowerCase()}-updater`;
  const yml = `provider: ${provider}\nowner: ${owner}\nrepo: ${repo}\nupdaterCacheDirName: ${updaterCacheDirName}\n`;
  fs.writeFileSync(path.join(appPath, "Contents", "Resources", "app-update.yml"), yml);
}

function run(command, args, env = process.env) {
  console.log(`$ ${command} ${args.join(" ")}`);
  execFileSync(command, args, {
    cwd: repoRoot,
    env,
    stdio: "inherit",
  });
}

const mode = process.argv[2];
const artifactTargets = targetMap[mode];
if (!artifactTargets) {
  throw new Error("usage: node scripts/build-macos.mjs <dir|dmg|pkg|all>");
}
if (process.platform !== "darwin") {
  throw new Error("macOS packages can only be built on macOS");
}

// Build the app as a directory first. The electron-builder signer currently
// selects the certificate by SHA-1 hash; on the release Mac that outer bundle
// signature becomes invalid after electron-builder exits. The explicit
// post-process below re-seals the completed bundle by certificate name at the
// only boundary where electron-builder can no longer mutate it.
const builderEnv = {
  ...process.env,
  ANVILNOTE_MAC_RELEASE: "0",
};
run("pnpm", ["prepare:desktop"], builderEnv);
run("pnpm", ["build:main"], builderEnv);
run(
  "pnpm",
  [
    "exec",
    "electron-builder",
    "--mac",
    "dir",
    "--config",
    "electron-builder.config.cjs",
    "--publish",
    "never",
  ],
  builderEnv,
);
writeAppUpdateYml();
await finalizeMacSignature(appPath);

// Containers are created only after the App has its final valid signature.
// DMG creation remains delegated to electron-builder, then the image is
// explicitly signed. PKG creation uses a metadata-free staging copy so
// pkgbuild cannot turn extended attributes into seal-breaking `._*` files.
if (artifactTargets.length > 0) {
  buildMacContainers({
    appPath,
    targets: artifactTargets,
    env: builderEnv,
  });
}
