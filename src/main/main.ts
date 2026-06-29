// Electron main entry for AnvilNote Desktop.
//
// Dev:   loads ANVILNOTE_WEB_DEV_URL when set (web running from its own dev
//        server); otherwise the bundled web build. The API sidecar is started
//        best-effort so a window still opens while pieces are missing.
// Prod:  loads the bundled web build and requires the API sidecar.

import { app, BrowserWindow, ipcMain, session } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { repoRoot, runtimePaths, isPackaged } from "./paths.js";
import { startLocalApi, stopLocalApi } from "./local-api.js";
import { startLocalWeb, stopLocalWeb } from "./local-web.js";
import { createLogger } from "./logger.js";
import { rewriteDevApiUrl } from "./request-routing.js";

const log = createLogger("main");
const moduleDir = path.dirname(fileURLToPath(import.meta.url));

// In dev, read .env from the repo root. Packaged builds rely on baked-in config.
if (!app.isPackaged) {
  dotenv.config({ path: path.join(repoRoot, ".env") });
}

const DEFAULT_API_PORT = 38317;
const DEFAULT_WEB_PORT = 38318;
const apiPort = Number(process.env.ANVILNOTE_DESKTOP_PORT ?? DEFAULT_API_PORT);
const webPort = Number(process.env.ANVILNOTE_WEB_PORT ?? DEFAULT_WEB_PORT);

let mainWindow: BrowserWindow | null = null;
let appUrl: string | null = null;
let currentApiBaseUrl = `http://127.0.0.1:${apiPort}`;

// Must run after app is ready; session.defaultSession throws otherwise.
function registerApiRequestRouting(): void {
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    const redirectURL = rewriteDevApiUrl(details.url, currentApiBaseUrl);
    callback(redirectURL ? { redirectURL } : {});
  });
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 880,
    minHeight: 600,
    title: "AnvilNote",
    show: false,
    webPreferences: {
      preload: path.join(moduleDir, "preload.cjs"),
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
  if (appUrl) {
    log.info(`loading web: ${appUrl}`);
    await win.loadURL(appUrl);
    return;
  }
  log.warn("no web URL available; showing placeholder");
  await win.loadURL(placeholderPage(runtimePaths.web()));
}

// Shown only if no web URL could be resolved (sidecar failed and no dev URL).
function placeholderPage(expectedPath: string): string {
  const html = `<!doctype html><html><head><meta charset="utf-8">
<title>AnvilNote Desktop</title>
<style>body{font:14px/1.6 -apple-system,system-ui,sans-serif;margin:3rem;color:#1f2328}
code{background:#f5f5f4;padding:.1rem .3rem;border-radius:4px}</style></head>
<body><h1>AnvilNote Desktop shell</h1>
<p>The Electron shell is running, but the web server sidecar did not start.</p>
<p>Expected the Next standalone build at: <code>${expectedPath}/server.js</code></p>
<p>Run <code>pnpm prepare:desktop</code>, or set <code>ANVILNOTE_WEB_DEV_URL</code>
for development.</p></body></html>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

async function bootstrap(): Promise<void> {
  registerApiRequestRouting();

  // 1. API sidecar (SQLite under ~/Downloads). Required in production.
  let apiBaseUrl = currentApiBaseUrl;
  const webOrigin = `http://127.0.0.1:${webPort}`;
  try {
    const api = await startLocalApi(apiPort, webOrigin);
    apiBaseUrl = api.baseUrl;
    process.env.ANVILNOTE_API_BASE_URL = api.baseUrl;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (app.isPackaged) log.error(`failed to start API sidecar: ${message}`);
    else log.warn(`API sidecar not started (dev, continuing): ${message}`);
  }
  currentApiBaseUrl = apiBaseUrl;

  // 2. Web content. Dev URL wins; otherwise start the Next standalone sidecar.
  const devUrl = process.env.ANVILNOTE_WEB_DEV_URL;
  if (!app.isPackaged && devUrl) {
    appUrl = devUrl;
  } else {
    try {
      const web = await startLocalWeb(webPort, apiBaseUrl);
      appUrl = web.baseUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log.error(`failed to start web sidecar: ${message}`);
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

// Ensure no zombie sidecars survive the app.
function stopSidecars(): void {
  stopLocalWeb();
  stopLocalApi();
}
app.on("before-quit", stopSidecars);
process.on("exit", stopSidecars);

ipcMain.on("anvilnote:get-api-base-url", (event) => {
  event.returnValue = currentApiBaseUrl;
});

log.info(
  `AnvilNote Desktop starting (packaged=${isPackaged()}, apiPort=${apiPort}, webPort=${webPort})`,
);
