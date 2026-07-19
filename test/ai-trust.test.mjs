import assert from "node:assert/strict";
import test from "node:test";
import {
  createDesktopTrustToken,
  isAllowedAIPath,
  TrustedAIClient,
  toSafeAIProxyError,
} from "../dist/main/ai/trusted-ai-client.js";

test("per-launch trust tokens are high entropy and change every time", () => {
  const first = createDesktopTrustToken();
  const second = createDesktopTrustToken();
  assert.notEqual(first, second);
  assert.match(first, /^[a-f0-9]{64}$/);
});

test("trusted AI proxy only permits fixed Smart Mode endpoints", () => {
  assert.equal(isAllowedAIPath("/api/ai/compose"), true);
  assert.equal(isAllowedAIPath("/api/ai/rewrite-selection"), true);
  assert.equal(
    isAllowedAIPath("/api/documents/document-1/ai-conversations/turns"),
    true,
  );
  assert.equal(
    isAllowedAIPath("/api/documents/document-1/ai-conversations/conversation-1/messages"),
    true,
  );
  assert.equal(isAllowedAIPath("/api/documents"), false);
  assert.equal(isAllowedAIPath("https://evil.example/"), false);
});

test("safe proxy errors do not serialize credentials or trust tokens", () => {
  const error = toSafeAIProxyError(new Error("sk-secret trust-token"));
  assert.doesNotMatch(JSON.stringify(error), /sk-secret|trust-token/);
});

test("conversation page proxy preserves only safe cursor metadata", async () => {
  const client = new TrustedAIClient({
    getApiBaseUrl: () => "http://127.0.0.1:4000",
    trustToken: "desktop-trust-token",
    secretStore: { async getForTrustedExecution() { return null; } },
    fetch: async (url, init) => {
      assert.match(String(url), /\/api\/documents\/document-1\/ai-conversations\?cursor=older/);
      assert.equal(init.headers["x-anvilnote-desktop-token"], "desktop-trust-token");
      return new Response(JSON.stringify({
        data: [{ id: "conversation-1", title: "Safe title" }],
        meta: { nextCursor: "next-page" },
      }), { status: 200, headers: { "content-type": "application/json" } });
    },
  });

  assert.deepEqual(await client.listConversations("document-1", "older"), {
    data: [{ id: "conversation-1", title: "Safe title" }],
    nextCursor: "next-page",
  });
});
