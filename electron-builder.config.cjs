// electron-builder configuration (CommonJS so it loads regardless of the repo's
// "type": "module" setting).
//
// The packaged runtime tree is assembled by `pnpm prepare:desktop` into
// `dist/app/` (web, api, renderer, bin, fonts, templates, installer). This
// config simply lifts that prepared tree into the app's Resources directory, so
// `dist/app` is the single source of truth for everything that ships.
//
// TODO: Add Developer ID signing, hardened runtime, notarization, and stapling
// before public release. The first version is intentionally unsigned.

/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: "com.anvilnote.app",
  productName: "AnvilNote",
  directories: {
    output: "release",
    buildResources: "build",
  },
  // Only the compiled Electron main and package metadata go into app.asar; all
  // heavy runtime pieces are shipped as extraResources (see below).
  files: ["dist/main/**/*", "package.json"],
  extraResources: [
    { from: "dist/app/web", to: "web" },
    { from: "dist/app/api", to: "api" },
    { from: "dist/app/renderer", to: "renderer" },
    { from: "dist/app/bin", to: "bin" },
    { from: "dist/app/fonts", to: "fonts" },
    { from: "dist/app/templates", to: "templates" },
    { from: "dist/app/installer", to: "installer" },
  ],
  mac: {
    category: "public.app-category.productivity",
    target: ["dmg", "pkg"],
    // TODO: signing identity, "hardenedRuntime": true, "gatekeeperAssess": false,
    // entitlements, and notarization config go here before release.
  },
  dmg: {
    title: "AnvilNote",
  },
  pkg: {
    // productbuild-based installer. The richer Distribution XML / Welcome /
    // Read Me / License / Conclusion flow under installer/ can be wired in via
    // scripts/make-pkg.sh when a fully custom installer is needed.
    installLocation: "/Applications",
  },
};
