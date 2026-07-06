// Shared helpers for the packaging scripts: .env loading, path resolution, and
// small build/copy utilities. No external dependencies so it runs under plain
// Node without an install step.

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function parseEnvFile(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const raw of fs.readFileSync(file, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

// Precedence: .env.example (defaults) < .env (local) < process.env (override).
export function loadEnv() {
  const merged = {
    ...parseEnvFile(path.join(repoRoot, ".env.example")),
    ...parseEnvFile(path.join(repoRoot, ".env")),
  };
  for (const key of Object.keys(merged)) {
    const fromProc = process.env[key];
    if (fromProc != null && fromProc !== "") merged[key] = fromProc;
  }
  return merged;
}

function resolveDir(p) {
  return path.isAbsolute(p) ? p : path.resolve(repoRoot, p);
}

export function config() {
  const e = loadEnv();
  return {
    repoRoot,
    webDir: resolveDir(e.ANVILNOTE_WEB_DIR ?? "../anvilnote-web"),
    apiDir: resolveDir(e.ANVILNOTE_API_DIR ?? "../anvilnote-api"),
    rendererDir: resolveDir(e.ANVILNOTE_RENDERER_DIR ?? "../anvilnote-renderer"),
    docxExporterDir: resolveDir(e.ANVILNOTE_DOCX_EXPORTER_DIR ?? "../anvilnote-docx-exporter"),
    chartsDir: resolveDir(e.ANVILNOTE_CHARTS_DIR ?? "../anvilnote-charts"),
    webDist: e.ANVILNOTE_WEB_DIST ?? "dist",
    apiDist: e.ANVILNOTE_API_DIST ?? "dist",
    rendererDist: e.ANVILNOTE_RENDERER_DIST ?? "dist",
    docxExporterDist: e.ANVILNOTE_DOCX_EXPORTER_DIST ?? "dist",
    chartsDist: e.ANVILNOTE_CHARTS_DIST ?? "dist",
    port: Number(e.ANVILNOTE_DESKTOP_PORT ?? 38317),
    webDevUrl: e.ANVILNOTE_WEB_DEV_URL ?? "",
    // Assembled runtime tree that electron-builder lifts into Resources.
    appDir: path.join(repoRoot, "dist", "app"),
  };
}

export function logStep(msg) {
  console.log(`\n▶ ${msg}`);
}

export function fail(msg) {
  console.error(`✖ ${msg}`);
  process.exit(1);
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

export function copyInto(src, destDir, name) {
  if (!fs.existsSync(src)) fail(`missing source: ${src}`);
  ensureDir(destDir);
  const dest = path.join(destDir, name ?? path.basename(src));
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(src, dest, { recursive: true });
  console.log(`  copied ${src} -> ${dest}`);
  return dest;
}

export function run(cmd, args, cwd) {
  console.log(`$ ${cmd} ${args.join(" ")}  (cwd: ${cwd})`);
  const res = spawnSync(cmd, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (res.error) fail(`failed to launch ${cmd}: ${res.error.message}`);
  if (res.status !== 0) fail(`command exited ${res.status}: ${cmd} ${args.join(" ")}`);
}

export function buildSibling(name, dir) {
  const pkg = path.join(dir, "package.json");
  if (!fs.existsSync(pkg)) fail(`${name}: package.json not found at ${pkg}`);
  const json = JSON.parse(fs.readFileSync(pkg, "utf8"));
  if (!json.scripts?.build) fail(`${name}: no "build" script in ${pkg}`);
  run("pnpm", ["build"], dir);
}
