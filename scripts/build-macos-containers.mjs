import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const builderConfig = require("../electron-builder.config.cjs");
const { parseDeveloperIdApplicationIdentity } = require("./notarize-macos.cjs");
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(command, args, { env = process.env, capture = false } = {}) {
  console.log(`$ ${command} ${args.join(" ")}`);
  return execFileSync(command, args, {
    cwd: repoRoot,
    env,
    encoding: capture ? "utf8" : undefined,
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });
}

export function parseDeveloperIdInstallerIdentity(identityOutput) {
  const match = identityOutput.match(
    /"(?<identity>Developer ID Installer:[^"]+)"/u,
  );
  if (!match?.groups?.identity) {
    throw new Error(
      "Developer ID Installer identity with a private key was not found in the login Keychain",
    );
  }
  return match.groups.identity;
}

export function assertSignedPkgStatus(output) {
  if (
    !/Status:\s+signed by a developer certificate issued by Apple for distribution/u.test(
      output,
    )
  ) {
    throw new Error("PKG is not signed for Developer ID distribution");
  }
}

export function assertNoAppleDoubleFiles(root) {
  const pending = [root];
  while (pending.length > 0) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name.startsWith("._")) {
        throw new Error(`AppleDouble metadata file found in PKG payload: ${entry.name}`);
      }
      if (entry.isDirectory()) {
        pending.push(path.join(current, entry.name));
      }
    }
  }
}

function artifactPaths(releaseDir, arch) {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"),
  );
  const productName = builderConfig.productName || packageJson.name;
  const stem = `${productName}-${packageJson.version}-${arch}`;
  return {
    dmg: path.join(releaseDir, `${stem}.dmg`),
    pkg: path.join(releaseDir, `${stem}.pkg`),
    zip: path.join(releaseDir, `${stem}.zip`),
    version: packageJson.version,
  };
}

// electron-builder's own artifact-name template omits the arch entirely for
// whichever arch it treats as "default" — x64, since electron-builder.config
// sets no mac.defaultArch — even though we always pass an explicit --x64/
// --arm64 flag. So an x64 --prepackaged dmg/zip build actually lands at
// "<productName>-<version>.<ext>" (no "-x64" at all), not the "-x64"-suffixed
// path artifactPaths() above computes for our own naming scheme. Renaming
// after the fact (rather than fighting electron-builder's naming) keeps
// arm64 (whose own default-suffix path already happens to match ours) and
// x64 both correct without depending on that internal default-arch quirk.
function electronBuilderNativePath(releaseDir, arch, ext) {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"),
  );
  const productName = builderConfig.productName || packageJson.name;
  const suffix = arch === "x64" ? "" : `-${arch}`;
  // electron-builder's "mac zip" target uses a distinct default artifactName
  // template from every other mac target (the electron-updater feed
  // convention: "<name>-<version>-mac[-<arch>].zip"), not the plain
  // "<name>-<version>[-<arch>].<ext>" every other target (dmg, pkg) uses.
  const stem = ext === "zip" ? `${productName}-${packageJson.version}-mac${suffix}` : `${productName}-${packageJson.version}${suffix}`;
  return path.join(releaseDir, `${stem}.${ext}`);
}

function normalizeArtifactName(nativePath, wantedPath) {
  if (nativePath === wantedPath) return;
  if (!fs.existsSync(nativePath)) {
    throw new Error(`expected electron-builder to produce ${nativePath}, but it doesn't exist`);
  }
  fs.renameSync(nativePath, wantedPath);
  const blockmap = `${nativePath}.blockmap`;
  if (fs.existsSync(blockmap)) fs.renameSync(blockmap, `${wantedPath}.blockmap`);
}

function verifyApp(appPath, options) {
  run(
    "codesign",
    ["--verify", "--deep", "--strict", "--verbose=2", appPath],
    options,
  );
}

function buildAndSignDmg({ appPath, dmgPath, env, arch }) {
  const releaseDir = path.dirname(dmgPath);
  const nativePath = electronBuilderNativePath(releaseDir, arch, "dmg");
  fs.rmSync(dmgPath, { force: true });
  fs.rmSync(nativePath, { force: true });
  run(
    "pnpm",
    [
      "exec",
      "electron-builder",
      "--prepackaged",
      appPath,
      "--mac",
      "dmg",
      arch === "arm64" ? "--arm64" : "--x64",
      "--config",
      "electron-builder.config.cjs",
      "--publish",
      "never",
    ],
    { env },
  );
  normalizeArtifactName(nativePath, dmgPath);

  const identities = run(
    "security",
    ["find-identity", "-v", "-p", "codesigning"],
    { env, capture: true },
  );
  const identity = parseDeveloperIdApplicationIdentity(identities);
  run("codesign", ["--sign", identity, "--force", "--timestamp", dmgPath], {
    env,
  });
  run("codesign", ["--verify", "--verbose=2", dmgPath], { env });
  run("hdiutil", ["verify", dmgPath], { env });
}

