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
    // filter must include dotfiles or electron-builder's default glob drops the
    // Next standalone `.next/` directory, and the web server.js crashes at
    // runtime with "Could not find a production build in the './.next' directory".
    { from: "dist/app/web", to: "web", filter: ["**/*", "**/.*", "**/.*/**"] },
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
    // App icon, rasterized from anvilnote-web's favicon-dark (dark feather logo).
    // electron-builder generates the .icns from this 1024x1024 png.
    icon: "build/icon.png",
    // The first version is intentionally unsigned. identity: null disables
    // electron-builder's auto-discovery of a local Developer ID, which would
    // otherwise try to codesign the entire bundled node_modules tree and crash
    // with EMFILE on the macOS open-files limit.
    // TODO: set a real signing identity, "hardenedRuntime": true,
    // "gatekeeperAssess": false, entitlements, and notarization before release.
    identity: null,
  },
  linux: {
    // Targets are produced one arch at a time by scripts/dist-linux.mjs, which
    // passes --x64 / --arm64 on the electron-builder CLI; the arch is therefore
    // intentionally not pinned here.
    target: ["AppImage", "deb"],
    category: "Office",
    // electron-builder rasterizes the Linux icon set from this 1024x1024 png.
    icon: "build/icon.png",
    maintainer: "AnvilNote <support@anvilnote.app>",
    synopsis: "AnvilNote desktop",
    description:
      "AnvilNote desktop — local-first note taking with Typst-powered rendering.",
    executableName: "anvilnote",
  },
  deb: {
    // Runtime libs Electron needs on a clean Debian/Ubuntu; electron-builder
    // adds its usual Electron set, these cover GUI sandbox / Typst edge cases.
    depends: [
      "libgtk-3-0",
      "libnotify4",
      "libnss3",
      "libxss1",
      "libxtst6",
      "xdg-utils",
      "libatspi2.0-0",
      "libdrm2",
      "libgbm1",
      "libasound2",
    ],
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
