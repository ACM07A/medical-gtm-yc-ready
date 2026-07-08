// MiniMax adapter (tier-3 small tasks) — OpenAI-compatible. Key/model/base from env.
// Set: MINIMAX_API_KEY, optionally MINIMAX_BASE_URL (default api.minimax.io/v1), MINIMAX_MODEL.
const BASE = (process.env.MINIMAX_BASE_URL || "https://api.minimax.io/v1").replace(/\/$/, "");
const MODEL = process.env.MINIMAX_MODEL || "MiniMax-M3";
export const available = () => !!process.env.MINIMAX_API_KEY;

export async function generate(prompt, { system = "You are a concise copywriter.", maxTokens = 300, temperature = 0.4 } = {}) {
  const key = process.env.MINIMAX_API_KEY;
  if (!key) throw new Error("MINIMAX_API_KEY not set");
  const r = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages: [{ role: "system", content: system }, { role: "user", content: prompt }], max_tokens: maxTokens, temperature }),
  });
  if (!r.ok) throw new Error(`MiniMax ${r.status}: ${(await r.text()).slice(0, 140)}`);
  const d = await r.json();
  return d.choices?.[0]?.message?.content ?? "";
}
