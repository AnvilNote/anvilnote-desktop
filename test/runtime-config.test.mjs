import test from "node:test";
import assert from "node:assert/strict";

import {
  buildApiBaseUrlArg,
  readApiBaseUrlFromArgv,
  resolveSidecarExecPath,
} from "../dist/main/runtime-config.js";

test("buildApiBaseUrlArg round-trips through argv parsing", () => {
  const apiBaseUrl = "http://127.0.0.1:38317";
  const arg = buildApiBaseUrlArg(apiBaseUrl);

  assert.equal(readApiBaseUrlFromArgv(["electron", "app", arg]), apiBaseUrl);
});

test("readApiBaseUrlFromArgv returns null when no argument exists", () => {
  assert.equal(readApiBaseUrlFromArgv(["electron", "app"]), null);
  assert.equal(
    readApiBaseUrlFromArgv(["electron", "app", "--anvilnote-api-base-url="]),
    null,
  );
});

test("resolveSidecarExecPath prefers helper executable when available", () => {
  assert.equal(
    resolveSidecarExecPath({
      execPath: "/Applications/AnvilNote.app/Contents/MacOS/AnvilNote",
      helperExecPath:
        "/Applications/AnvilNote.app/Contents/Frameworks/AnvilNote Helper.app/Contents/MacOS/AnvilNote Helper",
    }),
    "/Applications/AnvilNote.app/Contents/Frameworks/AnvilNote Helper.app/Contents/MacOS/AnvilNote Helper",
  );
  assert.equal(
    resolveSidecarExecPath({
      execPath: "/Applications/AnvilNote.app/Contents/MacOS/AnvilNote",
      helperExecPath: "",
    }),
    "/Applications/AnvilNote.app/Contents/MacOS/AnvilNote",
  );
});
