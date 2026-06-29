import fs from "node:fs";
import path from "node:path";

export function copyDirectoryResolved(src, dest) {
  fs.rmSync(dest, { recursive: true, force: true });
  copyResolved(src, dest);
}

function copyResolved(src, dest) {
  const stats = fs.lstatSync(src);

  if (stats.isSymbolicLink()) {
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
