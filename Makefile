# AnvilNote desktop Makefile
# A thin wrapper around pnpm so common workflows share one entry point.
# All comments are written in plain English without parentheses.

# Use pnpm as the package manager for every target.
PM := pnpm

# Treat these targets as commands rather than files on disk.
.PHONY: help install check-repos dev build prepare pack dist-dmg dist-pkg dist-mac dist-linux dist-linux-x64 dist-linux-arm64 typecheck check test clean reset

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
