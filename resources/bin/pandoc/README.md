# Bundled Pandoc binary

The desktop app must use a **bundled** Pandoc binary — never one from the
system `PATH` (a system Pandoc may not exist, or may be a dynamically-linked
Homebrew build that won't run once copied elsewhere — the official GitHub
release binaries are the portable ones to bundle). Binaries are resolved per
platform/arch:

```
resources/bin/pandoc/darwin-arm64/pandoc   # macOS Apple Silicon
resources/bin/pandoc/darwin-x64/pandoc     # macOS Intel
resources/bin/pandoc/win32-x64/pandoc.exe  # staged by fetch-pandoc-windows.mjs
resources/bin/pandoc/linux-x64/pandoc      # staged by fetch-pandoc-linux.mjs
resources/bin/pandoc/linux-arm64/pandoc    # staged by fetch-pandoc-linux.mjs
```

## Rules

- Do **not** commit the Pandoc binary (it is large and gitignored). Stage it
  locally for development, or have build scripts fetch the pinned version
  (see fetch-pandoc-linux.mjs / fetch-pandoc-windows.mjs; macOS is staged
  manually — download the official `pandoc-<ver>-<arch>-macOS.zip` from
  https://github.com/jgm/pandoc/releases, not a Homebrew install).
- For local development you may instead point `ANVILNOTE_PANDOC_PATH` at any
  Pandoc binary in your `.env`.
- These files are bundled to `dist/app/bin/pandoc/...` and lifted into the
  app's Resources by electron-builder.
