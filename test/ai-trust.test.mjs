import assert from "node:assert/strict";
import test from "node:test";
import {
  createDesktopTrustToken,
  isAllowedAIPath,
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
  assert.equal(isAllowedAIPath("/api/documents"), false);
  assert.equal(isAllowedAIPath("https://evil.example/"), false);
});

test("safe proxy errors do not serialize credentials or trust tokens", () => {
  const error = toSafeAIProxyError(new Error("sk-secret trust-token"));
  assert.doesNotMatch(JSON.stringify(error), /sk-secret|trust-token/);
});
