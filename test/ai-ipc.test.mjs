import assert from "node:assert/strict";
import test from "node:test";
import {
  AI_IPC_CHANNELS,
  registerAIIPCHandlers,
} from "../dist/main/ai/ai-ipc.js";

function setup() {
  const handlers = new Map();
  const secretStore = {
    async getStatus() {
      return {
        configured: true,
        lastFour: "1234",
        updatedAt: "2026-07-19T00:00:00.000Z",
        storage: "os-secure-storage",
      };
    },
    async save(_providerId, secret) {
      return { configured: true, lastFour: secret.slice(-4), storage: "os-secure-storage" };
    },
    async remove() {},
    async getForTrustedExecution() {
      return "secret-only-main-can-read";
    },
  };
  const client = {
    async testConnection(input) {
      return { status: "success", provider: input.providerId, model: input.model, messageKey: "ok" };
    },
    async estimate() {
      return { approximate: true };
    },
    async execute() {
      return { kind: "compose" };
    },
    async cancel() {
      return true;
    },
  };
  registerAIIPCHandlers({
    ipcMain: { handle: (channel, listener) => handlers.set(channel, listener) },
    secretStore,
    client,
  });
  return handlers;
}

test("IPC surface has no getApiKey operation and status never returns a full secret", async () => {
  const handlers = setup();
  assert.equal([...handlers.keys()].some((channel) => /get-?api-?key/i.test(channel)), false);
  const result = await handlers.get(AI_IPC_CHANNELS.credentialStatus)(null, "openai");
  assert.equal(result.ok, true);
  assert.doesNotMatch(JSON.stringify(result), /secret-only-main-can-read/);
});

test("runtime capability reflects the actual secure-storage backend", async () => {
  const handlers = setup();
  const result = await handlers.get(AI_IPC_CHANNELS.capabilities)(null);
  assert.deepEqual(result, {
    ok: true,
    data: {
      runtime: "desktop",
      persistentCredentialStorage: true,
      sessionCredentialStorage: false,
      smartModeAvailable: true,
    },
  });
});

test("IPC validates provider and credential input and returns safe errors", async () => {
  const handlers = setup();
  const invalid = await handlers.get(AI_IPC_CHANNELS.saveCredential)(null, {
    providerId: "anthropic",
    apiKey: "sk-should-not-appear",
  });
  assert.equal(invalid.ok, false);
  assert.doesNotMatch(JSON.stringify(invalid), /sk-should-not-appear/);
});

test("connection test bridge accepts an unsaved key without echoing it", async () => {
  const handlers = setup();
  const result = await handlers.get(AI_IPC_CHANNELS.testConnection)(null, {
    providerId: "openai",
    model: "gpt-5.6-terra",
    apiKey: "sk-unsaved",
  });
  assert.equal(result.ok, true);
  assert.doesNotMatch(JSON.stringify(result), /sk-unsaved/);
});
