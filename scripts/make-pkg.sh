#!/bin/sh
# Conservative skeleton for building a professional .pkg installer with
# productbuild (Welcome / Read Me / License / Conclusion via installer/).
#
# This does NOT sign anything and does NOT assume any certificate exists. The
# normal path for a basic installer is `pnpm dist:pkg` (electron-builder). Use
# this script only when you need the richer Distribution.xml flow.
set -eu

APP_PATH="release/mac/AnvilNote.app"
OUT_DIR="release/pkg"
COMPONENT_PKG="$OUT_DIR/AnvilNote-component.pkg"
PRODUCT_PKG="$OUT_DIR/AnvilNote.pkg"
DIST_XML="installer/distribution.dist"

if [ ! -d "$APP_PATH" ]; then
  echo "✖ $APP_PATH not found."
  echo "  Build the .app first:  pnpm pack"
  exit 1
fi

mkdir -p "$OUT_DIR"

echo "▶ Would build component package with pkgbuild:"
echo "    pkgbuild --component \"$APP_PATH\" \\"
echo "             --install-location /Applications \\"
echo "             --identifier com.anvilnote.app \\"
echo "             --version 0.1.0 \\"
echo "             \"$COMPONENT_PKG\""
echo
echo "▶ Would build product installer with productbuild:"
echo "    productbuild --distribution \"$DIST_XML\" \\"
echo "                 --resources installer \\"
echo "                 --package-path \"$OUT_DIR\" \\"
echo "                 \"$PRODUCT_PKG\""
echo
echo "TODO: Enable the commands above and add Developer ID Installer signing"
echo "      (--sign \"Developer ID Installer: ...\") plus notarization before"
echo "      public release. Intentionally not signing in this skeleton."
