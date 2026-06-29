import { config, buildSibling, logStep } from "./load-env.mjs";

const c = config();
logStep("Building anvilnote-api");
buildSibling("anvilnote-api", c.apiDir);
