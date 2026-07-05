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
    { from: "dist/app/docx-exporter", to: "docx-exporter" },
    { from: "dist/app/bin", to: "bin" },
    { from: "dist/app/fonts", to: "fonts" },
    { from: "dist/app/templates", to: "templates" },
    { from: "dist/app/typst-packages", to: "typst-packages" },
    { from: "dist/app/installer", to: "installer" },
    { from: "build/icon.png", to: "icon.png" },
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
  win: {
    target: ["nsis"],
    icon: "build/icon.png",
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
  },
  linux: {
    // Targets are produced one arch at a time by scripts/dist-linux.mjs, which
    // passes --x64 / --arm64 on the electron-builder CLI; the arch is therefore
    // intentionally not pinned here.
    target: ["AppImage", "deb"],
    category: "Office",
    // A directory of pre-sized PNGs, NOT the single 1024x1024 build/icon.png
    // used for mac/win — electron-builder's underlying app-builder binary's
    // `icon --format set` (used for the Linux hicolor icon set) does not
    // rasterize a single input into multiple sizes the way the mac .icns /
    // win .ico generators do; given one file it just uses that file as
    // its one and only size. Verified directly: running app-builder against
    // build/icon.png alone produced a single 1024x1024 entry, which is why
    // installed .deb builds prior to this had no visible icon in most
    // launchers (hicolor lookups for standard sizes like 48/128/256 found
    // nothing). build/icons/ is checked-in pre-rendered output (via `sips`)
    // at the standard hicolor sizes; regenerate it if build/icon.png changes.
    icon: "build/icons",
    vendor: "AnvilNote",
    maintainer: "AnvilNote <sungpinyue@gmail.com>",
    synopsis: "Offline-first writing and notes app",
    description:
      "AnvilNote is a desktop writing and notes app for long-form notes, lecture handouts, reports, and academic documents. It supports block editing, math formulas, code blocks, images, tables, templates, and PDF export. It works offline-first and does not require login, Node.js, or Typst to be installed separately.",
    executableName: "anvilnote",
  },
  deb: {
    // Refresh the GTK icon cache so the app icon shows up immediately after
    // install instead of waiting for the next cache refresh.
    afterInstall: "build/deb-after-install.sh",
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
