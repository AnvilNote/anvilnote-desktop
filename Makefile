# AnvilNote desktop tasks
# Thin pnpm wrapper for common workflows
# Comments use concise English without parentheses

# Use pnpm for every target
PM := pnpm

# Treat targets as commands
.PHONY: help install check-repos dev dev-hot build prepare pack dist-dmg dist-pkg dist-mac dist-mac-release verify-mac dist-win dist-linux dist-linux-x64 dist-linux-arm64 release-native typecheck check test clean reset release-all

# Show help by default
.DEFAULT_GOAL := help

help: ## List all available targets with a short description
	@echo "AnvilNote desktop - available make targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "} {printf "  \033[1m%-12s\033[0m %s\n", $$1, $$2}'

install: ## Install all project dependencies from the lockfile
	$(PM) install

check-repos: ## Verify the sibling AnvilNote repos are present
	$(PM) check:repos

dev: ## Prepare and launch the Electron desktop app
	$(PM) dev

dev-hot: ## Launch Desktop with Next hot reload and encrypted Smart Mode storage
	$(PM) dev:hot

build: ## Build the Electron main process
	$(PM) build:main

prepare: ## Build and stage Web, API, and Renderer
	$(PM) prepare:desktop

pack: ## Build a signed unpacked macOS app
	$(PM) run pack

dist-dmg: ## Build a signed macOS DMG
	$(PM) dist:dmg

dist-pkg: ## Build a signed macOS PKG
	$(PM) dist:pkg

dist-mac: ## Build signed macOS DMG and PKG installers
	$(PM) dist:mac

# macOS auto-update requires a signed+notarized zip artifact, not just dmg/pkg:
# 1. electron-updater's MacUpdater.doDownloadUpdate() *only* accepts a zip file
#    (findFile(files, "zip", ["pkg", "dmg"])) -- dmg/pkg-only releases make the
#    download step throw ERR_UPDATER_ZIP_FILE_NOT_FOUND, even though the check
#    step succeeds.
# 2. app-update.yml (the file inside Contents/Resources telling the app which
#    GitHub repo to poll) is normally embedded by electron-builder's own
#    afterPack hook -- but ONLY when that hook's packaging pass already knows
#    about a dmg/zip target. Our two-phase build (`--mac dir` alone, then a
#    *separate* `--prepackaged` pass for containers) never gives that first
#    pass a dmg/zip target, so electron-builder never writes the file and
#    checkForUpdates() throws immediately (ENOENT) on every launch.
# scripts/build-macos.mjs writes app-update.yml itself (before the final
# codesign) as a fix for #2; the mac target list including "zip" (see
# electron-builder.config.cjs) is the fix for #1. Forgetting either one means
# Settings > Software Update always shows an error, never "up to date".
dist-mac-release: ## Build, notarize, staple, and verify macOS artifacts
	$(PM) dist:mac:release

verify-mac: ## Verify signed and stapled macOS artifacts
	$(PM) verify:mac

dist-win: ## Build an unsigned Windows NSIS installer on Windows x64
	node scripts/assert-native-target.mjs win32 x64
	$(PM) dist:win

dist-linux: ## Build Linux assets through native GitHub runners
	@echo "dist-linux cannot correctly build x64 and arm64 native sidecars on one host."
	@echo "Use: make release-native TAG=v0.1.20"
	@exit 1

dist-linux-x64: ## Build Linux deb and AppImage on Linux x64
	node scripts/assert-native-target.mjs linux x64
	$(PM) dist:linux x64

dist-linux-arm64: ## Build Linux deb and AppImage on Linux arm64
	node scripts/assert-native-target.mjs linux arm64
	$(PM) dist:linux arm64

release-native: ## Build and upload Windows and Linux assets using native runners
	@test -n "$(TAG)" || { echo "TAG is required, e.g. make release-native TAG=v0.1.20"; exit 1; }
	@command -v gh >/dev/null || { echo "gh CLI not found."; exit 1; }
	@run_url="$$(gh workflow run release-native-platforms.yml -f tag=$(TAG))"; \
	echo "$$run_url"; \
	run_id="$${run_url##*/}"; \
	gh run watch "$$run_id" --exit-status

typecheck: ## Run the TypeScript compiler in no-emit mode
	$(PM) exec tsc --noEmit -p tsconfig.json

# Run the quick quality gate
check: typecheck ## Run typecheck as the quality gate

test: ## Build the main process and run the node test suite
	$(PM) test

clean: ## Remove build output and staged packaging artifacts
	$(PM) clean

# Remove dependencies after cleaning output
reset: clean ## Remove node_modules in addition to build output
	rm -rf node_modules

# Publish all platforms
# Usage: make release-all VERSION=0.1.6
# Bump, commit, tag, push, build, and create the GitHub release
# Build macOS, Windows, and Linux in sequence
# Upload each platform while the next build starts
# Keep one shell alive until every upload finishes
# This command mutates Git and GitHub
release-all: ## Publish all platforms and require VERSION=x.y.z
	@VERSION=$(VERSION) bash scripts/release-all.sh
