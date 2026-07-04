// Preload script. Runs with context isolation; it exposes a tiny, explicit
// surface to the renderer instead of leaking Node into the page.

import { contextBridge } from "electron";
import { ipcRenderer } from "electron";

const api = {
  // The local API base URL is provided to the renderer through a global so the
  // web app can target the bundled sidecar instead of a remote server.
  getApiBaseUrl(): string | null {
    try {
      return ipcRenderer.sendSync("anvilnote:get-api-base-url") ?? null;
    } catch {
      return null;
    }
  },
  getAppVersion(): string | null {
    try {
      return ipcRenderer.sendSync("anvilnote:get-app-version") ?? null;
    } catch {
      return null;
    }
  },
  // Native folder picker + writer for "export to a folder", bypassing the
  // browser's File System Access API — Chromium refuses to let that API pick
  // Downloads/Desktop/Documents/the home dir, but Electron's own dialog has no
  // such blocklist.
  pickExportDir(): Promise<string | null> {
    return ipcRenderer.invoke("anvilnote:pick-export-dir");
  },
  writeExportFile(
    dirPath: string,
    segments: string[],
    data: Uint8Array,
  ): Promise<string> {
    return ipcRenderer.invoke("anvilnote:write-export-file", dirPath, segments, data);
  },
  versions: {
    electron: process.versions.electron,
    node: process.versions.node,
    chrome: process.versions.chrome,
  },
};

contextBridge.exposeInMainWorld("anvilnote", api);

export type AnvilnoteBridge = typeof api;
