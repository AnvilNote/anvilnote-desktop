// One-command Smart Mode development runtime:
//   1. assemble the trusted Desktop sidecars,
//   2. start the sibling Next.js dev server,
//   3. load that server inside Electron so safeStorage and trusted IPC remain
//      available while React/Tiptap keep hot reload.

import net from "node:net";
import { spawn } from "node:child_process";
import { config, fail, logStep, repoRoot, run } from "./load-env.mjs";

const c = config();
const webDevUrl = process.env.ANVILNOTE_WEB_DEV_URL || "http://127.0.0.1:3000";
const parsedWebUrl = new URL(webDevUrl);
const webHost = parsedWebUrl.hostname;
const webPort = Number(parsedWebUrl.port || (parsedWebUrl.protocol === "https:" ? 443 : 80));
const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const children = new Set();
let stopping = false;

function portIsOpen(host, port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function stopChildren() {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
}

function spawnTracked(args, cwd, env = process.env) {
  const child = spawn(command, args, {
    cwd,
    env,
    stdio: "inherit",
    shell: false,
  });
  children.add(child);
  child.once("exit", () => children.delete(child));
  return child;
}

async function waitForWeb(child, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Next.js dev server exited with code ${child.exitCode}.`);
    }
    if (await portIsOpen(webHost, webPort)) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Next.js did not open ${webHost}:${webPort} within ${timeoutMs}ms.`);
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    stopChildren();
    process.exitCode = 130;
  });
}
process.once("exit", stopChildren);

if (await portIsOpen(webHost, webPort)) {
  fail(
    `${webDevUrl} is already in use. Stop the existing Web dev server, then ` +
      "run this command again so Desktop can assemble the matching trusted runtime first.",
  );
}

logStep("Preparing trusted Desktop sidecars for hot development");
run("pnpm", ["prepare:desktop"], repoRoot);
run("pnpm", ["build:main"], repoRoot);

logStep(`Starting Next.js hot reload at ${webDevUrl}`);
const web = spawnTracked(["dev:desktop"], c.webDir);

try {
  await waitForWeb(web);
  logStep("Starting Electron with secure Smart Mode storage");
  const electron = spawnTracked(
    ["exec", "electron", "dist/main/main.js"],
    repoRoot,
    { ...process.env, ANVILNOTE_WEB_DEV_URL: webDevUrl },
  );
  const exitCode = await new Promise((resolve, reject) => {
    electron.once("error", reject);
    electron.once("exit", (code, signal) => {
      if (signal) reject(new Error(`Electron exited after ${signal}.`));
      else resolve(code ?? 1);
    });
  });
  process.exitCode = exitCode;
} catch (error) {
  console.error(`✖ ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  stopChildren();
}
