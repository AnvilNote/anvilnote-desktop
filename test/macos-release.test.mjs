import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

test("macOS release configuration requires signed hardened builds", () => {
  const config = require(path.join(repoRoot, "electron-builder.config.cjs"));

  // Scoped to mac only (not top-level) so an unsigned Windows build doesn't
  // fail-close — see win.target's comment in electron-builder.config.cjs.
  assert.equal(config.mac.forceCodeSigning, true);
  assert.notEqual(config.mac.identity, null);
  assert.equal(config.mac.hardenedRuntime, true);
  assert.equal(config.mac.gatekeeperAssess, false);
  assert.equal(config.mac.entitlements, "build/entitlements.mac.plist");
  assert.equal(config.mac.entitlementsInherit, "build/entitlements.mac.inherit.plist");
  assert.equal(config.afterSign, undefined);
});

test("macOS signing skips non-code binary resources but keeps native code", () => {
  const config = require(path.join(repoRoot, "electron-builder.config.cjs"));
  const filters = config.mac.signIgnore.map((pattern) => new RegExp(pattern));
  const isIgnored = (file) => filters.some((filter) => filter.test(file));

  assert.equal(isIgnored("/Contents/Resources/web/fonts/KaTeX_Main-Bold.ttf"), true);
  assert.equal(isIgnored("/Contents/Resources/api/pdfjs/UniKS-UTF16-H.bcmap"), true);
  assert.equal(isIgnored("/Contents/Resources/web/node_modules/jszip/.jekyll-metadata"), true);

  assert.equal(isIgnored("/Contents/Resources/web/native/watcher.node"), false);
  assert.equal(isIgnored("/Contents/Resources/web/native/libvips.dylib"), false);
  assert.equal(
    isIgnored("/Contents/Resources/bin/pandoc/darwin-arm64/pandoc"),
    false,
  );
  assert.equal(
    isIgnored("/Contents/Resources/bin/typst/darwin-arm64/typst"),
    false,
  );
  assert.equal(isIgnored("/Contents/Frameworks/Electron Framework.framework"), false);
});

test("macOS entitlements are explicit and available to the packager", () => {
  for (const name of ["entitlements.mac.plist", "entitlements.mac.inherit.plist"]) {
    const file = path.join(repoRoot, "build", name);
    assert.equal(fs.existsSync(file), true, `${name} must exist`);
    const source = fs.readFileSync(file, "utf8");
    assert.match(source, /com\.apple\.security\.cs\.allow-jit/u);
    assert.match(source, /com\.apple\.security\.cs\.allow-unsigned-executable-memory/u);
  }
});

test("release command is explicit and keeps ordinary packaging offline", () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"),
  );

  assert.equal(packageJson.author.email, "team@anvilnote.org");
  assert.equal(packageJson.scripts.pack, "node scripts/build-macos.mjs dir");
  assert.equal(packageJson.scripts["dist:dmg"], "node scripts/build-macos.mjs dmg");
  assert.equal(packageJson.scripts["dist:pkg"], "node scripts/build-macos.mjs pkg");
  assert.equal(packageJson.scripts["dist:mac"], "node scripts/build-macos.mjs all");
  assert.equal(packageJson.scripts["dist:mac:release"], "node scripts/release-macos.mjs");
  assert.equal(packageJson.scripts["verify:mac"], "node scripts/verify-macos-artifacts.mjs");
  assert.doesNotMatch(packageJson.scripts["dist:mac"], /notar/u);
  assert.equal(packageJson.devDependencies["@electron/notarize"], "^2.5.0");
  const workspaceConfig = fs.readFileSync(
    path.join(repoRoot, "pnpm-workspace.yaml"),
    "utf8",
  );
  assert.match(workspaceConfig, /patchedDependencies:/u);
  assert.match(
    workspaceConfig,
    /"@electron\/osx-sign@1\.3\.1": patches\/@electron__osx-sign@1\.3\.1\.patch/u,
  );

  const osxSignPatch = fs.readFileSync(
    path.join(repoRoot, "patches", "@electron__osx-sign@1.3.1.patch"),
    "utf8",
  );
  assert.match(osxSignPatch, /^\+\s*for \(const child of children\)/mu);
  assert.match(osxSignPatch, /^-\s*return await Promise\.all\(children\.map/mu);
});

test("release scripts exist and never embed Apple credential identifiers", () => {
  const files = [
    "scripts/notarize-macos.cjs",
    "scripts/release-macos.mjs",
    "scripts/staple-macos-artifacts.mjs",
    "scripts/verify-macos-artifacts.mjs",
  ];

  for (const relative of files) {
    const file = path.join(repoRoot, relative);
    assert.equal(fs.existsSync(file), true, `${relative} must exist`);
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(source, /AuthKey_[A-Z0-9]+\.p8/u);
    assert.doesNotMatch(source, /APPLE_API_KEY_ID\s*=/u);
    assert.doesNotMatch(source, /APPLE_API_ISSUER\s*=/u);
  }
});

test("Linux package metadata uses the team maintainer address", () => {
  const config = require(path.join(repoRoot, "electron-builder.config.cjs"));
  assert.equal(config.linux.maintainer, "AnvilNote <team@anvilnote.org>");
});

test("all-platform publishing uses the notarized macOS release command", () => {
  const script = fs.readFileSync(
    path.join(repoRoot, "scripts", "release-all.sh"),
    "utf8",
  );
  assert.match(script, /^pnpm dist:mac:release$/mu);
  assert.doesNotMatch(script, /^pnpm dist:mac$/mu);
});