// A zip archive isn't a codesigned container the way dmg/pkg are — Gatekeeper
// only ever checks the .app once it's extracted, and that .app is already
// correctly signed by finalizeMacSignature before this runs. So the only
// thing worth verifying here is that zipping (via electron-builder's own
// --prepackaged path, which just archives the given tree without touching
// it) didn't silently corrupt the signature already baked into appPath.
function buildZip({ appPath, zipPath, env, arch }) {
  const releaseDir = path.dirname(zipPath);
  const nativePath = electronBuilderNativePath(releaseDir, arch, "zip");
  fs.rmSync(zipPath, { force: true });
  fs.rmSync(nativePath, { force: true });
  run(
    "pnpm",
    [
      "exec",
      "electron-builder",
      "--prepackaged",
      appPath,
      "--mac",
      "zip",
      arch === "arm64" ? "--arm64" : "--x64",
      "--config",
      "electron-builder.config.cjs",
      "--publish",
      "never",
    ],
    { env },
  );
  normalizeArtifactName(nativePath, zipPath);
}

function buildSignedPkg({ appPath, pkgPath, version, env }) {
  const stagingRoot = fs.mkdtempSync(path.join(os.tmpdir(), "anvilnote-pkg-"));
  const stagedApp = path.join(stagingRoot, path.basename(appPath));

  try {
    // Do not let pkgbuild serialize com.apple.provenance or resource forks as
    // AppleDouble `._*` files. Those files are not part of the signed bundle
    // seal and would make the installed App fail codesign verification.
    run(
      "ditto",
      [
        "--norsrc",
        "--noextattr",
        "--noqtn",
        "--noacl",
        appPath,
        stagedApp,
      ],
      { env },
    );
    assertNoAppleDoubleFiles(stagedApp);
    verifyApp(stagedApp, { env });

    const identities = run("security", ["find-identity", "-v"], {
      env,
      capture: true,
    });
    const identity = parseDeveloperIdInstallerIdentity(identities);

    fs.rmSync(pkgPath, { force: true });
    run(
      "pkgbuild",
      [
        "--component",
        stagedApp,
        "--install-location",
        builderConfig.pkg?.installLocation || "/Applications",
        "--identifier",
        builderConfig.appId,
        "--version",
        version,
        "--sign",
        identity,
        pkgPath,
      ],
      { env },
    );

    const signature = run("pkgutil", ["--check-signature", pkgPath], {
      env,
      capture: true,
    });
    console.log(signature.trim());
    assertSignedPkgStatus(signature);
  } finally {
    fs.rmSync(stagingRoot, { recursive: true, force: true });
  }
}

export function buildMacContainers({
  appPath,
  targets,
  env = process.env,
  releaseDir = path.join(repoRoot, "release"),
  arch = process.arch,
}) {
  if (process.platform !== "darwin") {
    throw new Error("macOS containers can only be built on macOS");
  }

  const requested = new Set(targets);
  for (const target of requested) {
    if (target !== "dmg" && target !== "pkg" && target !== "zip") {
      throw new Error(`unsupported macOS container target: ${target}`);
    }
  }

  fs.mkdirSync(releaseDir, { recursive: true });
  const artifacts = artifactPaths(releaseDir, arch);
  verifyApp(appPath, { env });

  if (requested.has("dmg")) {
    buildAndSignDmg({ appPath, dmgPath: artifacts.dmg, env, arch });
    verifyApp(appPath, { env });
  }
  if (requested.has("pkg")) {
    buildSignedPkg({
      appPath,
      pkgPath: artifacts.pkg,
      version: artifacts.version,
      env,
    });
    verifyApp(appPath, { env });
  }
  if (requested.has("zip")) {
    buildZip({ appPath, zipPath: artifacts.zip, env, arch });
    verifyApp(appPath, { env });
  }

  return {
    dmg: requested.has("dmg") ? artifacts.dmg : undefined,
    pkg: requested.has("pkg") ? artifacts.pkg : undefined,
    zip: requested.has("zip") ? artifacts.zip : undefined,
  };
}
