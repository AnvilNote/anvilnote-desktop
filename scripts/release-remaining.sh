#!/usr/bin/env bash
# One-off: v0.1.9's tag/GitHub release already exist from an earlier
# release-all run, but that run predates this session's version-history
# feature and callout color fix — only a manually rebuilt mac dmg/pkg
# (never uploaded) reflects the current code. Rebuilds mac+win+linux fresh
# and re-uploads with --clobber to bring the v0.1.9 release assets up to
# date, skipping release-all.sh's version-bump/tag/release-create steps
# since those already happened.
set -euo pipefail

VERSION="0.1.9"
TAG="v$VERSION"

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

STAGE_DIR=".make-stage"
rm -rf "$STAGE_DIR"
mkdir -p "$STAGE_DIR"

upload_pids=()
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

echo "==> Done. $TAG assets rebuilt and re-uploaded."
gh release view "$TAG"
