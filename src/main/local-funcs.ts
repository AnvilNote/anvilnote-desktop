// Launches the bundled anvilnote-funcs sidecar (PyInstaller onefile exe).
// Same spawn/waitForPort/stop shape as local-api.ts, but the child is a
// native executable, not a Node script — no ELECTRON_RUN_AS_NODE needed.

import { spawn, type ChildProcess } from "node:child_process";
import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import { runtimePaths } from "./paths.js";
import { resolveTectonicBinaryPath, resolveBundledTectonicCacheDir } from "./tectonic.js";
import { createLogger } from "./logger.js";

const log = createLogger("local-funcs");

const HOST = "127.0.0.1";
const STARTUP_TIMEOUT_MS = 15_000;

export type LocalFuncs = {
  child: ChildProcess;
  host: string;
  port: number;
  baseUrl: string;
};

let current: LocalFuncs | null = null;

function binaryName(): string {
  return process.platform === "win32" ? "anvilnote-funcs.exe" : "anvilnote-funcs";
}

function resolveFuncsEntry(): string {
  const entry = path.join(runtimePaths.funcs(), binaryName());
  if (!fs.existsSync(entry)) {
    throw new Error(
      `Bundled funcs entry not found at "${entry}". Run \`pnpm prepare:desktop\` ` +
        `(or ensure the packaged build copied anvilnote-funcs into resources/funcs).`,
    );
  }
  return entry;
}

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
          reject(new Error(`funcs did not open ${HOST}:${port} within ${timeoutMs}ms`));
        } else {
          setTimeout(tryOnce, 250);
        }
      });
    };
    tryOnce();
  });
}

export async function startLocalFuncs(port: number): Promise<LocalFuncs> {
  if (current) return current;

  const entry = resolveFuncsEntry();
  const env = {
    ...process.env,
    HOST,
    PORT: String(port),
    TECTONIC_BIN: resolveTectonicBinaryPath(),
    TECTONIC_CACHE_DIR: resolveBundledTectonicCacheDir(),
  };

  log.info(`starting funcs sidecar: ${entry} on ${HOST}:${port}`);
  const child = spawn(entry, [], {
    cwd: runtimePaths.funcs(),
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout?.on("data", (b: Buffer) => log.info(`[funcs] ${b.toString().trimEnd()}`));
  child.stderr?.on("data", (b: Buffer) => log.warn(`[funcs] ${b.toString().trimEnd()}`));
  child.on("exit", (code, signal) => {
    log.warn(`funcs sidecar exited (code=${code} signal=${signal})`);
    if (current?.child === child) current = null;
  });

  try {
    await waitForPort(port, STARTUP_TIMEOUT_MS);
  } catch (err) {
    child.kill("SIGKILL");
    throw err;
  }

  current = { child, host: HOST, port, baseUrl: `http://${HOST}:${port}` };
  log.info(`funcs sidecar ready at ${current.baseUrl}`);
  return current;
}

export function stopLocalFuncs(): void {
  if (!current) return;
  log.info("stopping funcs sidecar");
  current.child.kill("SIGTERM");
  const child = current.child;
  setTimeout(() => {
    if (!child.killed) child.kill("SIGKILL");
  }, 2_000);
  current = null;
}
