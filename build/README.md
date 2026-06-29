# build/

electron-builder's `buildResources` directory. Put build-time assets here that
should NOT ship inside the app (icons, background images, entitlements).

Expected later:

- `icon.icns` — macOS app icon (1024×1024 source recommended).
- `entitlements.mac.plist` — hardened-runtime entitlements (for signing /
  notarization).
- `background.png` / `background@2x.png` — DMG window background (optional).

Until `icon.icns` exists, electron-builder uses a default Electron icon.
