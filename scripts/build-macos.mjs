import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { buildMacContainers } from "./build-macos-containers.mjs";

const require = createRequire(import.meta.url);
const { finalizeMacSignature } = require("./notarize-macos.cjs");
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appPath = path.join(repoRoot, "release", "mac-arm64", "AnvilNote.app");

const targetMap = {
  dir: [],
  dmg: ["dmg"],
  pkg: ["pkg"],
  all: ["dmg", "pkg"],
};

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
