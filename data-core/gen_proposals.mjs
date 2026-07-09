// Partner Sourcing agent — full PARTNERSHIP PROPOSAL per top account (deeper than first-touch outreach).
// Tailored to the account's fit reason + the differentiated angle (latent=margin/demand · established=scale),
// grounded in data-core pricing (indicative, cited) and the credibility framing for lesser-known brands.
// Facilitator terms only (10-15% fee, non-exclusive, pilot). No invented prices/outcomes. Human-gated (review).
//   node --experimental-sqlite data-core/gen_proposals.mjs [limit]
import { generateWithModel } from "../integrations/glm_generate.mjs";
import { open, logRun, isFresh } from "./db.mjs";
import { lintClaims } from "../lib/claims.mjs";
const FORCE = process.env.FORCE === "1";   // idempotency override
// Don't re-propose to accounts already past the proposal stage (or with a live outcome).
const PAST = new Set(["Responded", "Pilot proposed", "Pilot live", "Signed", "Active"]);
const DONE_OUTCOME = new Set(["replied", "meeting", "pilot", "signed"]);
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const db = open();
const O = (s, ...p) => db.prepare(s).get(...p);
const A = (s, ...p) => db.prepare(s).all(...p);
const LIMIT = Number(process.argv[2]) || 4;
mkdirSync(join(ROOT, "outputs", "proposals"), { recursive: true });
const clean = (s) => (s || "").replace(/\s*\((?:verify|est)[^)]*\)/gi, "").replace(/\s*—\s*est.*/i, "").trim();

// idempotent for the partners we touch
const SYSTEM = "You write structured, credible B2B partnership proposals for a medical-value-travel FACILITATOR (not a provider). " +
  "Write PLAINLY — short declarative sentences, a real operator's voice, not marketing copy. " +
  "BANNED phrases (never use): seamless, world-class, bridging the gap, leverage, patient journey, ecosystem, cutting-edge, holistic, empower, tailored solutions, unlock, elevate, state-of-the-art. " +
  "Any magnitude claim (demand, growth, volume) MUST cite a specific number/source; if you don't have one, write it as '[VERIFY: quantify + cite]' rather than using a vague adjective like 'significant'. " +
  "No hype, no guarantees, no invented clinical claims/accreditations/prices. Output clean Markdown with clear section headings.";

// top accounts by fit; prefer ones with a named POC and a flagship-ish category
const partners = A(`SELECT * FROM partner ORDER BY fit_score DESC, priority DESC LIMIT ?`, LIMIT);
let made = 0;

