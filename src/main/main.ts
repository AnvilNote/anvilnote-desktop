// Electron main entry for AnvilNote Desktop.
//
// Dev:   loads ANVILNOTE_WEB_DEV_URL when set (web running from its own dev
//        server); otherwise the bundled web build. The API sidecar is started
//        best-effort so a window still opens while pieces are missing.
// Prod:  loads the bundled web build and requires the API sidecar.

import { app, BrowserWindow, ipcMain, Menu, safeStorage, session, shell } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { repoRoot, runtimePaths, isPackaged, appIconPath } from "./paths.js";
import { startLocalApi, stopLocalApi } from "./local-api.js";
import { startLocalWeb, stopLocalWeb } from "./local-web.js";
import { createLogger } from "./logger.js";
import { rewriteDevApiUrl } from "./request-routing.js";
import { registerExportDialogHandlers } from "./export-dialog.js";
import { AISecretStoreImpl } from "./ai/ai-secret-store.js";
import { registerAIIPCHandlers } from "./ai/ai-ipc.js";
import { createDesktopTrustToken, TrustedAIClient } from "./ai/trusted-ai-client.js";
import { userData } from "./paths.js";

const log = createLogger("main");
const moduleDir = path.dirname(fileURLToPath(import.meta.url));

// AppImage has no install step, so nothing can chown/chmod chrome-sandbox to
// root:4755 the way the .deb's postinst script does (see
// build/deb-after-install.sh) — running it as a regular user aborts with
// "SUID sandbox helper binary was found, but is not configured correctly."
// The AppImage runtime always sets APPIMAGE to the mounted image's path
// (https://docs.appimage.org/packaging-guide/environment-variables.html),
// which is a reliable way to detect this specific packaging without
// weakening the sandbox on platforms/formats where it works normally. Must
// run before app.whenReady() / any window creation for the switch to apply.
if (process.env.APPIMAGE) {
  app.commandLine.appendSwitch("no-sandbox");
}

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
const desktopTrustToken = createDesktopTrustToken();
let aiHandlersRegistered = false;

function registerAIHandlers(): void {
  if (aiHandlersRegistered) return;
  const secretStore = new AISecretStoreImpl({
    storageDir: userData.root(),
    platform: process.platform,
    safeStorage,
  });
  const client = new TrustedAIClient({
    getApiBaseUrl: () => currentApiBaseUrl,
    trustToken: desktopTrustToken,
    secretStore,
  });
  registerAIIPCHandlers({ ipcMain, secretStore, client });
  aiHandlersRegistered = true;
}

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
    // macOS Split View requires a window's minWidth to fit half a typical
    // display (~640pt logical on a 13" Retina screen) — 880 was wide
    // enough that macOS refused to place the window into Split View at
    // all ("無法使用於此分割顯示"), not just laid it out awkwardly.
    minWidth: 600,
    minHeight: 600,
    title: "AnvilNote",
    icon: appIconPath(),
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

  // window.open()/target="_blank" (e.g. the update-available link) would
  // otherwise open a bare, unmanaged BrowserWindow. Send it to the OS browser
  // instead.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  disableWindowZoom(mainWindow);

  void loadAppContent(mainWindow);
}

// Locks out Electron's page zoom: trackpad pinch (setVisualZoomLevelLimits)
// plus the default menu's Cmd/Ctrl +/-/0 accelerators (rebuilt without the
// zoom roles below). The editor has its own CSS-driven zoom that never
// touches webFrame zoom, so it keeps working untouched.
function disableWindowZoom(win: BrowserWindow): void {
  win.webContents.setVisualZoomLevelLimits(1, 1);
}

// Electron's default application menu wires Cmd/Ctrl+Plus/Minus/0 to page
// zoom via the "zoomIn"/"zoomOut"/"resetZoom" roles. Rebuild the same default
// View menu without them so the rest of the menu (reload, devtools,
// fullscreen, standard Edit/Window menus) is untouched.
function installMenuWithoutZoom(): void {
  const isMac = process.platform === "darwin";
  const viewMenu: Electron.MenuItemConstructorOptions = {
    label: "View",
    submenu: [
      { role: "reload" },
      { role: "forceReload" },
      { role: "toggleDevTools" },
      { type: "separator" },
      { role: "togglefullscreen" },
    ],
  };
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [{ role: "appMenu" } as Electron.MenuItemConstructorOptions]
      : []),
    { role: "fileMenu" },
    { role: "editMenu" },
    viewMenu,
    { role: "windowMenu" },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
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
  installMenuWithoutZoom();
  registerApiRequestRouting();
  registerAIHandlers();

  // 1. API sidecar (SQLite under ~/.anvilnote). Required in production.
  let apiBaseUrl = currentApiBaseUrl;
  const webOrigin = `http://127.0.0.1:${webPort}`;
  try {
    const api = await startLocalApi(apiPort, webOrigin, desktopTrustToken);
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
      // Open the workspace directly. The marketing landing lives at the locale
      // root (/<locale>); the desktop app skips it. next-intl middleware
      // prefixes the default locale, so /documents -> /<locale>/documents.
      appUrl = `${web.baseUrl}/documents`;
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

registerExportDialogHandlers(() => mainWindow);

// app.getVersion() reads the packaged app's own version (from package.json,
// baked in by electron-builder) — the reliable source, unlike an env var that
// nothing actually sets at build time.
ipcMain.on("anvilnote:get-app-version", (event) => {
  event.returnValue = app.getVersion();
});

log.info(
  `AnvilNote Desktop starting (packaged=${isPackaged()}, apiPort=${apiPort}, webPort=${webPort})`,
);