test("release preflight checks every Keychain identity including Installer", () => {
  const script = fs.readFileSync(
    path.join(repoRoot, "scripts", "release-macos.mjs"),
    "utf8",
  );
  assert.match(script, /capture\("security", \[\s*"find-identity",\s*"-v",?\s*\]\)/u);
  assert.doesNotMatch(script, /"find-identity",\s*"-v",\s*"-p",\s*"codesigning"/u);
});

test("post-pack finalizer reseals the outer app with the Developer ID certificate name", async () => {
  const hook = require(path.join(repoRoot, "scripts", "notarize-macos.cjs"));
  const identityOutput = [
    '  1) ABCDEF0123456789ABCDEF0123456789ABCDEF01 "Developer ID Application: Example Maintainer (TEAM123456)"',
    "     1 valid identities found",
  ].join("\n");

  assert.equal(
    hook.parseDeveloperIdApplicationIdentity(identityOutput),
    "Developer ID Application: Example Maintainer (TEAM123456)",
  );

  const calls = [];
  const run = async (command, args) => {
    calls.push([command, args]);
    if (command === "security") {
      return { stdout: identityOutput, stderr: "" };
    }
    return { stdout: "", stderr: "" };
  };

  await hook.finalizeMacSignature("/tmp/AnvilNote.app", { run });

  assert.deepEqual(calls[0], [
    "security",
    ["find-identity", "-v", "-p", "codesigning"],
  ]);
  assert.deepEqual(calls[1], [
    "codesign",
    [
      "--sign",
      "Developer ID Application: Example Maintainer (TEAM123456)",
      "--force",
      "--timestamp",
      "--options",
      "runtime",
      "--entitlements",
      path.join(repoRoot, "build", "entitlements.mac.plist"),
      "/tmp/AnvilNote.app",
    ],
  ]);
  assert.deepEqual(calls[2], [
    "codesign",
    ["--verify", "--deep", "--strict", "--verbose=2", "/tmp/AnvilNote.app"],
  ]);
});

test("macOS packaging is two-phase and explicitly disables publishing", () => {
  const source = fs.readFileSync(
    path.join(repoRoot, "scripts", "build-macos.mjs"),
    "utf8",
  );

  assert.match(source, /finalizeMacSignature\(appPath\)/u);
  assert.match(source, /buildMacContainers\(/u);
  assert.match(source, /"--publish",\s*"never"/u);
  assert.doesNotMatch(source, /\.\.\.artifactTargets/u);
});

test("macOS container builder strips PKG metadata and signs each container explicitly", async () => {
  const modulePath = path.join(repoRoot, "scripts", "build-macos-containers.mjs");
  assert.equal(
    fs.existsSync(modulePath),
    true,
    "scripts/build-macos-containers.mjs must exist",
  );

  const source = fs.readFileSync(modulePath, "utf8");
  assert.match(
    source,
    /"ditto",\s*\[\s*"--norsrc",\s*"--noextattr",\s*"--noqtn",\s*"--noacl"/u,
  );
  assert.match(source, /Developer ID Installer:/u);
  assert.match(source, /"pkgbuild"/u);
  assert.match(source, /"--component"/u);
  assert.match(source, /parseDeveloperIdApplicationIdentity/u);
  assert.match(source, /"codesign"/u);
  assert.match(source, /signed by a developer certificate issued by Apple/u);

  const containers = await import(`${pathToFileURL(modulePath).href}?test=${Date.now()}`);
  const identityOutput = [
    '  1) ABCDEF "Developer ID Installer: Example Maintainer (TEAM123456)"',
    "     1 valid identities found",
  ].join("\n");

  assert.equal(
    containers.parseDeveloperIdInstallerIdentity(identityOutput),
    "Developer ID Installer: Example Maintainer (TEAM123456)",
  );
  assert.throws(
    () => containers.assertSignedPkgStatus("Status: invalid signature"),
    /not signed for Developer ID distribution/u,
  );
  assert.doesNotThrow(() =>
    containers.assertSignedPkgStatus(
      "Status: signed by a developer certificate issued by Apple for distribution",
    ),
  );
});

test("artifact verification parses pkgutil status instead of trusting its exit code", () => {
  const source = fs.readFileSync(
    path.join(repoRoot, "scripts", "verify-macos-artifacts.mjs"),
    "utf8",
  );

  assert.match(source, /assertSignedPkgStatus/u);
  assert.match(source, /capture\("pkgutil", \["--check-signature", pkg\]\)/u);
  assert.match(source, /"--expand-full"/u);
  assert.match(source, /assertNoAppleDoubleFiles/u);
});

test("release notarizes the finalised app before building signed containers", () => {
  const source = fs.readFileSync(
    path.join(repoRoot, "scripts", "release-macos.mjs"),
    "utf8",
  );

  const appBuild = source.indexOf('["scripts/build-macos.mjs", "dir"]');
  const appNotarize = source.indexOf("notarizeAndStapleMacApp(appPath");
  const containerBuild = source.indexOf("buildMacContainers(");

  assert.ok(appBuild >= 0);
  assert.ok(appNotarize > appBuild);
  assert.ok(containerBuild > appNotarize);
  assert.doesNotMatch(source, /"--prepackaged"/u);
});
