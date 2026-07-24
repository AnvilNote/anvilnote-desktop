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
    if (entry.isFile() && lowerName.endsWith(".zip")) found.zips.push(fullPath);
  }
}

export function findMacArtifacts(releaseDir) {
  if (!fs.existsSync(releaseDir)) {
    throw new Error(`macOS release directory does not exist: ${releaseDir}`);
  }

  const found = { apps: [], dmgs: [], pkgs: [], zips: [] };
  walk(releaseDir, found);
  found.apps.sort();
  found.dmgs.sort();
  found.pkgs.sort();
  found.zips.sort();
  return found;
}

// A release run can request any subset of dmg/pkg/zip (see release-macos.mjs's
// optional target-list arg, used for a quick "confirm the dmg fix, then build
// the rest" cycle) — so this only requires the app plus at least one
// container, not all three every time.
export function requireMacArtifacts(found) {
  if (found.apps.length === 0) throw new Error("no packaged .app was found");
  if (found.dmgs.length === 0 && found.pkgs.length === 0 && found.zips.length === 0) {
    throw new Error("no .dmg, .pkg, or .zip artifact was found");
  }
}
