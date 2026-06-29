# Bundled fonts

Place font files the renderer should use here. They are staged into the app at
`dist/app/fonts` and surfaced to the renderer via `ANVILNOTE_FONT_DIR` (and/or
Typst `--font-path`), so **the desktop app never relies on system-installed
fonts**.

## Rules

- Do **not** commit actual font binaries (`.ttf`, `.otf`, `.ttc`) until their
  license has been reviewed and bundling is authorized. These extensions are
  gitignored on purpose.
- After license review, drop the cleared font files in here (or have CI fetch
  them) and they will be bundled by `pnpm prepare:desktop` / electron-builder.
- Keep this README so the directory structure is preserved in git.
