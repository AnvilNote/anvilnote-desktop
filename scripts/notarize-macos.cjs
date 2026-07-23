"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execFile, execFileSync } = require("node:child_process");
const { promisify } = require("node:util");
const { notarize } = require("@electron/notarize");

const execFileAsync = promisify(execFile);
const DEFAULT_PROFILE = "AnvilNote Notarization";
const ENTITLEMENTS_PATH = path.resolve(
  __dirname,
  "..",
  "build",
  "entitlements.mac.plist",
);

function execFileSynchronous(command, args) {
  return {
    stdout: execFileSync(command, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }),
    stderr: "",
  };
}

function isReleaseNotarizationEnabled(env = process.env) {
  return env.ANVILNOTE_MAC_RELEASE === "1";
}

function resolveProfile(env = process.env) {
  return env.ANVILNOTE_NOTARY_PROFILE?.trim() || DEFAULT_PROFILE;
}

function parseDeveloperIdApplicationIdentity(output) {
  const match = output.match(
    /^\s*\d+\)\s+[A-F0-9]{40}\s+"(Developer ID Application:[^"]+)"\s*$/mu,
  );
  if (!match) {
    throw new Error(
      "Developer ID Application identity with a private key was not found in the login Keychain",
    );
  }
  return match[1];
}

async function finalizeMacSignature(
  appPath,
  { run = execFileSynchronous } = {},
) {
  const { stdout } = await run("security", [
    "find-identity",
    "-v",
    "-p",
    "codesigning",
  ]);
  const identity = parseDeveloperIdApplicationIdentity(stdout);

  // electron-builder/@electron/osx-sign currently passes the identity SHA-1
  // hash to codesign. On the maintained release Mac that signature verifies
  // inside the signer process but becomes invalid immediately afterwards.
  // Re-sealing only the outer bundle with the same certificate selected by
  // its Keychain name produces a stable signature; all nested code has
  // already been signed bottom-up by electron-builder.
  await run("codesign", [
    "--sign",
    identity,
    "--force",
    "--timestamp",
    "--options",
    "runtime",
    "--entitlements",
    ENTITLEMENTS_PATH,
    appPath,
  ]);
  await run("codesign", [
    "--verify",
    "--deep",
    "--strict",
    "--verbose=2",
    appPath,
  ]);
}

async function notarizeAndStapleMacApp(
  appPath,
  {
    keychainProfile = resolveProfile(),
    notarizeApp = notarize,
    run = execFileAsync,
  } = {},
) {
  await notarizeApp({ appPath, keychainProfile });
  await run("xcrun", ["stapler", "staple", appPath]);
  await run("xcrun", ["stapler", "validate", appPath]);
}

async function notarizeMac(context) {
  if (process.platform !== "darwin") {
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(context.appOutDir, `${appName}.app`);
  if (!fs.existsSync(appPath)) {
    throw new Error(`signed app was not found after packaging: ${appPath}`);
  }

  await finalizeMacSignature(appPath);

  if (!isReleaseNotarizationEnabled()) {
    return;
  }

  const keychainProfile = resolveProfile();
  console.log(`Notarizing ${appName}.app with Keychain profile "${keychainProfile}"`);
  await notarizeAndStapleMacApp(appPath, { keychainProfile });
}

module.exports = notarizeMac;
module.exports.isReleaseNotarizationEnabled = isReleaseNotarizationEnabled;
module.exports.resolveProfile = resolveProfile;
module.exports.parseDeveloperIdApplicationIdentity =
  parseDeveloperIdApplicationIdentity;
module.exports.finalizeMacSignature = finalizeMacSignature;
module.exports.notarizeAndStapleMacApp = notarizeAndStapleMacApp;
