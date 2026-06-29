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
  versions: {
    app: process.env.ANVILNOTE_APP_VERSION ?? "0.0.0",
    electron: process.versions.electron,
    node: process.versions.node,
    chrome: process.versions.chrome,
  },
};

contextBridge.exposeInMainWorld("anvilnote", api);

export type AnvilnoteBridge = typeof api;
