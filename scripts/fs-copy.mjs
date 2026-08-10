import fs from "node:fs";
import path from "node:path";

export function copyDirectoryResolved(src, dest) {
  fs.rmSync(dest, { recursive: true, force: true });
  copyResolved(src, dest);
}

function copyResolved(src, dest) {
  const stats = fs.lstatSync(src);

  if (stats.isSymbolicLink()) {
    // Next's output-file-tracing can leave a symlink pointing at a package
    // version it decided not to actually copy (e.g. a pnpm .pnpm/node_modules
    // convenience link to a version nothing in the traced runtime graph
    // requires) -- confirmed against a real standalone build. Skip rather
    // than crash the whole copy over an entry nothing needs.
    if (!fs.existsSync(src)) {
      console.warn(`  skipping dangling symlink: ${src} -> ${fs.readlinkSync(src)}`);
      return;
    }
    copyResolved(fs.realpathSync(src), dest);
    return;
  }

  if (stats.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyResolved(path.join(src, entry), path.join(dest, entry));
    }
    return;
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}
