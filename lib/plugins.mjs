// Content-plugin registry — the single source of truth for every pluggable integration and whether it's
// "ready" (key present) or "needs key". Everything is built to the point that it only needs the API key;
// this reports which keys are still missing. Surfaced at /plugins and in the console.
import * as image from "./image.mjs";
import * as enrich from "./enrich.mjs";
import { publishers } from "./publishers.mjs";

const has = (...k) => k.every((x) => !!process.env[x]);

export function plugins() {
  const list = [
    { id: "text-gen", name: "Text generation (Tier-2 failover)", category: "generation",
      purpose: "Cornerstone pages, proposals, social copy (GLM-5.2 → Gemini)", envKeys: ["NVIDIA_API_KEY", "GEMINI_API_KEY"],
      ready: has("NVIDIA_API_KEY") || has("GEMINI_API_KEY"), requirements: "NVIDIA NIM key and/or Gemini key" },
    { id: "infographic", name: "Infographics (data visuals)", category: "generation",
      purpose: "On-brand cost/stat infographics from real data — crisp text, no AI", envKeys: ["(free)"],
      ready: true, requirements: "free — HTML→PNG via local browser" },
    { id: "stock-photo", name: "Stock photos (human element)", category: "generation",
      purpose: "Real photos (patients/doctors/hospitals) — avoids uncanny AI faces", envKeys: ["(free) or PEXELS_API_KEY"],
      ready: true, requirements: `free via Openverse (current: ${process.env.PEXELS_API_KEY ? "pexels" : "openverse"})` },
    { id: "image-gen", name: "Image generation (abstract/graphic)", category: "generation",
      purpose: "AI visuals for abstract/decorative slides (no faces/text)", envKeys: ["(free) or CF_API_TOKEN/GEMINI_API_KEY"],
      ready: image.available(), requirements: `current: ${image.providerName()}; Cloudflare FLUX / Nano Banana for premium` },
    { id: "enrichment", name: "Contact enrichment", category: "sourcing",
      purpose: "Verified named decision-maker emails for partner accounts", envKeys: ["HUNTER_API_KEY"],
      ready: enrich.available(), requirements: "Hunter.io / Apollo / RocketReach key" },
    { id: "email", name: "Email sending (Resend)", category: "delivery",
      purpose: "Send partner outreach for real (else local .eml outbox)", envKeys: ["RESEND_API_KEY"],
      ready: has("RESEND_API_KEY"), requirements: "Resend key + verified sending domain" },
    { id: "minimax", name: "MiniMax (Tier-3 small tasks)", category: "generation",
      purpose: "Meta tags, subject polish, classification", envKeys: ["MINIMAX_API_KEY"],
      ready: has("MINIMAX_API_KEY"), requirements: "MiniMax key (optional; falls back to NVIDIA)" },
  ];
  for (const p of Object.values(publishers)) {
    list.push({ id: `post-${p.channel}`, name: `Post to ${p.channel[0].toUpperCase() + p.channel.slice(1)}`,
      category: "delivery", purpose: `Publish approved posts to ${p.channel}`, envKeys: p.envKeys,
      ready: p.available(), requirements: p.requirements });
  }
  return list;
}

export function readiness() {
  const l = plugins();
  return { total: l.length, ready: l.filter((p) => p.ready).length, byCategory: l };
}
