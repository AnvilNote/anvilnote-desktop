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
    async listProfiles() {
      return [
        {
          id: "profile-1",
          providerId: "openai",
          label: "Personal",
          display: "OpenAI · sk-****1234",
          isActive: true,
          createdAt: "2026-07-19T00:00:00.000Z",
          updatedAt: "2026-07-19T00:00:00.000Z",
        },
      ];
    },
    async saveProfile(_providerId, input) {
      return {
        id: "profile-2",
        providerId: "openai",
        label: input.label,
        display: "OpenAI · sk-****5678",
        isActive: input.isActive,
        createdAt: "2026-07-19T00:00:00.000Z",
        updatedAt: "2026-07-19T00:00:00.000Z",
      };
    },
    async renameProfile() {
      return { id: "profile-1", providerId: "openai", label: "Renamed", display: "OpenAI · sk-****1234", isActive: true, createdAt: "2026-07-19T00:00:00.000Z", updatedAt: "2026-07-19T00:00:00.000Z" };
    },
    async activateProfile() {
      return { id: "profile-1", providerId: "openai", label: "Personal", display: "OpenAI · sk-****1234", isActive: true, createdAt: "2026-07-19T00:00:00.000Z", updatedAt: "2026-07-19T00:00:00.000Z" };
    },
    async deactivateProfile() {
      return { id: "profile-1", providerId: "openai", label: "Personal", display: "OpenAI · sk-****1234", isActive: false, createdAt: "2026-07-19T00:00:00.000Z", updatedAt: "2026-07-19T00:00:00.000Z" };
    },
    async deleteProfile() {
      return { id: "profile-1" };
    },
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
    async listConversations(documentId) {
      return { documentId, data: [], nextCursor: null };
    },
    async listConversationMessages(documentId, conversationId) {
      return { documentId, conversationId, data: [], nextCursor: null };
    },
    async executeConversationTurn(documentId, request) {
      return { documentId, requestId: request.requestId, data: { conversation: { id: "conversation-1" } } };
    },
    async renameConversation(_documentId, conversationId, title) {
      return { id: conversationId, title };
    },
    async deleteConversation(_documentId, conversationId) {
      return { id: conversationId, orphanedStorageKeys: ["a".repeat(64)] };
    },
  };
  const attachmentStore = {
    async prepare() {
      return [{ id: "attachment-1", originalName: "notes.pdf", mimeType: "application/pdf", sizeBytes: 42, persisted: true }];
    },
    resolve(ids) {
      return ids.map((id) => ({ id, originalName: "notes.pdf", mimeType: "application/pdf", sizeBytes: 42, sha256: "a".repeat(64), storageKey: "a".repeat(64) }));
    },
    consume() {},
    async removeStorageKeys(storageKeys) {
      handlers.removedStorageKeys = storageKeys;
    },
  };
  registerAIIPCHandlers({
    ipcMain: { handle: (channel, listener) => handlers.set(channel, listener) },
    secretStore,
    client,
    attachmentStore,
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

test("key-profile IPC returns masked metadata and never plaintext or ciphertext", async () => {
  const handlers = setup();
  const listed = await handlers.get(AI_IPC_CHANNELS.listKeyProfiles)(null, "openai");
  assert.equal(listed.ok, true);
  assert.match(JSON.stringify(listed), /sk-\*\*\*\*1234/);
  assert.doesNotMatch(JSON.stringify(listed), /secret-only-main-can-read|encryptedSecret/);

  const saved = await handlers.get(AI_IPC_CHANNELS.saveKeyProfile)(null, {
    providerId: "openai",
    label: "New key",
    apiKey: "sk-renderer-must-not-receive-this",
    isActive: true,
  });
  assert.equal(saved.ok, true);
  assert.doesNotMatch(JSON.stringify(saved), /sk-renderer-must-not-receive-this/);
});

test("conversation IPC only permits structured document-scoped operations", async () => {
  const handlers = setup();
  const listed = await handlers.get(AI_IPC_CHANNELS.listConversations)(null, {
    documentId: "document-1",
  });
  assert.deepEqual(listed, {
    ok: true,
    data: { documentId: "document-1", data: [], nextCursor: null },
  });

  const turn = await handlers.get(AI_IPC_CHANNELS.executeConversationTurn)(null, {
    documentId: "document-1",
    request: {
      requestId: "conversation-turn-1",
      provider: { id: "openai", model: "gpt-5.6-terra" },
    },
  });
  assert.equal(turn.ok, true);
  assert.doesNotMatch(JSON.stringify(turn), /secret-only-main-can-read|encryptedSecret/);

  const deleted = await handlers.get(AI_IPC_CHANNELS.deleteConversation)(null, {
    documentId: "document-1",
    conversationId: "conversation-1",
  });
  assert.deepEqual(deleted, { ok: true, data: { id: "conversation-1" } });
  assert.deepEqual(handlers.removedStorageKeys, ["a".repeat(64)]);
  assert.doesNotMatch(JSON.stringify(deleted), /orphanedStorageKeys/);
});

test("attachment IPC exposes safe metadata and injects storage descriptors only in main", async () => {
  const handlers = setup();
  const prepared = await handlers.get(AI_IPC_CHANNELS.prepareAttachments)(null, [{
    name: "notes.pdf",
    mimeType: "application/pdf",
    data: new Uint8Array([1, 2, 3]),
  }]);
  assert.equal(prepared.ok, true);
  assert.doesNotMatch(JSON.stringify(prepared), /storageKey|sha256/);

  const turn = await handlers.get(AI_IPC_CHANNELS.executeConversationTurn)(null, {
    documentId: "document-1",
    request: {
      requestId: "conversation-turn-with-file",
      provider: { id: "openai", model: "gpt-5.6-terra" },
      attachmentIds: ["attachment-1"],
    },
  });
  assert.equal(turn.ok, true);
  assert.doesNotMatch(JSON.stringify(turn), /storageKey|sha256/);
});
