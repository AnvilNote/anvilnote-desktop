# AnvilNote Desktop

Packaging project that assembles **AnvilNote Web**, **AnvilNote API**, and
**AnvilNote Renderer**, together with a bundled Typst binary, fonts, templates,
and installer resources, into a macOS desktop application.

This is **not** a monorepo. It does not contain the source of the other apps —
it only reads, builds, copies, and packages their build artifacts.

## Expected sibling repos

By default these live next to this repo (override paths in `.env`):

```
../anvilnote-web
../anvilnote-api
../anvilnote-renderer
```

## Architecture

```
AnvilNote.app
├── Electron shell            (this repo: src/main)
├── bundled anvilnote-web     (static build → Resources/web)
├── bundled anvilnote-api     (local sidecar → Resources/api)
├── bundled anvilnote-renderer(→ Resources/renderer)
├── bundled Typst binary      (Resources/bin/typst/<arch>/typst)
├── bundled fonts             (Resources/fonts)
├── bundled templates         (Resources/templates)
└── installer resources       (Resources/installer)
```

`pnpm prepare:desktop` assembles everything into `dist/app/`, and
electron-builder lifts that tree into the packaged app's `Resources`.

## Local development

```sh
cp .env.example .env
pnpm install
pnpm check:repos        # verify sibling repos exist
pnpm dev                # compile main + launch Electron
```

In dev, if `ANVILNOTE_WEB_DEV_URL` is set the shell loads that URL; otherwise it
loads the bundled web build (run `pnpm prepare:desktop` first). The API sidecar
is started best-effort in dev so a window still opens while pieces are missing.

## Packaging (macOS only)

```sh
pnpm pack          # unsigned .app under release/mac/
pnpm dist:dmg      # .dmg
pnpm dist:pkg      # .pkg
pnpm dist:mac      # .dmg + .pkg
```

The professional `productbuild` installer flow (Welcome / Read Me / License /
Conclusion) is sketched in `installer/distribution.dist` and
`scripts/make-pkg.sh`.

## Typst binary

- Users do **not** need Typst installed.
- The desktop app must use the **bundled** Typst binary.
- Development builds may use `ANVILNOTE_TYPST_PATH` for local testing.
- Production builds resolve Typst from `process.resourcesPath`
  (`bin/typst/darwin-arm64/typst` or `bin/typst/darwin-x64/typst`), never the
  system `PATH`.

The binary is not committed (large, gitignored); stage it under
`resources/bin/typst/<arch>/typst` or fetch it via CI. See
`resources/bin/typst/README.md`.

## Fonts

- Bundled fonts go under `resources/fonts` **only after license review**.
- Typst receives this directory via `ANVILNOTE_FONT_DIR` (or `--font-path`).
- Actual font files are gitignored until bundling is authorized.

## Installer

The project supports two directions:

1. A simple `.dmg` for early beta.
2. A professional `.pkg` installer with Welcome, Read Me, License, and
   Conclusion pages.

`installer/license.rtf` is a placeholder — replace it with the real EULA before
release.

## Signing / notarization

Not done yet. Before public release this needs:

- Developer ID **Application** certificate
- Developer ID **Installer** certificate
- Hardened Runtime
- Notarization
- Stapling

These are intentionally left as TODOs in `electron-builder.config.cjs` and
`scripts/make-pkg.sh`.

## Storage

The local API stores its data outside the read-only `.app` bundle. Default root
is **`~/Downloads/AnvilNote`** (override with `ANVILNOTE_DESKTOP_DATA_DIR`):

```
~/Downloads/AnvilNote/
├── anvilnote.db          # embedded SQLite database
└── storage/
    ├── typst/            # transient render inputs / .typ
    └── pdf/              # rendered PDFs
```

## Runtime architecture (two sidecars)

The Electron main process starts two local sidecars, both using Electron itself
as the Node runtime (`ELECTRON_RUN_AS_NODE=1`, no system Node), bound to
`127.0.0.1` only:

1. **API** — the bundled anvilnote-api (`dist/server.js`), on `apiPort`
   (default 38317), using the embedded SQLite DB above. It spawns the renderer
   CLI for each render.
2. **Web** — the Next.js standalone server (`web/server.js`), on `webPort`
   (default 38318). Electron loads `http://127.0.0.1:<webPort>`; the preload
   bridge hands the web app the API base URL at runtime.

## Runtime contract (status)

- ✅ **anvilnote-web** — `output: "standalone"`; runs as a localhost sidecar.
- ✅ **anvilnote-renderer** — `build:desktop` produces a bundled `dist/cli.js`
  (no node_modules at runtime); uses `TYPST_BIN` + `ANVILNOTE_FONT_DIR`.
- ✅ **anvilnote-api** — embedded SQLite via a separate desktop Prisma schema
  (`prisma/sqlite.prisma`, cloud Postgres untouched); client selected at runtime
  by a `file:` `DATABASE_URL`; schema created on first boot; binds `127.0.0.1`.
  ⏳ Remaining (macOS packaging only): stage the API's **production
  `node_modules`** with Prisma engines for the target macOS arch — pnpm's
  symlinked store means this must be produced on macOS, e.g.
  `pnpm --dir ../anvilnote-api deploy --prod <dist/app/api>`.

### anvilnote-api

The shell launches the API as a sidecar using Electron itself as the Node
runtime (no system Node required):

```
ELECTRON_RUN_AS_NODE=1 \
HOST=127.0.0.1 PORT=38317 \
ANVILNOTE_RENDERER_DIR=<resources>/renderer \
ANVILNOTE_TYPST_PATH=<resources>/bin/typst/<arch>/typst \
TYPST_BIN=<same as above> \
ANVILNOTE_FONT_DIR=<resources>/fonts \
ANVILNOTE_TEMPLATE_DIR=<resources>/templates \
<execPath> <resources>/api/dist/server.js
```

Needed from the API:

- Honor `HOST` / `PORT` and bind to `127.0.0.1` only.
- A production entry runnable as above. Current entry is `dist/server.js`.
- Ideally ship a **bundled** production entry (e.g. `dist/desktop.js`) so the
  sidecar runs **without external `node_modules`** (the API currently uses
  Prisma and other deps that are not bundled).

### anvilnote-renderer

- Must use the Typst binary from `TYPST_BIN` / `ANVILNOTE_TYPST_PATH` and fonts
  from `ANVILNOTE_FONT_DIR` — never system-installed Typst or fonts. (It already
  reads `TYPST_BIN` and `ANVILNOTE_FONT_DIR`.)
- Ideally provide a bundled production entry so it runs without external
  `node_modules`.

### anvilnote-web

- It is a Next.js app. For desktop it must produce a **static export**
  (`output: "export"` → `out/`) that the shell can load from a `file://` URL,
  or a separately bundled server. `copy-web.mjs` looks for the configured dist
  or an `out/` directory and fails clearly if neither exists.

## Constraints (by design)

No Docker. No required system Typst / Node.js / Rust. No external network
service. The local API binds to `127.0.0.1` only. No auto-update, no login /
cloud sync. macOS only for now. No real notarization yet (TODOs only). Sibling
source is never copied into this repo — only build artifacts.
