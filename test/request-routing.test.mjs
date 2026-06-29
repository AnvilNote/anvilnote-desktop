import test from "node:test";
import assert from "node:assert/strict";

import { rewriteDevApiUrl } from "../dist/main/request-routing.js";

test("rewriteDevApiUrl rewrites localhost:4000 requests to runtime api base url", () => {
  assert.equal(
    rewriteDevApiUrl(
      "http://localhost:4000/api/documents?x=1",
      "http://127.0.0.1:38317",
    ),
    "http://127.0.0.1:38317/api/documents?x=1",
  );
  assert.equal(
    rewriteDevApiUrl(
      "http://127.0.0.1:4000/api/templates",
      "http://127.0.0.1:38317",
    ),
    "http://127.0.0.1:38317/api/templates",
  );
});

test("rewriteDevApiUrl ignores non-dev-api origins", () => {
  assert.equal(
    rewriteDevApiUrl(
      "http://127.0.0.1:38318/api/documents",
      "http://127.0.0.1:38317",
    ),
    null,
  );
});
