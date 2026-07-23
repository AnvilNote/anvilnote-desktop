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
    version: packageJson.version,
  };
}

function verifyApp(appPath, options) {
  run(
    "codesign",
    ["--verify", "--deep", "--strict", "--verbose=2", appPath],
    options,
  );
}

function buildAndSignDmg({ appPath, dmgPath, env }) {
  fs.rmSync(dmgPath, { force: true });
  run(
    "pnpm",
    [
      "exec",
      "electron-builder",
      "--prepackaged",
      appPath,
      "--mac",
      "dmg",
      "--config",
      "electron-builder.config.cjs",
      "--publish",
      "never",
    ],
    { env },
  );

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
    if (target !== "dmg" && target !== "pkg") {
      throw new Error(`unsupported macOS container target: ${target}`);
    }
  }

  fs.mkdirSync(releaseDir, { recursive: true });
  const artifacts = artifactPaths(releaseDir, arch);
  verifyApp(appPath, { env });

  if (requested.has("dmg")) {
    buildAndSignDmg({ appPath, dmgPath: artifacts.dmg, env });
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

  return {
    dmg: requested.has("dmg") ? artifacts.dmg : undefined,
    pkg: requested.has("pkg") ? artifacts.pkg : undefined,
  };
}
