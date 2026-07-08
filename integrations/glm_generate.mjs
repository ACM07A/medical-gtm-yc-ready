// GLM-5.2 tier-2 bulk generation helper (Node, OpenAI-compatible via NVIDIA NIM).
// Reads NVIDIA_API_KEY from env — never hard-code the key.
// Use for BULK, NON-CLINICAL drafting (destination guides, FAQs, meta copy).
// Do NOT route clinical/price claims or patient PII here — those are tier-1 + human gate
// (see /agent-os/07_MODEL_ROUTING.md, /build-os/10_SECURITY_COMPLIANCE.md).
//
//   export NVIDIA_API_KEY=...            # or set in .env and source it
//   node integrations/glm_generate.mjs "Draft a 120-word intro about ..."
//   echo "prompt" | node integrations/glm_generate.mjs

const ENDPOINT = process.env.NVIDIA_BASE_URL
  ? `${process.env.NVIDIA_BASE_URL.replace(/\/$/, "")}/chat/completions`
  : "https://integrate.api.nvidia.com/v1/chat/completions";

// Tier-2 model FAILOVER chain. This is the "handoff" that keeps generation alive when the primary is
// unreachable (GLM-5.2 unserved) OR when Opus/Claude hits its usage limit and Node scripts must carry on
// alone. Tries each model in order; the first that responds within TIER2_TIMEOUT wins. Fully env-tunable:
//   GLM_MODEL       — preferred model (default z-ai/glm-5.2)
//   GLM_FALLBACKS   — comma list tried next (default llama-3.3-70b, llama-3.1-8b)
//   TIER2_TIMEOUT   — per-model ms budget before failing over (default 40000)
const PRIMARY = process.env.GLM_MODEL || process.env.NVIDIA_MODEL || "z-ai/glm-5.2";
const FALLBACKS = (process.env.GLM_FALLBACKS || "meta/llama-3.3-70b-instruct,meta/llama-3.1-8b-instruct")
  .split(",").map((s) => s.trim()).filter(Boolean);
export const MODEL_CHAIN = [PRIMARY, ...FALLBACKS.filter((m) => m !== PRIMARY)];
const PER_MODEL_MS = Number(process.env.TIER2_TIMEOUT) || 40000;

async function callModel(model, key, body, ms) {
  const res = await fetch(ENDPOINT, {
    method: "POST", signal: AbortSignal.timeout(ms),
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, model }),
  });
  if (!res.ok) throw new Error(`${model} HTTP ${res.status}: ${(await res.text()).slice(0, 120)}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error(`${model} returned empty`);
  return text;
}

// Returns the generated string (back-compat). Use generateWithModel() to also learn which model answered.
export async function generate(prompt, opts = {}) {
  return (await generateWithModel(prompt, opts)).text;
}

export async function generateWithModel(prompt, {
  system = "You are a careful medical-travel content writer. Never invent prices, outcomes, or accreditations. State uncertainty plainly.",
  maxTokens = 4096,
  temperature = 0.7,
  models = MODEL_CHAIN,
  timeoutMs = PER_MODEL_MS,
  onFailover = null,
} = {}) {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) throw new Error("NVIDIA_API_KEY not set (see integrations/.env.example)");
  const body = { messages: [{ role: "system", content: system }, { role: "user", content: prompt }], max_tokens: maxTokens, temperature, top_p: 1, stream: false };
  const errors = [];
  for (const model of models) {
    try {
      const text = await callModel(model, key, body, timeoutMs);
      return { text, model, failedOver: model !== models[0], tried: errors.length + 1 };
    } catch (e) {
      errors.push(`${model}: ${e.name === "TimeoutError" ? "timeout" : (e.message || e)}`);
      if (onFailover) onFailover(model, e);
    }
  }
  throw new Error(`tier-2 all models failed → ${errors.join(" | ")}`);
}

// CLI entry (robust on Windows: compare via file URL, not string concat)
import { pathToFileURL } from "node:url";
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = process.argv.slice(2).join(" ").trim();
  const stdin = arg ? "" : await new Promise((r) => {
    let s = ""; process.stdin.on("data", (d) => (s += d)); process.stdin.on("end", () => r(s));
  });
  const prompt = arg || stdin.trim();
  if (!prompt) { console.error("Usage: node glm_generate.mjs \"<prompt>\""); process.exit(1); }
  try { console.log(await generate(prompt)); }
  catch (e) { console.error(String(e)); process.exit(1); }
}
