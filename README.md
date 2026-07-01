# AnvilNote Desktop

**Languages:** [繁體中文](README.zh-TW.md) | **English** | [日本語](README.ja.md) | [한국어](README.ko.md) | [ไทย](README.th.md) | [Русский](README.ru.md)

[![Release](https://img.shields.io/github/v/release/AnvilNote/anvilnote-desktop?style=for-the-badge&label=Release&color=black)](https://github.com/AnvilNote/anvilnote-desktop/releases/latest)
[![Downloads](https://img.shields.io/badge/Downloads-GitHub-black?style=for-the-badge&logo=github&logoColor=white)](https://github.com/AnvilNote/anvilnote-desktop/releases)
[![macOS](https://img.shields.io/badge/macOS-Apple-black?style=for-the-badge&logo=apple&logoColor=white)](https://github.com/AnvilNote/anvilnote-desktop/releases)
[![Linux](https://img.shields.io/badge/Linux-deb%20%7C%20AppImage-black?style=for-the-badge&logo=linux&logoColor=white)](https://github.com/AnvilNote/anvilnote-desktop/releases)
[![Electron](https://img.shields.io/badge/Electron-Desktop-black?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)

AnvilNote is a cross-platform writing and note-taking app built for long-form notes, lecture materials, reports, and academic documents.

Everything happens in a single workspace: write, add formulas, organize code, apply templates, and export to PDF. AnvilNote runs offline by default, requires no login, and needs no separate install of Node.js, Typst, or any other tooling.

## Download

Grab the latest version from [this link](https://github.com/AnvilNote/anvilnote-desktop/releases/).

Available platforms and installers:

| Platform | Format | Notes |
| --- | --- | --- |
| macOS | `.dmg` | Best for most users — drag into Applications to install |
| macOS | `.pkg` | For a standard guided install flow |
| Linux | `.deb` | For Debian / Ubuntu and derivatives — install via your package manager |
| Linux | `.AppImage` | No install required — mark it executable and run it directly |

> [!WARNING]
> **macOS security notice**
>
> The current macOS builds are not yet code signed or notarized by Apple, so macOS may show a security warning on first launch. This is a known, expected state and does not indicate a corrupted file.

If macOS blocks the app from opening:

1. Locate the downloaded `.app`, `.dmg`, or the installed AnvilNote app in Finder.
2. Right-click AnvilNote and choose **Open**.
3. If it is still blocked, go to **System Settings > Privacy & Security**, allow AnvilNote, then launch it again.

If macOS shows **"AnvilNote" is damaged and can't be opened**, this is typically caused by the download quarantine flag on an unsigned app, not actual file corruption. After installing to `/Applications`, remove the quarantine flag from the terminal:

```bash
xattr -dr com.apple.quarantine /Applications/AnvilNote.app
```

> [!NOTE]
> The following are still required before a public release:
>
> - Developer ID Application certificate
> - Developer ID Installer certificate
> - Hardened Runtime
> - Notarization
> - Stapling

## Supported Languages

AnvilNote currently supports the following interface languages:

| Language | Locale |
| --- | --- |
| English | `en` |
| Traditional Chinese | `zh-TW` |
| Japanese | `ja` |
| Korean | `ko` |
| Thai | `th` |
| Russian | `ru` |

## Features

- Long-form notes and document organization
- Block-based editing
- Math formulas
- Code blocks
- Images, tables, and document outline
- Templates
- PDF export
- No login required
- No separate Typst install required
- No separate Node.js install required
- No dependency on external cloud services at this time

## Data Storage

AnvilNote writes document data to a writable location outside the app bundle. The default path is:

```
~/Downloads/AnvilNote/
├── anvilnote.db
└── storage/
    ├── typst/
    └── pdf/
```

This location can be overridden via `ANVILNOTE_DESKTOP_DATA_DIR`.
