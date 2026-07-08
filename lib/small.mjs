// Tier-3 router for SMALL tasks (meta tags, subject polish, classification, FAQ snippets).
// Prefers MiniMax (cheap worker); falls back to GLM-5.2 if MINIMAX_API_KEY is absent or errors.
// This is the "smaller tasks on MiniMax" path (mirrors opencode+MiniMax delegation).
import * as minimax from "./minimax.mjs";
import { generateWithModel } from "../integrations/glm_generate.mjs";

export async function smallTask(prompt, opts = {}) {
  if (minimax.available()) {
    try { return { text: await minimax.generate(prompt, opts), model: "MiniMax" }; }
    catch (e) { /* fall through to the NVIDIA failover chain */ }
  }
  const r = await generateWithModel(prompt, opts);   // tries GLM-5.2 → llama-70b → llama-8b
  return { text: r.text, model: r.model + (r.failedOver ? " (failover)" : "") };
}
