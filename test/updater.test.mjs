import assert from "node:assert/strict";
import test from "node:test";
import { AppUpdaterController, UPDATE_IPC_CHANNELS, registerUpdaterIPCHandlers } from "../dist/main/updater.js";

// Minimal fake mirroring electron-updater's autoUpdater surface: an event
// emitter plus checkForUpdates/downloadUpdate/quitAndInstall. Tests drive it
// by calling `emit(event, payload)` directly instead of a real network check.
function fakeUpdater() {
  const listeners = new Map();
  const calls = { check: 0, download: 0, install: 0 };
  return {
    calls,
    on(event, listener) {
      const list = listeners.get(event) ?? [];
      list.push(listener);
      listeners.set(event, list);
    },
    emit(event, payload) {
      for (const listener of listeners.get(event) ?? []) listener(payload);
    },
    async checkForUpdates() {
      calls.check += 1;
    },
    async downloadUpdate() {
      calls.download += 1;
    },
    quitAndInstall() {
      calls.install += 1;
    },
  };
}

function fakeSender() {
  const sent = [];
  return { sent, send: (channel, payload) => sent.push([channel, payload]) };
}

test("forwards checking/available/not-available/error status to the renderer", () => {
  const updater = fakeUpdater();
  const sender = fakeSender();
  new AppUpdaterController(updater, () => sender);

  updater.emit("checking-for-update");
  updater.emit("update-available", { version: "0.1.19" });
  updater.emit("update-not-available", { version: "0.1.18" });
  updater.emit("error", new Error("network down"));

  assert.deepEqual(sender.sent, [
    [UPDATE_IPC_CHANNELS.status, { state: "checking" }],
    [UPDATE_IPC_CHANNELS.status, { state: "available", version: "0.1.19" }],
    [UPDATE_IPC_CHANNELS.status, { state: "not-available" }],
    [UPDATE_IPC_CHANNELS.status, { state: "error", message: "network down" }],
  ]);
});

test("rounds download-progress percent and forwards update-downloaded version", () => {
  const updater = fakeUpdater();
  const sender = fakeSender();
  new AppUpdaterController(updater, () => sender);

  updater.emit("download-progress", { percent: 42.7 });
  updater.emit("update-downloaded", { version: "0.1.19" });

  assert.deepEqual(sender.sent, [
    [UPDATE_IPC_CHANNELS.status, { state: "downloading", percent: 43 }],
    [UPDATE_IPC_CHANNELS.status, { state: "downloaded", version: "0.1.19" }],
  ]);
});

test("does nothing when no window/sender is currently available", () => {
  const updater = fakeUpdater();
  new AppUpdaterController(updater, () => null);
  assert.doesNotThrow(() => updater.emit("checking-for-update"));
});

test("check/download/install delegate to the underlying updater", async () => {
  const updater = fakeUpdater();
  const controller = new AppUpdaterController(updater, () => null);

  await controller.check();
  await controller.download();
  controller.install();

  assert.deepEqual(updater.calls, { check: 1, download: 1, install: 1 });
});

test("registerUpdaterIPCHandlers wires the three request channels to the controller", () => {
  const updater = fakeUpdater();
  const controller = new AppUpdaterController(updater, () => null);
  const handlers = new Map();
  const ipcMain = { handle: (channel, listener) => handlers.set(channel, listener) };

  registerUpdaterIPCHandlers(ipcMain, controller);
  assert.equal(handlers.size, 3);

  handlers.get(UPDATE_IPC_CHANNELS.check)();
  handlers.get(UPDATE_IPC_CHANNELS.download)();
  handlers.get(UPDATE_IPC_CHANNELS.install)();

  assert.deepEqual(updater.calls, { check: 1, download: 1, install: 1 });
});
