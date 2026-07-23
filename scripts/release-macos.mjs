import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { buildMacContainers } from "./build-macos-containers.mjs";

const require = createRequire(import.meta.url);
const { notarizeAndStapleMacApp } = require("./notarize-macos.cjs");
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appPath = path.join(repoRoot, "release", "mac-arm64", "AnvilNote.app");
const keychainProfile =
  process.env.ANVILNOTE_NOTARY_PROFILE?.trim() || "AnvilNote Notarization";

function capture(command, args) {
  return execFileSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function run(command, args, env = process.env) {
  console.log(`$ ${command} ${args.join(" ")}`);
  execFileSync(command, args, {
    cwd: repoRoot,
    env,
    stdio: "inherit",
  });
}

function assertReleasePreconditions() {
  if (process.platform !== "darwin") {
    throw new Error("macOS release builds can only run on macOS");
  }

  const branch = capture("git", ["branch", "--show-current"]);
  if (branch !== "main") {
    throw new Error(`macOS releases must be built from main, not ${branch || "detached HEAD"}`);
  }

  if (capture("git", ["status", "--porcelain"]) !== "") {
    throw new Error("macOS releases require a clean working tree");
  }

  const packageJson = JSON.parse(
    fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"),
  );
  if (!/^\d+\.\d+\.\d+$/u.test(packageJson.version)) {
    throw new Error(`package version is not release-ready: ${packageJson.version}`);
  }

  // Do not filter to the "codesigning" policy here: macOS reports Developer
  // ID Installer as a valid identity only in the unfiltered identity list.
  const identities = capture("security", ["find-identity", "-v"]);
  if (!identities.includes("Developer ID Application:")) {
    throw new Error("Developer ID Application identity is missing from the Keychain");
  }
  if (!identities.includes("Developer ID Installer:")) {
    throw new Error("Developer ID Installer identity is missing from the Keychain");
  }

  execFileSync(
    "xcrun",
    [
      "notarytool",
      "history",
      "--keychain-profile",
      keychainProfile,
      "--output-format",
      "json",
    ],
    { cwd: repoRoot, stdio: ["ignore", "ignore", "inherit"] },
  );
}

function releaseEnvironment() {
  const env = {
    ...process.env,
    ANVILNOTE_MAC_RELEASE: "1",
    ANVILNOTE_NOTARY_PROFILE: keychainProfile,
    CSC_IDENTITY_AUTO_DISCOVERY: "true",
  };

  // A global qualifier for the Application identity also filters the PKG
  // lookup and prevents electron-builder from finding Developer ID Installer.
  delete env.CSC_NAME;
  delete env.CSC_LINK;
  delete env.CSC_KEY_PASSWORD;
  return env;
}

try {
  assertReleasePreconditions();
  const env = releaseEnvironment();

  // Build and finalise the signed app first. The app must be notarized and
  // stapled before the DMG and metadata-free PKG staging pipelines read it.
  run(process.execPath, ["scripts/build-macos.mjs", "dir"], env);
  await notarizeAndStapleMacApp(appPath, { keychainProfile });

  const packagingEnv = { ...env, ANVILNOTE_MAC_RELEASE: "0" };
  buildMacContainers({
    appPath,
    targets: ["dmg", "pkg"],
    env: packagingEnv,
  });
  run(process.execPath, ["scripts/staple-macos-artifacts.mjs"], env);
  run(process.execPath, ["scripts/verify-macos-artifacts.mjs"], env);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
