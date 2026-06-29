// Launches the bundled Next.js web app as a local server sidecar.
//
// We use Next's standalone output (server.js) and run it with Electron itself as
// the Node runtime (ELECTRON_RUN_AS_NODE=1), so users need no system Node. The
// server binds 127.0.0.1 only; Electron then loads http://127.0.0.1:<port>.

import { spawn, type ChildProcess } from "node:child_process";
import net from "node:net";
import fs from "node:fs";
import { webServerEntry } from "./paths.js";
import { createLogger } from "./logger.js";

const log = createLogger("local-web");

const HOST = "127.0.0.1";
const STARTUP_TIMEOUT_MS = 20_000;

export type LocalWeb = {
  child: ChildProcess;
  host: string;
  port: number;
  baseUrl: string;
};

let current: LocalWeb | null = null;

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
          reject(new Error(`Web server did not open ${HOST}:${port} within ${timeoutMs}ms`));
        } else {
          setTimeout(tryOnce, 250);
        }
      });
    };
    tryOnce();
  });
}

export async function startLocalWeb(
  port: number,
  apiBaseUrl: string,
): Promise<LocalWeb> {
  if (current) return current;

  const entry = webServerEntry();
  if (!fs.existsSync(entry)) {
    throw new Error(
      `Bundled web server not found at "${entry}". Run \`pnpm prepare:desktop\` ` +
        `(it stages the Next standalone build into resources/web).`,
    );
  }

  log.info(`starting web sidecar: ${entry} on ${HOST}:${port}`);
  const child = spawn(process.execPath, [entry], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      HOSTNAME: HOST,
      PORT: String(port),
      // Build-time fallback the client uses when the preload bridge is absent.
      NEXT_PUBLIC_API_URL: apiBaseUrl,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout?.on("data", (b: Buffer) => log.info(`[web] ${b.toString().trimEnd()}`));
  child.stderr?.on("data", (b: Buffer) => log.warn(`[web] ${b.toString().trimEnd()}`));
  child.on("exit", (code, signal) => {
    log.warn(`web sidecar exited (code=${code} signal=${signal})`);
    if (current?.child === child) current = null;
  });

  try {
    await waitForPort(port, STARTUP_TIMEOUT_MS);
  } catch (err) {
    child.kill("SIGKILL");
    throw err;
  }

  current = { child, host: HOST, port, baseUrl: `http://${HOST}:${port}` };
  log.info(`web sidecar ready at ${current.baseUrl}`);
  return current;
}

export function stopLocalWeb(): void {
  if (!current) return;
  log.info("stopping web sidecar");
  const child = current.child;
  child.kill("SIGTERM");
  setTimeout(() => {
    if (!child.killed) child.kill("SIGKILL");
  }, 2_000);
  current = null;
}
