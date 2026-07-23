import fs from "node:fs";
import path from "node:path";

function walk(current, found) {
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    const fullPath = path.join(current, entry.name);
    const lowerName = entry.name.toLowerCase();

    if (entry.isDirectory() && lowerName.endsWith(".app")) {
      found.apps.push(fullPath);
      continue;
    }
    if (entry.isDirectory()) {
      walk(fullPath, found);
      continue;
    }
    if (entry.isFile() && lowerName.endsWith(".dmg")) found.dmgs.push(fullPath);
    if (entry.isFile() && lowerName.endsWith(".pkg")) found.pkgs.push(fullPath);
  }
}

export function findMacArtifacts(releaseDir) {
  if (!fs.existsSync(releaseDir)) {
    throw new Error(`macOS release directory does not exist: ${releaseDir}`);
  }

  const found = { apps: [], dmgs: [], pkgs: [] };
  walk(releaseDir, found);
  found.apps.sort();
  found.dmgs.sort();
  found.pkgs.sort();
  return found;
}

export function requireMacArtifacts(found) {
  if (found.apps.length === 0) throw new Error("no packaged .app was found");
  if (found.dmgs.length === 0) throw new Error("no .dmg artifact was found");
  if (found.pkgs.length === 0) throw new Error("no .pkg artifact was found");
}
