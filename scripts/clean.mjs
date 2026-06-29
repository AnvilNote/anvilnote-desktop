// Safe cleaner: removes only build output INSIDE this repo (dist, release,
// .tmp). It never touches sibling repos or anything outside the repo root.
import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Only these top-level directories, resolved relative to the repo root, may be
// deleted. Anything that escapes the repo root is refused.
const TARGETS = ["dist", "release", ".tmp"];

for (const target of TARGETS) {
  const abs = path.resolve(repoRoot, target);
  const rel = path.relative(repoRoot, abs);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    console.error(`refusing to delete outside repo root: ${abs}`);
    process.exitCode = 1;
    continue;
  }
  await rm(abs, { recursive: true, force: true });
  console.log(`cleaned ${target}/`);
}
