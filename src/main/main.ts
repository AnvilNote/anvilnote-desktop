// Electron main entry for AnvilNote Desktop.
//
// Dev:   loads ANVILNOTE_WEB_DEV_URL when set (web running from its own dev
//        server); otherwise the bundled web build. The API sidecar is started
//        best-effort so a window still opens while pieces are missing.
// Prod:  loads the bundled web build and requires the API sidecar.

import { app, BrowserWindow } from "electron";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { repoRoot, runtimePaths, isPackaged } from "./paths.js";
import { startLocalApi, stopLocalApi } from "./local-api.js";
import { createLogger } from "./logger.js";

const log = createLogger("main");
const moduleDir = path.dirname(fileURLToPath(import.meta.url));

// In dev, read .env from the repo root. Packaged builds rely on baked-in config.
if (!app.isPackaged) {
  dotenv.config({ path: path.join(repoRoot, ".env") });
}

const DEFAULT_PORT = 38317;
const port = Number(process.env.ANVILNOTE_DESKTOP_PORT ?? DEFAULT_PORT);

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 880,
    minHeight: 600,
    title: "AnvilNote",
    show: false,
    webPreferences: {
      preload: path.join(moduleDir, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow?.show());
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  void loadAppContent(mainWindow);
}

async function loadAppContent(win: BrowserWindow): Promise<void> {
  const devUrl = process.env.ANVILNOTE_WEB_DEV_URL;
  if (!app.isPackaged && devUrl) {
    log.info(`loading dev web URL: ${devUrl}`);
    await win.loadURL(devUrl);
    return;
  }

  const indexHtml = path.join(runtimePaths.web(), "index.html");
  if (fs.existsSync(indexHtml)) {
    log.info(`loading bundled web: ${indexHtml}`);
    await win.loadFile(indexHtml);
    return;
  }

  log.warn(`bundled web not found at ${indexHtml}; showing placeholder`);
  await win.loadURL(placeholderPage(indexHtml));
}

// Shown until the web build is wired in. anvilnote-web is a Next.js app, so it
// must provide a static export (output: "export") or a bundled server before a
// real index.html exists here — see README "Runtime contract".
function placeholderPage(expectedPath: string): string {
  const html = `<!doctype html><html><head><meta charset="utf-8">
<title>AnvilNote Desktop</title>
<style>body{font:14px/1.6 -apple-system,system-ui,sans-serif;margin:3rem;color:#1f2328}
code{background:#f5f5f4;padding:.1rem .3rem;border-radius:4px}</style></head>
<body><h1>AnvilNote Desktop shell</h1>
<p>The Electron shell is running, but no bundled web build was found.</p>
<p>Expected: <code>${expectedPath}</code></p>
<p>Run <code>pnpm prepare:desktop</code>, or set <code>ANVILNOTE_WEB_DEV_URL</code>
for development. See the README runtime contract for the Next.js static-export
requirement.</p></body></html>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

async function bootstrap(): Promise<void> {
  // Start the API sidecar. Required in production; best-effort in dev.
  try {
    const api = await startLocalApi(port);
    process.env.ANVILNOTE_API_BASE_URL = api.baseUrl;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (app.isPackaged) {
      log.error(`failed to start API sidecar: ${message}`);
    } else {
      log.warn(`API sidecar not started (dev, continuing): ${message}`);
    }
  }

  createWindow();
}

app.whenReady().then(bootstrap).catch((err) => {
  log.error("bootstrap failed", err);
  app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Quit on all windows closed (including macOS) so the API sidecar is always torn
// down with the app in this skeleton.
app.on("window-all-closed", () => app.quit());

// Ensure no zombie sidecar survives the app.
app.on("before-quit", () => stopLocalApi());
process.on("exit", () => stopLocalApi());

log.info(`AnvilNote Desktop starting (packaged=${isPackaged()}, port=${port})`);
