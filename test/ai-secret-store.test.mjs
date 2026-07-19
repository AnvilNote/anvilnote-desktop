import assert from "node:assert/strict";
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

function createProfileApi() {
  const profiles = [];
  const requests = [];
  const fetch = async (url, init = {}) => {
    const target = new URL(url);
    const headers = new Headers(init.headers);
    assert.equal(headers.get("x-anvilnote-desktop-token"), "launch-token");
    const body = init.body ? JSON.parse(init.body) : undefined;
    requests.push({ pathname: target.pathname, body });
    const json = (data, status = 200) => new Response(JSON.stringify({ data }), { status });
    if (target.pathname === "/api/ai/key-profiles" && init.method === "GET") {
      return json(
        profiles.map(({ encryptedSecret: _encryptedSecret, ...profile }) => profile),
      );
    }
    if (target.pathname === "/api/ai/key-profiles" && init.method === "POST") {
      const profile = {
        id: `profile-${profiles.length + 1}`,
        ...body,
        display: `OpenAI · ${body.safeDisplayPrefix}****${body.lastFour}`,
        createdAt: "2026-07-19T00:00:00.000Z",
        updatedAt: "2026-07-19T00:00:00.000Z",
      };
      if (profile.isActive) {
        profiles.forEach((candidate) => {
          if (candidate.providerId === profile.providerId) candidate.isActive = false;
        });
      }
      profiles.push(profile);
      const { encryptedSecret: _encryptedSecret, ...safe } = profile;
      return json(safe, 201);
    }
    if (target.pathname === "/api/ai/key-profiles/active/openai/secret") {
      const active = profiles.find((profile) => profile.providerId === "openai" && profile.isActive);
      return active
        ? json({ id: active.id, providerId: active.providerId, encryptedSecret: active.encryptedSecret })
        : json({ code: "invalid_api_key" }, 404);
    }
    throw new Error(`Unexpected request: ${init.method} ${target.pathname}`);
  };
  return { fetch, profiles, requests };
}

function createStore(options = {}) {
  const api = options.api ?? createProfileApi();
  return {
    api,
    store: new AISecretStoreImpl({
      platform: options.platform ?? "darwin",
      safeStorage: options.safeStorage ?? fakeSafeStorage(),
      getApiBaseUrl: () => "http://127.0.0.1:38317",
      trustToken: "launch-token",
      fetch: api.fetch,
    }),
  };
}

test("secure store persists only safeStorage ciphertext through the trusted profile API", async () => {
  const { store, api } = createStore();
  const saved = await store.saveProfile("openai", {
    label: "Personal",
    secret: "  sk-proj-test-ending-5YA_  ",
    isActive: true,
  });
  assert.equal(saved.display, "OpenAI · sk-proj-****5YA_");
  assert.equal(JSON.stringify(saved).includes("sk-proj-test"), false);
  assert.equal(await store.getForTrustedExecution("openai"), "sk-proj-test-ending-5YA_");
  assert.equal(JSON.stringify(api.profiles).includes("sk-proj-test"), false);
  assert.equal(JSON.stringify(api.requests).includes("sk-proj-test"), false);
  assert.equal(api.requests.some((request) => request.pathname.endsWith("/secret")), true);
});

test("unavailable encryption refuses persistence without leaking the plaintext key", async () => {
  const { store, api } = createStore({ safeStorage: fakeSafeStorage({ available: false }) });
  await assert.rejects(
    () => store.saveProfile("openai", {
      label: "Never saved",
      secret: "sk-never-in-error-1234",
      isActive: true,
    }),
    (error) => {
      assert.doesNotMatch(String(error), /sk-never-in-error/);
      return true;
    },
  );
  assert.equal(api.requests.length, 0);
  assert.equal((await store.getStatus("openai")).storage, "unavailable");
});

test("Linux basic_text keeps keys in session memory and never calls the profile API", async () => {
  const { store, api } = createStore({
    platform: "linux",
    safeStorage: fakeSafeStorage({ backend: "basic_text" }),
  });
  const saved = await store.saveProfile("openai", {
    label: "Session",
    secret: "sk-session-ending-5678",
    isActive: true,
  });
  assert.equal(saved.display, "OpenAI · sk-****5678");
  assert.equal(await store.getForTrustedExecution("openai"), "sk-session-ending-5678");
  assert.deepEqual(api.requests, []);
});

test("corrupted database ciphertext fails closed without exposing a secret", async () => {
  const { store, api } = createStore();
  api.profiles.push({
    id: "profile-corrupt",
    providerId: "openai",
    label: "Corrupt",
    encryptedSecret: Buffer.from("bad").toString("base64"),
    safeDisplayPrefix: "sk-",
    lastFour: "0000",
    display: "OpenAI · sk-****0000",
    isActive: true,
    createdAt: "2026-07-19T00:00:00.000Z",
    updatedAt: "2026-07-19T00:00:00.000Z",
  });
  assert.equal(await store.getForTrustedExecution("openai"), null);
  assert.equal((await store.getStatus("openai")).configured, false);
});
