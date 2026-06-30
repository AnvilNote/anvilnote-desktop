# AnvilNote Desktop

**Languages:** [繁體中文](README.md) | **English** | [日本語](README.ja.md) | [한국어](README.ko.md) | [ไทย](README.th.md) | [Русский](README.ru.md)

[![Release](https://img.shields.io/badge/Release-v0.1.0-black?style=for-the-badge)](https://github.com/AnvilNote/anvilnote-desktop/releases/tag/v0.1.0)
[![Downloads](https://img.shields.io/badge/Downloads-GitHub-black?style=for-the-badge&logo=github&logoColor=white)](https://github.com/AnvilNote/anvilnote-desktop/releases)
[![macOS](https://img.shields.io/badge/macOS-Apple-black?style=for-the-badge&logo=apple&logoColor=white)](https://github.com/AnvilNote/anvilnote-desktop/releases)
[![Electron](https://img.shields.io/badge/Electron-Desktop-black?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)

AnvilNote Desktop packages the Electron shell, AnvilNote Web, AnvilNote API, AnvilNote Renderer, Typst, fonts, templates, and installer resources into a downloadable macOS desktop app.

This repository is the single download entry point for the desktop app. Releases, install assets, version tags, download guidance, and unsigned-app notes are all published here.

## Download

You can download the current version through [this link](https://github.com/AnvilNote/anvilnote-desktop/releases/tag/v0.1.0).

Release assets are intended to include:

- `.dmg`: best for most drag-and-drop installs
- `.pkg`: best when an installer flow is preferred

The current macOS installer assets are not code signed or notarized yet. macOS may show a security warning on first launch.

If macOS blocks the app:

1. Find the downloaded `.app`, `.dmg`, or installed app in Finder.
2. Right-click the app and choose `Open`.
3. If it is still blocked, go to `System Settings > Privacy & Security` and allow the app to run.

Before public release, this repository still needs:

- Developer ID Application certificate
- Developer ID Installer certificate
- Hardened Runtime
- Notarization
- Stapling

## Supported Languages

The bundled web app currently includes these i18n locales:

| Language | Locale |
| --- | --- |
| English | `en` |
| Traditional Chinese | `zh-TW` |
| Japanese | `ja` |
| Korean | `ko` |
| Thai | `th` |
| Russian | `ru` |

## Repository Role

This is not a monorepo. It does not contain the full source code of the other AnvilNote applications. It reads, builds, copies, and packages artifacts from sibling repositories.

Expected sibling repos:

```sh
../anvilnote-web
../anvilnote-api
../anvilnote-renderer
```

Paths can be overridden through `.env`.

## Package Contents

```text
AnvilNote.app
├── Electron shell
├── bundled anvilnote-web
├── bundled anvilnote-api
├── bundled anvilnote-renderer
├── bundled Typst binary
├── bundled fonts
├── bundled templates
└── installer resources
```

`pnpm prepare:desktop` assembles the runtime into `dist/app/`, then `electron-builder` packages it into the desktop app.

## Local Development

```sh
cp .env.example .env
pnpm install
pnpm check:repos
pnpm dev
```

In development:

- If `ANVILNOTE_WEB_DEV_URL` is set, Electron loads that URL.
- Otherwise it uses the bundled web build.
- The API sidecar starts on a best-effort basis in development.

## Packaging Commands

```sh
pnpm pack
pnpm dist:dmg
pnpm dist:pkg
pnpm dist:mac
```

- `pnpm pack`: builds an unpacked `.app` for local validation
- `pnpm dist:dmg`: builds a `.dmg`
- `pnpm dist:pkg`: builds a `.pkg`
- `pnpm dist:mac`: builds both `.dmg` and `.pkg`

## Runtime Constraints

- macOS only
- No separate Node.js install required
- No separate Typst install required
- No external cloud service required
- Local API binds to `127.0.0.1` only
- No auto-update yet
- No login or cloud sync yet

## Typst, Fonts, and Templates

- Users do not need to install Typst
- The desktop app must use the bundled Typst binary
- Development builds may override Typst via `ANVILNOTE_TYPST_PATH`
- Fonts and templates are provided from bundled resource directories

## Storage

The local API writes data outside the read-only `.app` bundle. The default location is:

```text
~/Downloads/AnvilNote/
├── anvilnote.db
└── storage/
    ├── typst/
    └── pdf/
```

This can be overridden via `ANVILNOTE_DESKTOP_DATA_DIR`.
