import { config, buildSibling, logStep } from "./load-env.mjs";

const c = config();
logStep("Building anvilnote-renderer");
buildSibling("anvilnote-renderer", c.rendererDir);