for (const p of partners) {
  const latent = ["latent", "emerging"].includes(p.mvt_presence);
  const angle = latent ? "latent" : "established";
  // WEDGE by trust tier: an UNKNOWN brand can't lead with the highest-fear purchase (a parent's CABG at a
  // hospital nobody's heard of). Low-consideration categories (dental/cosmetic) convert on price and BUILD
  // the trust you need before asking for cardiac. So for latent/unknown brands, lead with the lowest-fear
  // category they cover; established names can lead with their highest-value category.
  const FEAR = { dental: 1, cosmetic: 2, fertility: 3, ophthalmology: 3, ortho: 4, oncology: 5, cardiac: 6 };
  const pcats = A(`SELECT c.* FROM partner_category pc JOIN category c ON c.id=pc.category_id WHERE pc.partner_id=? AND c.status='launch'`, p.id);
  const cat = pcats.length
    ? (latent ? pcats.slice().sort((a, b) => (FEAR[a.id] || 9) - (FEAR[b.id] || 9)) : pcats.slice().sort((a, b) => a.rank - b.rank))[0]
    : O(`SELECT * FROM category WHERE status='launch' ORDER BY rank LIMIT 1`);
  const market = O(`SELECT m.* FROM category_market cm JOIN market m ON m.code=cm.market_code WHERE cm.category_id=? ORDER BY m.tier LIMIT 1`, cat.id)
    || O(`SELECT * FROM market ORDER BY tier LIMIT 1`);
  const price = O(`SELECT min(india_low) lo, max(india_high) hi FROM category_price WHERE category_id=?`, cat.id) || {};
  const comp = O(`SELECT low, high FROM competitor_price WHERE category_id=? ORDER BY samples DESC LIMIT 1`, cat.id);
  const poc = O(`SELECT person_name, role, title_target FROM poc WHERE partner_id=? AND person_name IS NOT NULL AND person_name<>'' ORDER BY confidence DESC LIMIT 1`, p.id);
  const band = price.lo ? `US $${(price.lo / 1000)}k–${(price.hi / 1000)}k (indicative package range, cited; not a quote)` : "indicative ranges (cited)";

  const prompt = `Write a partnership proposal from MedYatra (a medical-value-travel FACILITATOR, not a hospital) to ${p.name}${poc ? `, attn: ${poc.person_name} (${clean(poc.role || poc.title_target || "International Patient Services")}, public business contact)` : " — International Patient Services / International Business"}.
Context (use, do not invent beyond this):
- Their positioning: ${clean(p.fit_reason || "quality hospital")}
- Focus specialty for this proposal: ${cat.name}. Primary source market: ${market.name} (and the wider region).
- Indicative ${cat.name} pricing in India: ${band}.${comp && comp.low ? ` Market band across facilitators: ~$${Math.round(comp.low / 1000)}k–${Math.round(comp.high / 1000)}k.` : ""}
- Angle: ${latent
    ? `FOUNDING-PARTNER PILOT (do NOT claim existing demand volume — we are launching). Be honest: MedYatra is building its ${market.name} patient pipeline now; we're inviting them as a founding partner. The offer is ZERO-DOWNSIDE — no exclusivity, no upfront, they pay the facilitation fee ONLY on patients we actually deliver. Lead with ${cat.name} deliberately: it's a lower-consideration, price-led entry that builds trust and track record before higher-stakes specialties. We run the demand generation (Arabic+English content, WhatsApp) + credibility marketing that establishes their name abroad. Lean on their accreditation "${clean(p.accreditation)}" as the global-standard equalizer. Ask for a package sheet + a named coordinator, not a commitment.`
    : `SCALE play — established chain. Incremental, pre-qualified ${cat.name} patients from ${market.name}/region with low acquisition effort. Non-exclusive pilot; pay-per-delivered-patient. Do not overstate current volume.`}

Structure the proposal with these sections:
1. Introduction & who we are (facilitator, not a provider)
2. Why patients from ${market.name} travel for ${cat.name} — the case (cost gap, quality). Do NOT claim a demand number you weren't given; if you reference volume, write "[VERIFY: cite a figure]".
3. What MedYatra brings (demand generation, patient coordination, ${latent ? "brand/credibility building abroad, " : ""}interpreter + logistics)
4. Commercial model — facilitation fee ~10–15%, pay ONLY on delivered patients, patient never double-charged, transparent. ${latent ? "NON-exclusive to start; note a path to preferred/exclusive terms in this market once the pilot proves volume." : "Non-exclusive."}
5. Proposed pilot — a small, time-boxed founding-partner cohort with clear success metrics; zero upfront
6. Compliance & trust — facilitator disclosure, accredited-partners-only, data protection (DPDP/GDPR), no clinical claims by us
7. Next steps — ask for a package sheet + a named coordinator + a 30-minute intro call (not a commitment)

Rules: NO invented prices/outcomes/volumes (reference the indicative range only, clearly labelled). No parenthetical internal notes. ~450–600 words. Professional sign-off from "MedYatra Partnerships".`;

  // STAGE GUARD: don't re-propose to an account already past the proposal stage or with a live outcome.
  if (!FORCE && (PAST.has(p.stage) || DONE_OUTCOME.has(p.outcome))) { console.log(`proposal → ${p.name} … skip (stage '${p.stage}'${p.outcome && p.outcome !== "none" ? ", outcome " + p.outcome : ""})`); continue; }
  // IDEMPOTENCY: skip if a proposal for this partner+category was generated recently (no wasted tokens).
  const existing = O(`SELECT generated_at FROM proposal WHERE partner_id=? AND category_id=?`, p.id, cat.id);
  if (!FORCE && isFresh(existing?.generated_at, 14)) { console.log(`proposal → ${p.name} … skip (fresh, ${existing.generated_at})`); continue; }

  process.stdout.write(`proposal → ${p.name} (${angle}) … `);
  let r; try { r = await generateWithModel(prompt, { system: SYSTEM, maxTokens: 1400, temperature: 0.5 }); }
  catch (e) { console.log("FAIL:", String(e.message || e).slice(0, 50)); logRun(db, "Partner Sourcing", `proposal ${p.id}`, "gen error", null, "fail"); continue; }

  // QA the prose: tag vague magnitude claims [VERIFY] (the "significant demand" leak) + flag AI-filler.
  const lint = lintClaims(clean(r.text));
  const flagNote = (lint.vague.length || lint.filler.length)
    ? `<!-- QA: ${lint.vague.length} vague-claim(s) auto-tagged [VERIFY]${lint.filler.length ? ` · filler to cut: ${lint.filler.slice(0, 6).join(", ")}` : ""} -->\n` : "";
  const file = join("outputs", "proposals", `${p.id}-${cat.id}-${market.code.toLowerCase()}.md`);
  const header = `<!-- PARTNERSHIP PROPOSAL · DRAFT (human review before send) · ${angle} angle · ${p.id} · model:${r.model} · ${new Date().toISOString().slice(0, 10)} -->\n${flagNote}\n# Partnership Proposal — ${p.name}\n_${cat.name} · ${market.name} · prepared by MedYatra Partnerships_\n\n`;
  writeFileSync(join(ROOT, file), header + lint.text.trim() + "\n");
  if (lint.vague.length || lint.filler.length) logRun(db, "QA", `Proposal lint · ${p.id}`, `${lint.vague.length} vague→[VERIFY], filler: ${lint.filler.slice(0, 5).join(", ") || "none"}`, null, "pending");

  // upsert proposal row (idempotent per partner+category)
  db.prepare(`DELETE FROM proposal WHERE partner_id=? AND category_id=?`).run(p.id, cat.id);
  db.prepare(`INSERT INTO proposal (partner_id,category_id,market_code,fee_pct,status,file_ref,blockers,generated_at) VALUES (?,?,?,?, 'review', ?, ?, datetime('now'))`)
    .run(p.id, cat.id, market.code, 0.125, file, poc ? null : "no named POC yet");
  db.prepare(`UPDATE partner SET stage='Pilot proposed' WHERE id=? AND stage NOT IN ('Responded','Pilot live','Signed','Active')`).run(p.id);
  made++;
  logRun(db, "Partner Sourcing", `Proposal · ${p.name}`, `${angle} · ${cat.name}×${market.code} · review (human-gated)${r.failedOver ? " · " + r.model : ""}`, null, "ok");
  console.log(`ok (${r.model}) -> ${file}`);
}
logRun(db, "Partner Sourcing", "Proposal batch complete", `${made} tailored proposals drafted → review (human-gated)`);
console.log(`\n${made} proposals → outputs/proposals/ + proposal table (status review). Human review before send.`);
db.close();
