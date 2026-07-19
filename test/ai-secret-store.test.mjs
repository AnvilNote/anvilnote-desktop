import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { AISecretStoreImpl } from "../dist/main/ai/ai-secret-store.js";

function fakeSafeStorage(options = {}) {
  return {
    isEncryptionAvailable: () => options.available ?? true,
    getSelectedStorageBackend: () => options.backend ?? "unknown",
    encryptString: (value) => Buffer.from(`encrypted:${value}`, "utf8"),
    decryptString: (value) => {
      const text = Buffer.from(value).toString("utf8");
      if (!text.startsWith("encrypted:")) throw new Error("corrupt");
      return text.slice("encrypted:".length);
    },
  };
}

async function withStore(options, run) {
  const storageDir = await fs.mkdtemp(path.join(os.tmpdir(), "anvilnote-ai-store-"));
  try {
    await run(
      new AISecretStoreImpl({
        storageDir,
        platform: options.platform ?? "darwin",
        safeStorage: options.safeStorage ?? fakeSafeStorage(),
      }),
      storageDir,
    );
  } finally {
    await fs.rm(storageDir, { recursive: true, force: true });
  }
}

test("secure store saves masked status, decrypts only for trusted execution, and removes", async () => {
  await withStore({}, async (store) => {
    const saved = await store.save("openai", "  sk-fake-ending-1234  ");
    assert.deepEqual(saved.configured, true);
    assert.equal(saved.lastFour, "1234");
    assert.equal(saved.storage, "os-secure-storage");
    assert.equal("secret" in saved, false);
    assert.equal(await store.getForTrustedExecution("openai"), "sk-fake-ending-1234");
    await store.remove("openai");
    assert.equal((await store.getStatus("openai")).configured, false);
  });
});

test("unavailable encryption refuses persistence without leaking the secret", async () => {
  await withStore(
    { safeStorage: fakeSafeStorage({ available: false }) },
    async (store) => {
      await assert.rejects(() => store.save("openai", "sk-never-in-error"), (error) => {
        assert.doesNotMatch(String(error), /sk-never-in-error/);
        return true;
      });
      assert.equal((await store.getStatus("openai")).storage, "unavailable");
    },
  );
});

test("Linux basic_text backend uses session-only memory and never writes a blob", async () => {
  await withStore(
    {
      platform: "linux",
      safeStorage: fakeSafeStorage({ backend: "basic_text" }),
    },
    async (store, storageDir) => {
      const status = await store.save("openai", "sk-session-5678");
      assert.equal(status.storage, "session-only");
      assert.equal(await store.getForTrustedExecution("openai"), "sk-session-5678");
      assert.deepEqual(await fs.readdir(storageDir), []);
    },
  );
});

test("corrupted encrypted blobs fail closed", async () => {
  await withStore({}, async (store, storageDir) => {
    await fs.mkdir(path.join(storageDir, "ai-credentials"), { recursive: true });
    await fs.writeFile(
      path.join(storageDir, "ai-credentials", "openai.json"),
      JSON.stringify({
        version: 1,
        providerId: "openai",
        encrypted: Buffer.from("bad").toString("base64"),
        lastFour: "0000",
        updatedAt: new Date().toISOString(),
      }),
    );
    assert.equal((await store.getStatus("openai")).configured, false);
    assert.equal(await store.getForTrustedExecution("openai"), null);
  });
});
