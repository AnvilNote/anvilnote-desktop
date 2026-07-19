import { config, buildSibling, logStep } from "./load-env.mjs";

const c = config();
logStep("Building anvilnote-ai-writer");
buildSibling("anvilnote-ai-writer", c.aiWriterDir);
