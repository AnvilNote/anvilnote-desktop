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

  const { dmgs, pkgs } = findMacArtifacts(releaseDir);
  if (dmgs.length === 0) throw new Error("no .dmg artifact was found");
  if (pkgs.length === 0) throw new Error("no .pkg artifact was found");

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
