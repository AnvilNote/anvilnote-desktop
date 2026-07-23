import { config, logStep, run } from "./load-env.mjs";

const c = config();
logStep("Building anvilnote-web");
// The current web repository still exposes `build`; bake the Desktop runtime
// selector into that build explicitly so a future public-web default can never
// be packaged into Electron by accident.
process.env.NEXT_PUBLIC_ANVILNOTE_RUNTIME = "desktop";
run("pnpm", ["build"], c.webDir);
