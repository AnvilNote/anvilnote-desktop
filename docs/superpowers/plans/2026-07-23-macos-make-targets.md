# macOS Make Targets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose the existing macOS release workflow through stable Make targets with concise English help text that contains no parentheses.

**Architecture:** Keep the Makefile as a thin wrapper around existing pnpm scripts. Do not change signing, notarization, stapling, verification, or release safety checks.

**Tech Stack:** GNU Make, pnpm, Node.js

## Global Constraints

- Keep `dist-dmg`, `dist-pkg`, `dist-mac`, `dist-mac-release`, and `verify-mac`.
- Keep `dist-mac-release` as the only target that submits artifacts to Apple.
- Use concise English comments and help text.
- Do not use parentheses in comments or help text.
- Do not run signing, notarization, stapling, publishing, or upload commands.

---

### Task 1: Normalize Makefile Help Text

**Files:**
- Modify: `Makefile`
- Test: `Makefile`

**Interfaces:**
- Consumes: pnpm scripts `dist:dmg`, `dist:pkg`, `dist:mac`, `dist:mac:release`, and `verify:mac`
- Produces: Make targets `dist-dmg`, `dist-pkg`, `dist-mac`, `dist-mac-release`, and `verify-mac`

- [x] **Step 1: Record current target output**

Run:

```bash
make help
```

Expected: all five macOS targets appear once.

- [x] **Step 2: Locate parenthetical comments and help text**

Run:

```bash
rg -n '^[[:space:]]*#.*[()]|##.*[()]' Makefile
```

Expected: matches include Windows architecture text and the `release-all`
documentation.

- [x] **Step 3: Simplify the matching text**

Use these replacements:

```make
dist-win: ## Build an unsigned Windows NSIS installer for x64

# Build macOS DMG and PKG, Windows NSIS, then Linux DEB and AppImage.
# Upload each platform in the background while the next build starts.
# The release script owns the shared shell and waits for every upload.

release-all: ## Publish all platforms and require VERSION=x.y.z
```

Keep the macOS target recipes unchanged:

```make
dist-dmg:
	$(PM) dist:dmg

dist-pkg:
	$(PM) dist:pkg

dist-mac:
	$(PM) dist:mac

dist-mac-release:
	$(PM) dist:mac:release

verify-mac:
	$(PM) verify:mac
```

- [x] **Step 4: Verify style and target output**

Run:

```bash
rg -n '^[[:space:]]*#.*[()]|##.*[()]' Makefile
make help
```

Expected: `rg` returns no matches and `make help` lists every target once.

- [x] **Step 5: Verify the diff**

Run:

```bash
git diff --check
git diff -- Makefile
```

Expected: no whitespace errors and only Makefile comment or help text changes.

- [x] **Step 6: Leave implementation uncommitted**

Do not commit or push the Makefile change. Do not execute any distribution or
release target.
