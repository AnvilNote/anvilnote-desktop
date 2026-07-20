import { config, logStep, run } from "./load-env.mjs";

const c = config();
logStep("Building anvilnote-web");
run("pnpm", ["build:desktop"], c.webDir);
