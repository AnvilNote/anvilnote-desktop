import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { AIAttachmentStore } from "../dist/main/ai/ai-attachment-store.js";

const safeStorage = {
  isEncryptionAvailable: () => true,
  encryptString: (value) => Buffer.from(`sealed:${value}`, "utf8"),
  decryptString: (value) => value.toString("utf8").replace(/^sealed:/u, ""),
};

test("desktop attachment store writes authenticated ciphertext and exposes metadata only", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "anvilnote-ai-attachments-"));
  try {
    const store = new AIAttachmentStore({ rootDir: root, safeStorage });
    const [attachment] = await store.prepare([{
      name: "notes.txt",
      mimeType: "text/plain",
      data: new TextEncoder().encode("private attachment text"),
    }]);

    assert.equal(attachment.originalName, "notes.txt");
    assert.equal(attachment.persisted, true);
    assert.doesNotMatch(JSON.stringify(attachment), /private attachment text|storageKey|sha256/);
    const [prepared] = store.resolve([attachment.id]);
    assert.ok(prepared);
    assert.equal(prepared.storageKey, prepared.sha256);
    const ciphertext = await readFile(path.join(root, "blobs", prepared.sha256.slice(0, 2), `${prepared.sha256}.blob`));
    assert.equal(ciphertext.includes(Buffer.from("private attachment text")), false);
    assert.equal(ciphertext.subarray(0, 8).toString("ascii"), "ANVAI001");
    await store.removeStorageKeys([prepared.storageKey]);
    await assert.rejects(() => readFile(path.join(root, "blobs", prepared.sha256.slice(0, 2), `${prepared.sha256}.blob`)));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("desktop attachment store keeps plaintext in memory when secure storage is unavailable", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "anvilnote-ai-attachments-"));
  try {
    const store = new AIAttachmentStore({
      rootDir: root,
      safeStorage: { ...safeStorage, isEncryptionAvailable: () => false },
    });
    const [attachment] = await store.prepare([{
      name: "notes.md",
      mimeType: "text/markdown",
      data: new TextEncoder().encode("session only"),
    }]);
    assert.equal(attachment.persisted, false);
    assert.deepEqual(store.resolve([attachment.id]), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("desktop attachment store rejects unsupported and oversized input", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "anvilnote-ai-attachments-"));
  try {
    const store = new AIAttachmentStore({ rootDir: root, safeStorage });
    await assert.rejects(() => store.prepare([{ name: "payload.exe", mimeType: "application/octet-stream", data: new Uint8Array([1]) }]));
    await assert.rejects(() => store.prepare([{ name: "large.txt", mimeType: "text/plain", data: new Uint8Array(10_485_761) }]));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
