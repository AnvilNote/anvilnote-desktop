# AnvilNote Desktop

**Languages:** [繁體中文](README.zh-TW.md) | **English** | [日本語](README.ja.md) | [한국어](README.ko.md) | [ไทย](README.th.md) | [Русский](README.ru.md)

[![Release](https://img.shields.io/github/v/release/AnvilNote/anvilnote-desktop?style=for-the-badge&label=Release&color=black)](https://github.com/AnvilNote/anvilnote-desktop/releases/latest)
[![Downloads](https://img.shields.io/badge/Downloads-GitHub-black?style=for-the-badge&logo=github&logoColor=white)](https://github.com/AnvilNote/anvilnote-desktop/releases)
[![macOS](https://img.shields.io/badge/macOS-Apple-black?style=for-the-badge&logo=apple&logoColor=white)](https://github.com/AnvilNote/anvilnote-desktop/releases)
[![Windows](https://img.shields.io/badge/Windows-x64-black?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/AnvilNote/anvilnote-desktop/releases)
[![Linux](https://img.shields.io/badge/Linux-deb%20%7C%20AppImage-black?style=for-the-badge&logo=linux&logoColor=white)](https://github.com/AnvilNote/anvilnote-desktop/releases)

AnvilNote Desktop packages the AnvilNote editor, API, PDF renderer, DOCX exporter, and supporting services as one Electron application. It is intended for long-form notes, lecture materials, reports, and technical or academic documents.

Core editing and document export work offline, and local desktop use requires no account. Smart Mode is optional and requires an internet connection and the user's own OpenAI API key.

## Download

Download the latest public preview from [GitHub Releases](https://github.com/AnvilNote/anvilnote-desktop/releases/latest).

| Platform | Current artifacts | Architecture |
| --- | --- | --- |
| macOS | `.dmg`, `.pkg` | Apple silicon |
| Windows | NSIS `.exe` | x64 |
| Linux | `.deb`, `.AppImage` | x64, arm64 |

The currently published `v0.1.18` macOS artifacts are not code signed or notarized by Apple. macOS may therefore display a warning on first launch. If the app is blocked, right-click AnvilNote and choose **Open**, or allow it under **System Settings > Privacy & Security**. The maintainer build pipeline now supports Developer ID signing, but the public wording must not change until a later release has completed Apple notarization, stapling, and clean-environment verification.

The Windows `.exe` is not code signed (no Authenticode certificate yet). Windows SmartScreen will show an "unknown publisher" warning on first run — choose **More info > Run anyway** after confirming the download came from the official release page.

If macOS reports that the installed app is damaged, the unsigned build may still have a download quarantine flag. After confirming that the file came from the official release page, remove the flag with:

```bash
xattr -dr com.apple.quarantine /Applications/AnvilNote.app
```

## Features

- Tiptap visual editor for long-form documents
- Headings, lists, tables, images, math, code blocks, callouts, proofs, and questions
- Reusable document templates and localized interfaces
- PDF export through the bundled Typst renderer
- DOCX export with native Word equations where supported
- Optional Smart Mode for structured composition, attachment context, and selected-text rewriting
- No account required for local desktop use
- Bundled runtime tools in packaged releases; end users do not install Node.js, Typst, or Pandoc

## Smart Mode

Smart Mode provides document-scoped conversations. A response is returned as a validated document draft before the user decides whether to insert it at the cursor or replace the current document. Selected text can be rewritten through an inline review flow with accept and reject controls. Requests can be cancelled, and accepted editor changes participate in the normal editor undo history.

Smart Mode can use extracted text from supported attachments as context. It does not provide OCR, and it does not silently replace a document. OpenAI API usage is billed to the user's OpenAI account and is separate from a ChatGPT subscription.

### Credential storage

OpenAI credentials cross a trusted Desktop boundary rather than browser `localStorage`:

- Electron main encrypts named key profiles with the operating system-backed `safeStorage` backend.
- The API database stores ciphertext and non-secret display metadata; it cannot decrypt a saved key.
- Electron main is the only component that decrypts a key and supplies it for an authorized request.
- The renderer process receives only a masked label such as `OpenAI · sk-proj-****5YA`, never the raw saved key or ciphertext.
- The loopback API binds to `127.0.0.1` and requires a per-launch Desktop trust token for privileged credential operations.
- On Linux systems where Electron reports the insecure `basic_text` backend, saved keys remain session-only instead of being presented as securely persistent.

Running `anvilnote-web` directly in a browser is also session-only because the browser does not have access to the Desktop trust boundary.

### Attachment storage

Desktop attachment blobs are stored without MinIO or another bundled object service. Electron main encrypts each content-addressed blob with AES-256-GCM using an installation key protected by `safeStorage`. Renderer IPC exposes only safe metadata and an opaque attachment ID.

## Testing Smart Mode

1. Open AnvilNote Desktop and go to **Settings**.
2. Open the AI settings and select OpenAI.
3. Add your own API key and use the connection-test button.
4. Open or create a document, then open Smart Mode from the Bot button.
5. Ask it to generate a short structured document.
6. Review the returned draft before inserting it or replacing the current document.
7. Apply the draft, then use the editor's normal undo action.
8. Select text in the editor and request a rewrite.
9. Accept or reject the inline revision.

No shared credential is provided. These steps may create chargeable OpenAI API requests.

## Build from source

Place the repositories side by side because the Desktop build assembles the Web app and trusted services from sibling repositories:

```text
parent-folder/
  anvilnote-ai-writer/
  anvilnote-api/
  anvilnote-web/
  anvilnote-desktop/
  anvilnote-renderer/
  anvilnote-docx-exporter/
  anvilnote-charts/
```

Install dependencies in the sibling repositories, then run from `anvilnote-desktop`:

```bash
pnpm install
pnpm check:repos
pnpm dev:hot
```

`pnpm dev:hot` builds the trusted sidecars and runs the sibling Next.js development server inside Electron. Stop any separately running `anvilnote-web` development server first. Use `pnpm dev` when you want a fully staged Web build without hot reload.

Useful commands:

```bash
pnpm build:main
pnpm test
pnpm prepare:desktop
pnpm pack
pnpm dist:mac
pnpm dist:mac:release
pnpm verify:mac
pnpm dist:win
pnpm dist:linux
```

`pnpm dist:mac:release` is a maintainer-only command. It requires a clean
`main` worktree, Developer ID Application and Installer identities in the
Keychain, and the `AnvilNote Notarization` notarytool profile. It signs,
submits to Apple notarization, staples, verifies, and prints SHA-256 hashes; it
does not publish a GitHub Release.

Release builds bundle the required Typst and Pandoc executables. Source-development workflows may use the sibling repositories' documented tool setup.

## Data storage

The application stores writable data outside the app bundle. The default location is:

```text
~/.anvilnote/
├── anvilnote.db
└── storage/
    ├── typst/
    └── pdf/
```

Set `ANVILNOTE_DESKTOP_DATA_DIR` to use a different development data directory.
The encrypted Smart Mode attachment vault is kept separately under Electron's
platform-specific user-data directory in `ai-attachments/`.

## Related repositories

- [AnvilNote](https://github.com/AnvilNote/anvilnote)
- [AnvilNote Web](https://github.com/AnvilNote/anvilnote-web)
- [AnvilNote API](https://github.com/AnvilNote/anvilnote-api)
- [AnvilNote AI Writer](https://github.com/AnvilNote/anvilnote-ai-writer)
- [AnvilNote Renderer](https://github.com/AnvilNote/anvilnote-renderer)
- [AnvilNote DOCX Exporter](https://github.com/AnvilNote/anvilnote-docx-exporter)

## License

This repository is licensed under the [MIT License](LICENSE).
