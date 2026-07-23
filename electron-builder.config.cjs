// electron-builder configuration (CommonJS so it loads regardless of the repo's
// "type": "module" setting).
//
// The packaged runtime tree is assembled by `pnpm prepare:desktop` into
// `dist/app/` (web, api, renderer, bin, fonts, templates, installer). This
// config simply lifts that prepared tree into the app's Resources directory, so
// `dist/app` is the single source of truth for everything that ships.
//
/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: "com.anvilnote.app",
  productName: "AnvilNote",
  // Needed so electron-builder emits the update metadata files
  // (latest-mac.yml / latest.yml / latest-linux.yml) that electron-updater
  // reads to detect new releases. Every build script explicitly passes
  // --publish never, so this does NOT make any build upload or create a
  // GitHub Release by itself — the release script uploads the metadata
  // files alongside the installers by hand, same as any other asset.
  publish: {
    provider: "github",
    owner: "AnvilNote",
    repo: "anvilnote-desktop",
  },
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
    { from: "dist/app/charts", to: "charts" },
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
    // Public macOS artifacts must never silently fall back to unsigned output.
    // Scoped to mac only — the Windows build has no code-signing identity yet
    // and ships unsigned intentionally (see win/nsis below); a top-level
    // forceCodeSigning would fail-close that build too.
    forceCodeSigning: true,
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: "build/entitlements.mac.plist",
    entitlementsInherit: "build/entitlements.mac.inherit.plist",
    // The Desktop runtime is intentionally unpacked because its Next/API
    // sidecars execute from Resources. @electron/osx-sign otherwise treats
    // non-text assets such as fonts, PDF CMaps, images, and archives as
    // signable binaries. Signing those data files creates invalid extended
    // signatures and breaks the outer bundle seal. They remain protected by
    // the enclosing App/framework resource seal; real Mach-O code (.node,
    // .dylib, extensionless executables, nested apps/frameworks) is not
    // ignored and is still signed bottom-up.
    signIgnore: [
      "\\.(?:asar|bcmap|bin|body|cjs|dat|docx|gif|icc|icns|ico|jpg|json|nib|otf|pak|pdf|pfb|png|ttf|wasm|woff|woff2|zip)$",
      "(?:^|/)\\.jekyll-metadata$",
    ],
    // The explicit two-phase release script uses the local notarytool
    // Keychain profile only for `dist:mac:release`. Disable electron-builder's
    // built-in notarization to avoid submitting the same app twice.
    notarize: false,
  },
  win: {
    // Intentionally unsigned: no Windows code-signing certificate yet. Users
    // installing the .exe will see a SmartScreen "unknown publisher" warning
    // until Authenticode signing is added — see README's Windows note.
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
    maintainer: "AnvilNote <team@anvilnote.org>",
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
    // Used by scripts/build-macos-containers.mjs as the install location for
    // the custom metadata-free, Developer ID Installer-signed component PKG.
    installLocation: "/Applications",
  },
};
