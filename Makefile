# AnvilNote desktop Makefile
# A thin wrapper around pnpm so common workflows share one entry point.
# All comments are written in plain English without parentheses.

# Use pnpm as the package manager for every target.
PM := pnpm

# Treat these targets as commands rather than files on disk.
.PHONY: help install check-repos dev build prepare pack dist-dmg dist-pkg dist-mac dist-win dist-linux dist-linux-x64 dist-linux-arm64 typecheck check test clean reset release-all check-version check-docker bump-version clean-stage stage-mac stage-win stage-linux gather-release

# Show this help message when make runs without a target.
.DEFAULT_GOAL := help

help: ## List all available targets with a short description
	@echo "AnvilNote desktop - available make targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "} {printf "  \033[1m%-12s\033[0m %s\n", $$1, $$2}'

install: ## Install all project dependencies from the lockfile
	$(PM) install

check-repos: ## Verify the sibling AnvilNote repos are present
	$(PM) check:repos

dev: ## Compile the main process and launch the Electron shell
	$(PM) dev

build: ## Compile the TypeScript main process into dist
	$(PM) build:main

prepare: ## Build and stage web, api, and renderer for packaging
	$(PM) prepare:desktop

pack: ## Build an unpacked mac app directory for quick local testing
	$(PM) run pack

dist-dmg: ## Build a signed mac dmg installer
	$(PM) dist:dmg

dist-pkg: ## Build a signed mac pkg installer
	$(PM) dist:pkg

dist-mac: ## Build both mac dmg and pkg installers
	$(PM) dist:mac

dist-win: ## Build an unsigned Windows nsis installer exe (x64)
	$(PM) dist:win

dist-linux: ## Build Linux deb and AppImage for x64 and arm64 in Docker
	$(PM) dist:linux

dist-linux-x64: ## Build Linux deb and AppImage for x64 only
	$(PM) dist:linux x64

dist-linux-arm64: ## Build Linux deb and AppImage for arm64 only
	$(PM) dist:linux arm64

typecheck: ## Run the TypeScript compiler in no-emit mode
	$(PM) exec tsc --noEmit -p tsconfig.json

# Run type checking as a quick quality gate.
check: typecheck ## Run typecheck as the quality gate

test: ## Build the main process and run the node test suite
	$(PM) test

clean: ## Remove build output and staged packaging artifacts
	$(PM) clean

# Wipe installed dependencies on top of the normal clean step.
reset: clean ## Remove node_modules in addition to build output
	rm -rf node_modules

# --- release-all: build every platform's installer in one shot -----------
# Usage: make release-all VERSION=0.1.6
#
# Bumps package.json's version, then builds mac (dmg+pkg), windows (nsis
# exe), and linux (deb+AppImage, x64+arm64) in sequence, staging each
# platform's output before the next platform's prepare:desktop step wipes
# release/ (every dist:* script cleans dist/ and release/ first via
# scripts/clean.mjs). Does not touch git or GitHub — bump/tag/push/publish
# stays a manual, deliberate step.

STAGE_DIR := .make-stage

release-all: check-version check-docker bump-version clean-stage stage-mac stage-win stage-linux gather-release ## Bump version and build mac+win+linux installers into release/
	@echo "==> Done. Artifacts in release/:"
	@ls -lh release | grep -E '\.(dmg|pkg|exe|deb|AppImage)$$' || true

check-version:
ifndef VERSION
	$(error VERSION is required, e.g. make release-all VERSION=0.1.6)
endif

check-docker:
	@docker info >/dev/null 2>&1 || (echo "Docker is not running (needed for dist:linux)." && exit 1)

bump-version:
	@echo "==> Bumping version to $(VERSION)"
	@node -e "const fs=require('node:fs');const p='package.json';const d=JSON.parse(fs.readFileSync(p));d.version='$(VERSION)';fs.writeFileSync(p,JSON.stringify(d,null,2)+'\n');"

clean-stage:
	@rm -rf $(STAGE_DIR)
	@mkdir -p $(STAGE_DIR)

stage-mac:
	@echo "==> Building macOS (dmg + pkg)"
	@$(PM) dist:mac
	@cp release/*.dmg release/*.pkg $(STAGE_DIR)/

stage-win:
	@echo "==> Building Windows (nsis exe)"
	@$(PM) dist:win
	@cp release/*.exe $(STAGE_DIR)/

stage-linux:
	@echo "==> Building Linux (deb + AppImage, x64 + arm64)"
	@$(PM) dist:linux
	@cp release/*.deb release/*.AppImage $(STAGE_DIR)/

gather-release:
	@rm -rf release
	@mkdir -p release
	@cp $(STAGE_DIR)/* release/
	@rm -rf $(STAGE_DIR)
