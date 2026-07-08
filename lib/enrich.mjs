// Enrichment adapter — the PAID unlock for verified named decision-maker contacts, behind an env key.
// OFF by default (free-first). When HUNTER_API_KEY (or ENRICH_API_KEY) is set, this is how the partner
// layer gets *verified* emails + the domain's real email pattern — the thing free SERP discovery can't.
// Provider-agnostic shape; default wiring is Hunter.io (domain-search + email-finder). No key => no-op,
// caller falls back to public discovery + inference. Never fabricates: returns only what the API returns.
const KEY = process.env.HUNTER_API_KEY || process.env.ENRICH_API_KEY || "";
const BASE = process.env.ENRICH_BASE_URL || "https://api.hunter.io/v2";

export function available() { return !!KEY; }

async function get(path, params) {
  const qs = new URLSearchParams({ ...params, api_key: KEY }).toString();
  const r = await fetch(`${BASE}${path}?${qs}`);
  if (!r.ok) throw new Error(`enrich ${path} ${r.status}`);
  return r.json();
}

// Learn a domain's real email pattern + any published named people in target roles (VERIFIED source).
// Returns { pattern, contacts:[{name, role, email, confidence}] } or null when unavailable.
export async function enrichDomain(domain, roleHints = ["international", "medical value travel", "business development"]) {
  if (!available()) return null;
  try {
    const d = await get("/domain-search", { domain, limit: 25 });
    const data = d && d.data;
    if (!data) return null;
    const pattern = (data.pattern || "").replace("{f}", "f").replace("{first}", "first").replace("{last}", "last").replace("{l}", "l").replace(/[{}]/g, "") || null;
    const contacts = (data.emails || [])
      .filter((e) => roleHints.some((h) => (`${e.position || ""} ${e.department || ""}`).toLowerCase().includes(h)))
      .map((e) => ({ name: [e.first_name, e.last_name].filter(Boolean).join(" "), role: e.position || e.department || "", email: e.value, confidence: e.confidence ?? 70 }))
      .filter((c) => c.name && c.email);
    return { pattern, contacts };
  } catch (e) { return { error: String(e.message || e) }; }
}
