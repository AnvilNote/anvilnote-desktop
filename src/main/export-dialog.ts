// Native folder picker + writer for the "export to a folder" feature.
//
// Why this exists: the web app's default path uses the browser's File System
// Access API (showDirectoryPicker), but Chromium hard-blocks well-known
// folders (Downloads, Desktop, Documents, the home dir, …) from that picker —
// exactly the folders users most want to export into. That block is baked
// into Chromium itself and can't be worked around from the renderer.
//
// The desktop shell isn't limited by that: Electron's own dialog.showOpenDialog
// has no such blocklist. So on desktop we bypass the browser API entirely and
// let the renderer ask the main process to (a) show a native folder picker and
// (b) write files by absolute path, via IPC.

import { dialog, ipcMain, type BrowserWindow } from "electron";
import fs from "node:fs/promises";
import path from "node:path";

/** A path segment must be a plain name — no separators, no "..", not empty. */
function isSafeSegment(segment: unknown): segment is string {
  return (
    typeof segment === "string" &&
    segment.length > 0 &&
    segment !== "." &&
    segment !== ".." &&
    !segment.includes("/") &&
    !segment.includes("\\")
  );
}

export function registerExportDialogHandlers(getWindow: () => BrowserWindow | null): void {
  ipcMain.handle("anvilnote:pick-export-dir", async () => {
    const win = getWindow();
    const result = win
      ? await dialog.showOpenDialog(win, { properties: ["openDirectory", "createDirectory"] })
      : await dialog.showOpenDialog({ properties: ["openDirectory", "createDirectory"] });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle(
    "anvilnote:write-export-file",
    async (_event, dirPath: unknown, segments: unknown, data: unknown) => {
      if (typeof dirPath !== "string" || !dirPath) {
        throw new Error("Invalid export directory");
      }
      if (!Array.isArray(segments) || segments.length === 0 || !segments.every(isSafeSegment)) {
        throw new Error("Invalid export file path");
      }
      if (!(data instanceof Uint8Array)) {
        throw new Error("Invalid export file data");
      }

      const dest = path.join(dirPath, ...(segments as string[]));
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.writeFile(dest, Buffer.from(data));
      return dest;
    },
  );
}
