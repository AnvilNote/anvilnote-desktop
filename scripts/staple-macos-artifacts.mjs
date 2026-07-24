import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { findMacArtifacts } from "./macos-artifacts.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(command, args) {
  console.log(`$ ${command} ${args.join(" ")}`);
  execFileSync(command, args, { stdio: "inherit" });
}

export function notarizeAndStapleContainers({
  releaseDir = path.join(repoRoot, "release"),
  keychainProfile = process.env.ANVILNOTE_NOTARY_PROFILE?.trim() ||
    "AnvilNote Notarization",
} = {}) {
  if (process.platform !== "darwin") {
    throw new Error("macOS notarization can only run on macOS");
  }

  // zip is deliberately excluded here: it's a plain archive of the already
  // notarized-and-stapled .app (built by buildZip in
  // build-macos-containers.mjs), not its own signed container the way dmg/pkg
  // are — Gatekeeper checks the .app's own staple once extracted, so zip
  // itself has nothing to submit to notarytool or staple.
  const { dmgs, pkgs } = findMacArtifacts(releaseDir);
  if (dmgs.length === 0 && pkgs.length === 0) {
    throw new Error("no .dmg or .pkg artifact was found to notarize");
  }

  for (const artifact of [...dmgs, ...pkgs]) {
    run("xcrun", [
      "notarytool",
      "submit",
      artifact,
      "--keychain-profile",
      keychainProfile,
      "--wait",
    ]);
    run("xcrun", ["stapler", "staple", artifact]);
    run("xcrun", ["stapler", "validate", artifact]);
  }
}

const isMain =
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  try {
    notarizeAndStapleContainers();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
