// In-app auto-update: wraps electron-updater's autoUpdater so the renderer
// gets pushed status events and controls the check/download/install steps
// itself (autoDownload is left off by main.ts) — the user always decides
// when to download and when to restart, per the desktop release notices'
// required update state machine.

export const UPDATE_IPC_CHANNELS = {
  check: "anvilnote:update:check",
  download: "anvilnote:update:download",
  install: "anvilnote:update:install",
  status: "anvilnote:update:status",
} as const;

export type UpdateStatus =
  | { state: "checking" }
  | { state: "available"; version: string }
  | { state: "not-available" }
  | { state: "downloading"; percent: number }
  | { state: "downloaded"; version: string }
  | { state: "error"; message: string };

type UpdaterEvent =
  | "checking-for-update"
  | "update-available"
  | "update-not-available"
  | "download-progress"
  | "update-downloaded"
  | "error";

export interface UpdaterLike {
  on(event: UpdaterEvent, listener: (payload?: unknown) => void): unknown;
  checkForUpdates(): Promise<unknown>;
  downloadUpdate(): Promise<unknown>;
  quitAndInstall(): void;
}

export interface UpdateStatusSender {
  send(channel: string, payload: UpdateStatus): void;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class AppUpdaterController {
  constructor(
    private readonly updater: UpdaterLike,
    private readonly getSender: () => UpdateStatusSender | null,
  ) {
    this.wireEvents();
  }

  private emit(status: UpdateStatus): void {
    this.getSender()?.send(UPDATE_IPC_CHANNELS.status, status);
  }

  private wireEvents(): void {
    this.updater.on("checking-for-update", () => this.emit({ state: "checking" }));
    this.updater.on("update-available", (info) =>
      this.emit({ state: "available", version: (info as { version?: string })?.version ?? "" }),
    );
    this.updater.on("update-not-available", () => this.emit({ state: "not-available" }));
    this.updater.on("download-progress", (progress) =>
      this.emit({
        state: "downloading",
        percent: Math.round((progress as { percent?: number })?.percent ?? 0),
      }),
    );
    this.updater.on("update-downloaded", (info) =>
      this.emit({ state: "downloaded", version: (info as { version?: string })?.version ?? "" }),
    );
    this.updater.on("error", (error) => this.emit({ state: "error", message: messageOf(error) }));
  }

  async check(): Promise<void> {
    await this.updater.checkForUpdates();
  }

  async download(): Promise<void> {
    await this.updater.downloadUpdate();
  }

  install(): void {
    this.updater.quitAndInstall();
  }
}

interface IPCRegistrar {
  handle(channel: string, listener: () => unknown): void;
}

export function registerUpdaterIPCHandlers(
  ipcMain: IPCRegistrar,
  controller: AppUpdaterController,
): void {
  ipcMain.handle(UPDATE_IPC_CHANNELS.check, () => controller.check());
  ipcMain.handle(UPDATE_IPC_CHANNELS.download, () => controller.download());
  ipcMain.handle(UPDATE_IPC_CHANNELS.install, () => controller.install());
}
