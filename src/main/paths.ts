// Runtime path resolution for the Electron shell.
//
// Everything the app needs at runtime lives in one assembled tree:
//   - packaged build : process.resourcesPath  (electron-builder extraResources)
//   - development     : <repo>/dist/app        (produced by `pnpm prepare:desktop`)
//
// Both layouts contain the same subdirectories: web, api, renderer, bin, fonts,
// templates, installer.

import { app } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

// dist/main/paths.js -> repo root is two levels up.
export const repoRoot = path.resolve(moduleDir, "..", "..");

export function isPackaged(): boolean {
  return app.isPackaged;
}

/** Root that holds the assembled runtime tree. */
export function runtimeRoot(): string {
  return app.isPackaged
    ? process.resourcesPath
    : path.join(repoRoot, "dist", "app");
}

export const runtimePaths = {
  web: () => path.join(runtimeRoot(), "web"),
  api: () => path.join(runtimeRoot(), "api"),
  renderer: () => path.join(runtimeRoot(), "renderer"),
  bin: () => path.join(runtimeRoot(), "bin"),
  fonts: () => path.join(runtimeRoot(), "fonts"),
  templates: () => path.join(runtimeRoot(), "templates"),
  installer: () => path.join(runtimeRoot(), "installer"),
};

/** Resources staged directly in the repo (used as a dev fallback). */
export const repoResources = {
  bin: () => path.join(repoRoot, "resources", "bin"),
  fonts: () => path.join(repoRoot, "resources", "fonts"),
  templates: () => path.join(repoRoot, "resources", "templates"),
};
