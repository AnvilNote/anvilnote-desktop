// Launches the bundled anvilnote-api as a local sidecar.
//
// Design constraints:
//   - No system Node.js required: we reuse Electron itself as the Node runtime
//     via ELECTRON_RUN_AS_NODE=1 and process.execPath.
//   - Bind to 127.0.0.1 only. Never 0.0.0.0, never an externally reachable port.
//   - The child is tracked and killed on quit so no zombie process survives.
//
// Contract expected from anvilnote-api (see README "Runtime contract"): a
// production entry that honours HOST / PORT and the ANVILNOTE_* env below.

import { spawn, type ChildProcess } from "node:child_process";
import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import { runtimePaths } from "./paths.js";
import {
  resolveTypstBinaryPath,
  resolveBundledFontDir,
  resolveBundledTemplateDir,
} from "./typst.js";
import { createLogger } from "./logger.js";

const log = createLogger("local-api");

const HOST = "127.0.0.1";
const STARTUP_TIMEOUT_MS = 15_000;

export type LocalApi = {
  child: ChildProcess;
  host: string;
  port: number;
  baseUrl: string;
};

let current: LocalApi | null = null;

/** The bundled API entry point. anvilnote-api builds to dist/server.js. */
function resolveApiEntry(): string {
  const entry = path.join(runtimePaths.api(), "dist", "server.js");
  if (!fs.existsSync(entry)) {
    throw new Error(
      `Bundled API entry not found at "${entry}". Run \`pnpm prepare:desktop\` ` +
        `(or ensure the packaged build copied anvilnote-api into resources/api).`,
    );
  }
  return entry;
}

/** Resolve once so failures surface as clear errors before spawning. */
function buildChildEnv(port: number): NodeJS.ProcessEnv {
  const typstPath = resolveTypstBinaryPath();
  const fontDir = resolveBundledFontDir();
  const templateDir = resolveBundledTemplateDir();

  return {
    ...process.env,
    ELECTRON_RUN_AS_NODE: "1",
    NODE_ENV: "production",
    HOST,
    PORT: String(port),
    ANVILNOTE_RENDERER_DIR: runtimePaths.renderer(),
    // The renderer reads TYPST_BIN; we also expose ANVILNOTE_TYPST_PATH for the
    // API contract. Keep both in sync.
    ANVILNOTE_TYPST_PATH: typstPath,
    TYPST_BIN: typstPath,
    ANVILNOTE_FONT_DIR: fontDir,
    ANVILNOTE_TEMPLATE_DIR: templateDir,
  };
}

/** Poll until the API accepts a TCP connection on 127.0.0.1:port, or time out. */
function waitForPort(port: number, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const socket = net.connect({ host: HOST, port });
      socket.once("connect", () => {
        socket.destroy();
        resolve();
      });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() > deadline) {
          reject(new Error(`API did not open ${HOST}:${port} within ${timeoutMs}ms`));
        } else {
          setTimeout(tryOnce, 250);
        }
      });
    };
    tryOnce();
  });
}

export async function startLocalApi(port: number): Promise<LocalApi> {
  if (current) return current;

  const entry = resolveApiEntry();
  const env = buildChildEnv(port);

  log.info(`starting API sidecar: ${entry} on ${HOST}:${port}`);
  const child = spawn(process.execPath, [entry], {
    cwd: runtimePaths.api(),
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout?.on("data", (b: Buffer) => log.info(`[api] ${b.toString().trimEnd()}`));
  child.stderr?.on("data", (b: Buffer) => log.warn(`[api] ${b.toString().trimEnd()}`));
  child.on("exit", (code, signal) => {
    log.warn(`API sidecar exited (code=${code} signal=${signal})`);
    if (current?.child === child) current = null;
  });

  try {
    await waitForPort(port, STARTUP_TIMEOUT_MS);
  } catch (err) {
    child.kill("SIGKILL");
    throw err;
  }

  current = { child, host: HOST, port, baseUrl: `http://${HOST}:${port}` };
  log.info(`API sidecar ready at ${current.baseUrl}`);
  return current;
}

/** Kill the sidecar. Safe to call multiple times / when not started. */
export function stopLocalApi(): void {
  if (!current) return;
  log.info("stopping API sidecar");
  current.child.kill("SIGTERM");
  // Hard stop if it ignores SIGTERM, so the app can quit without a zombie.
  const child = current.child;
  setTimeout(() => {
    if (!child.killed) child.kill("SIGKILL");
  }, 2_000);
  current = null;
}
