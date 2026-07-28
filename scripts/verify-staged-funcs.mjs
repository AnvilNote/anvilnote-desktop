import path from "node:path";

import { config } from "./load-env.mjs";
import {
  assertFuncsBinaryTarget,
  funcsBinaryName,
} from "./funcs-target.mjs";

const platform = process.env.TARGET_PLATFORM ?? process.platform;
const arch = process.env.TARGET_ARCH ?? process.arch;
const c = config();
const binary = path.join(c.appDir, "funcs", funcsBinaryName(platform));

assertFuncsBinaryTarget(binary, platform, arch);
console.log(`funcs sidecar verified for ${platform}-${arch}: ${binary}`);
