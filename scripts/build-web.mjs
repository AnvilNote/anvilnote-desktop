import { config, buildSibling, logStep } from "./load-env.mjs";

const c = config();
logStep("Building anvilnote-web");
buildSibling("anvilnote-web", c.webDir);
