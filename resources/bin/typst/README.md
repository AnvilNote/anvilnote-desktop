# Bundled Typst binary

The desktop app must use a **bundled** Typst binary — never one from the system
`PATH`. Binaries are resolved per platform/arch:

```
resources/bin/typst/darwin-arm64/typst   # macOS Apple Silicon
resources/bin/typst/darwin-x64/typst     # macOS Intel
```

## Rules

- Do **not** commit the Typst binary (it is large and gitignored). Stage it
  locally for development, or have CI/build scripts fetch the pinned version.
- For local development you may instead point `ANVILNOTE_TYPST_PATH` at any
  Typst binary in your `.env`.
- These files are bundled to `dist/app/bin/typst/...` and lifted into the app's
  Resources by electron-builder.
