#!/bin/sh
# Conservative skeleton for assembling a .dmg. For normal use prefer
# `pnpm dist:dmg` (electron-builder), which handles layout and compression.
#
# This script only checks prerequisites and outlines the manual hdiutil path for
# when a fully custom DMG (e.g. wrapping a .pkg) is needed later.
set -eu

APP_PATH="release/mac/AnvilNote.app"
PKG_PATH="release/pkg/AnvilNote.pkg"

if [ ! -d "$APP_PATH" ] && [ ! -f "$PKG_PATH" ]; then
  echo "✖ Neither $APP_PATH nor $PKG_PATH found."
  echo "  Build first:  pnpm pack   (then optionally  sh scripts/make-pkg.sh)"
  exit 1
fi

echo "For a standard app DMG, use:"
echo "    pnpm dist:dmg"
echo
echo "▶ To wrap a .pkg into a .dmg manually (skeleton):"
echo "    mkdir -p release/dmg-staging"
echo "    cp \"$PKG_PATH\" release/dmg-staging/ 2>/dev/null || true"
echo "    hdiutil create -volname AnvilNote \\"
echo "                   -srcfolder release/dmg-staging \\"
echo "                   -ov -format UDZO release/AnvilNote.dmg"
echo
echo "TODO: Sign and notarize the .dmg before public distribution."
