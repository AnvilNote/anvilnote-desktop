# macOS Make Targets

## Scope

Expose the existing macOS signing and notarization scripts through concise
Makefile targets. Do not change the release workflow or add a shortcut around
its safety checks.

## Targets

- `dist-dmg` builds a signed DMG.
- `dist-pkg` builds a signed PKG.
- `dist-mac` builds both signed installers.
- `dist-mac-release` builds, notarizes, staples, and verifies both installers.
- `verify-mac` verifies the signed and stapled artifacts.

## Safety

`dist-mac-release` remains the only Make target that submits artifacts to
Apple. It continues to require the checks implemented by
`scripts/release-macos.mjs`.

## Style

Makefile comments and help text use concise English without parentheses.
Existing target names remain stable.

## Validation

Run `make help` and confirm every target appears once with clear help text.
Run `git diff --check` after editing.
