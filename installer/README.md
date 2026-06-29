# Installer resources

Assets for the macOS installer flow.

| File                | Purpose                                              |
| ------------------- | ---------------------------------------------------- |
| `welcome.rtf`       | Welcome page                                         |
| `readme.rtf`        | Read Me page (what's bundled; no dev tools needed)   |
| `license.rtf`       | **Placeholder** EULA — replace before public release |
| `conclusion.rtf`    | Success / "open from Applications" page              |
| `distribution.dist` | productbuild Distribution XML skeleton               |

## Two packaging directions

1. **Simple `.dmg`** for early beta — `pnpm dist:dmg` (electron-builder).
2. **Professional `.pkg` installer** with the Welcome / Read Me / License /
   Conclusion pages — driven by `distribution.dist` via `productbuild`. A basic
   `.pkg` is available now with `pnpm dist:pkg`; the richer custom flow is
   outlined in `scripts/make-pkg.sh`.

## TODO before release

- Replace `license.rtf` with the final, reviewed EULA.
- Add Developer ID Installer signing and notarization in `scripts/make-pkg.sh`.
