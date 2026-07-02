#!/usr/bin/env bash
# Builds mac, windows, and linux installers in sequence and uploads each
# platform's files to a GitHub release as soon as that platform finishes —
# backgrounded so the next platform's build starts immediately instead of
# waiting on the network transfer. Invoked by `make release-all VERSION=x.y.z`.
#
# Platforms build sequentially, not concurrently: pnpm dist:mac/win/linux all
# run prepare:desktop, which wipes dist/ and release/ first (scripts/clean.mjs)
# and reassembles dist/app from the sibling repos — running two of those at
# once would race on the same directories and corrupt both builds. Only the
# *upload* step is backgrounded.
set -euo pipefail

: "${VERSION:?VERSION is required, e.g. make release-all VERSION=0.1.6}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "==> Checking prerequisites"
command -v docker >/dev/null || { echo "Docker not found."; exit 1; }
docker info >/dev/null 2>&1 || { echo "Docker is not running (needed for dist:linux)."; exit 1; }
command -v gh >/dev/null || { echo "gh CLI not found."; exit 1; }

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree is not clean. Commit or stash first, then re-run."
  exit 1
fi

TAG="v$VERSION"

echo "==> Bumping version to $VERSION"
node -e "
const fs = require('node:fs');
const p = 'package.json';
const d = JSON.parse(fs.readFileSync(p));
d.version = '$VERSION';
fs.writeFileSync(p, JSON.stringify(d, null, 2) + '\n');
"

git add package.json
git commit -m "build: bump to $VERSION"
git tag "$TAG"
git push origin HEAD
git push origin "$TAG"

echo "==> Creating GitHub release $TAG"
gh release create "$TAG" --title "$TAG" --notes "Release $TAG"

STAGE_DIR=".make-stage"
rm -rf "$STAGE_DIR"
mkdir -p "$STAGE_DIR"

upload_pids=()

# Uploads the given files to the release in the background; the caller
# continues to the next platform's build without waiting for the transfer.
upload_async() {
  gh release upload "$TAG" "$@" --clobber &
  upload_pids+=("$!")
}

echo "==> Building macOS (dmg + pkg)"
pnpm dist:mac
cp release/*.dmg release/*.pkg "$STAGE_DIR"/
upload_async "$STAGE_DIR"/*.dmg "$STAGE_DIR"/*.pkg

echo "==> Building Windows (nsis exe)"
pnpm dist:win
cp release/*.exe "$STAGE_DIR"/
upload_async "$STAGE_DIR"/*.exe

echo "==> Building Linux (deb + AppImage, x64 + arm64)"
pnpm dist:linux
cp release/*.deb release/*.AppImage "$STAGE_DIR"/
upload_async "$STAGE_DIR"/*.deb "$STAGE_DIR"/*.AppImage

echo "==> Waiting for background uploads to finish"
wait "${upload_pids[@]}"

rm -rf release
mkdir -p release
cp "$STAGE_DIR"/* release/
rm -rf "$STAGE_DIR"

echo "==> Done. $TAG built, uploaded, and published."
gh release view "$TAG"
