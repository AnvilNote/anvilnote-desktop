import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  assertNoAppleDoubleFiles,
  assertSignedPkgStatus,
} from "./build-macos-containers.mjs";
import {
  findMacArtifacts,
  requireMacArtifacts,
} from "./macos-artifacts.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(command, args) {
  console.log(`$ ${command} ${args.join(" ")}`);
  execFileSync(command, args, { stdio: "inherit" });
}

function capture(command, args) {
  console.log(`$ ${command} ${args.join(" ")}`);
  return execFileSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

export function verifyMacArtifacts(
  releaseDir = path.join(repoRoot, "release"),
) {
  if (process.platform !== "darwin") {
    throw new Error("macOS artifact verification can only run on macOS");
  }

  const found = findMacArtifacts(releaseDir);
  requireMacArtifacts(found);

  for (const app of found.apps) {
    run("codesign", ["--verify", "--deep", "--strict", "--verbose=2", app]);
    run("spctl", ["--assess", "--type", "execute", "--verbose=4", app]);
    run("xcrun", ["stapler", "validate", app]);
  }

  for (const dmg of found.dmgs) {
    run("codesign", ["--verify", "--verbose=2", dmg]);
    run("spctl", [
      "--assess",
      "--type",
      "open",
      "--context",
      "context:primary-signature",
      "--verbose=4",
      dmg,
    ]);
    run("xcrun", ["stapler", "validate", dmg]);
    run("shasum", ["-a", "256", dmg]);
  }

  for (const pkg of found.pkgs) {
    const signature = capture("pkgutil", ["--check-signature", pkg]);
    console.log(signature.trim());
    assertSignedPkgStatus(signature);

    const tempRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "anvilnote-pkg-verify-"),
    );
    const expanded = path.join(tempRoot, "expanded");
    try {
      run("pkgutil", ["--expand-full", pkg, expanded]);
      const payloadApp = path.join(expanded, "Payload", "AnvilNote.app");
      run("codesign", [
        "--verify",
        "--deep",
        "--strict",
        "--verbose=2",
        payloadApp,
      ]);
      assertNoAppleDoubleFiles(payloadApp);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }

    run("spctl", ["--assess", "--type", "install", "--verbose=4", pkg]);
    run("xcrun", ["stapler", "validate", pkg]);
    run("shasum", ["-a", "256", pkg]);
  }
}

const isMain =
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  try {
    verifyMacArtifacts();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
