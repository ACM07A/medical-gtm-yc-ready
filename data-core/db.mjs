// Data-core connection helper. Requires Node >=22.5 run with --experimental-sqlite.
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
export const DB_PATH = join(HERE, "medyatra.db");

export function open(path = DB_PATH) {
  const db = new DatabaseSync(path);
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(readFileSync(join(HERE, "schema.sql"), "utf8")); // idempotent (CREATE IF NOT EXISTS)
  // lightweight migrations (add columns without a rebuild; ignore if they already exist)
  for (const c of ["meta_title", "meta_desc"]) { try { db.exec(`ALTER TABLE content_asset ADD COLUMN ${c} TEXT`); } catch {} }
  // E-E-A-T score + review date: organic is the profitable acquisition path, so a page's trust signals are
  // first-class data, not a report. reviewed_at also drives the refresh loop — price pages decay.
  for (const c of ["eeat_score INTEGER DEFAULT 0", "reviewed_at TEXT", "cluster TEXT"]) {
    try { db.exec(`ALTER TABLE content_asset ADD COLUMN ${c}`); } catch {}
  }
  // account-model upgrade: turn poc rows from "front-desk directory" into real decision-maker records.
  //  role        = the ACTUAL role of the named person (vs title_target = the role we're hunting for)
  //  seniority    = head | senior | mid | desk   (desk = generic inbox, no named owner)
  //  contact_type = named-verified | named-public | inferred | desk   (how sure we are it's a real path)
  //  contact_value= the email/phone/profile URL   ·  confidence 0-100  ·  verified_at ISO date
  for (const c of ["role TEXT", "seniority TEXT", "contact_type TEXT", "contact_value TEXT",
                   "confidence INTEGER DEFAULT 0", "verified_at TEXT"]) {
    try { db.exec(`ALTER TABLE poc ADD COLUMN ${c}`); } catch {}
  }
  // pipeline upgrade: an account is only "moving" if it has a next action and an owner.
  for (const c of ["next_action TEXT", "owner TEXT", "fit_reason TEXT", "fit_score REAL"]) {
    try { db.exec(`ALTER TABLE partner ADD COLUMN ${c}`); } catch {}
  }
  // ACCESS + SPEED + PURSUIT — the warm-intro re-think (2026-07-22). fit_score answers "is this account
  // commercially worth it" (margin thesis); it does NOT answer "can we actually get in, and how fast". With a
  // real set of warm introductions on the table, *access* and *time-to-market* now drive who we work first, so
  // they are first-class scored inputs, not a note. See pursuitScore()/accessScore()/speedScore() in this file.
  //  connection        = adviser_desk | warm_group | warm_individual | named_public | desk | cold  (how we get in)
  //  commission_status = agreed | in_discussion | unknown  (Sachin: agree the % and partnering is fast)
  //  commission_target_pct = the fee number that, once agreed, unblocks a fast close
  //  value_ask         = what we ask the hospital to give back for a LOWER fee (we bring the volume) — a terms note
  //  access/speed/pursuit_score = computed 0-100 (partner_layer.mjs / the warm-account seed store them)
  for (const c of ["connection TEXT DEFAULT 'cold'", "commission_status TEXT DEFAULT 'unknown'",
                   "commission_target_pct REAL", "value_ask TEXT",
                   "access_score REAL", "speed_score REAL", "pursuit_score REAL"]) {
    try { db.exec(`ALTER TABLE partner ADD COLUMN ${c}`); } catch {}
  }
  // outcome feedback loop (ground truth) + idempotency stamps.
  //  outcome: none|contacted|replied|meeting|pilot|signed|lost  — the ONLY real validation of the fit model.
  //  last_discovery_at / *_generated_at: so re-runs skip already-done work instead of duplicating it.
  for (const c of ["outcome TEXT DEFAULT 'none'", "outcome_at TEXT", "outcome_note TEXT", "last_discovery_at TEXT"]) {
    try { db.exec(`ALTER TABLE partner ADD COLUMN ${c}`); } catch {}
  }
  for (const c of ["generated_at TEXT", "outcome TEXT DEFAULT 'none'", "replied_at TEXT"]) {
    try { db.exec(`ALTER TABLE proposal ADD COLUMN ${c}`); } catch {}
  }
  try { db.exec(`ALTER TABLE channel_post ADD COLUMN generated_at TEXT`); } catch {}
  // key-value system state (heartbeat, last backup) for monitoring.
  db.exec(`CREATE TABLE IF NOT EXISTS system_state (k TEXT PRIMARY KEY, v TEXT, updated TEXT DEFAULT (datetime('now')))`);
  // REGULATORY GATE — "can this business legally solicit patients here?" Facilitation is regulated
  // differently across markets (some Gulf states require approval to solicit). Default 'unverified' =
  // legal DD not done = do NOT market live. Cleared to 'verified' only after human/counsel sign-off.
  for (const c of ["regulatory_status TEXT DEFAULT 'unverified'", "regulatory_note TEXT"]) {
    try { db.exec(`ALTER TABLE market ADD COLUMN ${c}`); } catch {}
  }
  // WELLNESS / naturopathy as a SELLABLE product line — NOT an acquisition channel. It's low-consideration,
  // cash-pay, and carries no clinical-outcome liability: the lowest-hanging fruit to sell on its own, AND a
  // post-op RECOVERY add-on that bundles onto a surgical journey (come for the knee, stay for the recovery).
  //  kind       = 'medical' | 'wellness'   (keeps wellness out of the surgical pricing/proposal logic)
  //  bundleable = 1         → can be attached to any surgical category as a recovery extension
  for (const c of ["kind TEXT DEFAULT 'medical'", "bundleable INTEGER DEFAULT 0"]) {
    try { db.exec(`ALTER TABLE category ADD COLUMN ${c}`); } catch {}
  }
  // DUAL-MODE lead origin. The engine runs on BOTH our own funnel AND a lead DB an outside party plugs in.
  //  source_type: own | partner (a referral/channel source) | external (a client's plugged-in lead DB)
  //  source_ref = the referring partner / external tenant id.  ingested_at = when it entered.
  for (const c of ["source_type TEXT DEFAULT 'own'", "source_ref TEXT", "ingested_at TEXT"]) {
    try { db.exec(`ALTER TABLE lead ADD COLUMN ${c}`); } catch {}
  }
  // COMMS STATE MACHINE needs per-lead journey position + timing. The 24h WhatsApp session is derived from
  // last_inbound_at; nudge_count caps the no-reply loop; next_action_at schedules the follow-up cadence.
  for (const c of ["journey_stage TEXT DEFAULT 'intake'", "last_inbound_at TEXT", "last_outbound_at TEXT",
                   "nudge_count INTEGER DEFAULT 0", "next_action_at TEXT", "opted_out INTEGER DEFAULT 0"]) {
    try { db.exec(`ALTER TABLE lead ADD COLUMN ${c}`); } catch {}
  }
  // Ancillary SERVICES per lead — the wrap-around that makes a medical TRIP work (not just a procedure):
  // visa + attendant visas, accommodation (pre/post-op, patient + relatives), flights, transfers. Delivered
  // by adapters (lib/visa, lib/stay, lib/flights); human-gated. status walks a per-kind lifecycle.
  //  kind   : visa | attendant_visa | stay_preop | stay_postop | flight | transfer
  //  status : requested | awaiting_hospital_letter | letter_ready | applied | approved | booked | complete | failed
  db.exec(`CREATE TABLE IF NOT EXISTS service (
    id INTEGER PRIMARY KEY AUTOINCREMENT, lead_id INTEGER REFERENCES lead(id), kind TEXT, provider TEXT,
    status TEXT DEFAULT 'requested', ref TEXT, detail TEXT,
    created TEXT DEFAULT (datetime('now')), updated TEXT DEFAULT (datetime('now')))`);
  // MULTI-TENANCY — the moat-preserving posture (see build-os/11). One engine powers many operators; each is
  // a tenant with its own ingest token, and leads are scoped by lead.source_ref = tenant.id. Own-acquisition
  // is just the 'medyatra' tenant (mode='own'). Staying multi-tenant is what keeps us a platform, not a
  // captive vendor — the tech IP + cross-tenant calibration data are the assets no single operator owns.
  //  mode : own | operator      token : per-tenant ingest secret (null = dev-open)      rev_share : 0..1
  db.exec(`CREATE TABLE IF NOT EXISTS tenant (
    id TEXT PRIMARY KEY, name TEXT, mode TEXT DEFAULT 'operator', token TEXT, rev_share REAL,
    active INTEGER DEFAULT 1, created TEXT DEFAULT (datetime('now')))`);

  // FAMILY CONTACT — the person waiting at home is NOT the patient and is not on the patient's WhatsApp
  // thread. That's a second, separate conversation with a second person, which means a second consent
  // (contacting a third party about a patient's care is its own privacy question) and, on WhatsApp
  // specifically, its own 24h-session/template rule — the first message to a number that's never messaged
  // us is a template, exactly like the patient's own first touch (lib/comms_machine.mjs). consent starts
  // at 0 on purpose: nothing sends to a family contact until they've opted in.
  db.exec(`CREATE TABLE IF NOT EXISTS family_contact (
    id INTEGER PRIMARY KEY AUTOINCREMENT, lead_id INTEGER REFERENCES lead(id),
    name TEXT, phone TEXT, relationship TEXT, language TEXT DEFAULT 'en',
    consent INTEGER DEFAULT 0, consent_at TEXT, opted_out INTEGER DEFAULT 0,
    last_outbound_at TEXT, created TEXT DEFAULT (datetime('now')))`);

  // DOCUMENT ITEM — per-lead, per-document KYC-style state. document_checklist.mjs used to return a fresh,
  // stateless list every call; a real intake process is: something is requested, the patient submits it,
  // SOME items can be verified by a deterministic rule (a passport expiry date is just arithmetic), others
  // genuinely need a human to look at an image (a photo spec, or that a name matches across documents) —
  // and the record of which is which has to persist, or every re-check starts from zero.
  //  status: missing | submitted | verified | needs_human_review | rejected
  db.exec(`CREATE TABLE IF NOT EXISTS doc_item (
    id INTEGER PRIMARY KEY AUTOINCREMENT, lead_id INTEGER REFERENCES lead(id),
    key TEXT, label TEXT, status TEXT DEFAULT 'missing', value TEXT, note TEXT,
    submitted_at TEXT, checked_at TEXT, UNIQUE(lead_id, key))`);

  // ESTIMATE LINE — a real per-lead quote, and later the real actual bill, as itemised rows. Billing
  // reconciliation used to take two hand-typed strings; that's a UI demo, not a system. A quote is recorded
  // once at booking (kind='quote') and the actual is recorded once at discharge (kind='actual'); the
  // reconciliation agent reads both back from here rather than trusting whatever was typed into a box.
  db.exec(`CREATE TABLE IF NOT EXISTS estimate_line (
    id INTEGER PRIMARY KEY AUTOINCREMENT, lead_id INTEGER REFERENCES lead(id),
    kind TEXT, label TEXT, amount REAL, currency TEXT DEFAULT 'USD',
    created TEXT DEFAULT (datetime('now')))`);

  // DOCTOR AFFILIATE — see schema.sql for the full rationale. Migration mirror for DBs created before this
  // table existed.
  db.exec(`CREATE TABLE IF NOT EXISTS doctor_affiliate (
    partner_id TEXT PRIMARY KEY REFERENCES partner(id),
    specialty TEXT, country_code TEXT, current_hospital TEXT,
    reach_est TEXT DEFAULT 'unknown', warmth TEXT DEFAULT 'cold',
    contact_channel TEXT, cme_notes TEXT, source TEXT)`);
  // HEALTH DATA LAW REGISTER — per-market medical-data law (the Ch. V/residency layer of the vault
  // architecture, lib/vault.mjs). One row per source market + India as destination. status mirrors the
  // regulatory-gate pattern: 'unverified' until counsel signs off — the entries are researched, not verified.
  //  transfer_rule: in_country_only | localization_copy | adequacy_or_sccs | consent_based | no_comprehensive_law
  db.exec(`CREATE TABLE IF NOT EXISTS health_data_law (
    market_code TEXT PRIMARY KEY,
    law_name TEXT, regulator TEXT,
    transfer_rule TEXT DEFAULT 'no_comprehensive_law',
    key_constraints TEXT, consent_basis TEXT,
    status TEXT DEFAULT 'unverified', source TEXT, retrieved TEXT)`);
  // PAYER — the third account type, base only (channel parked for phase 2/3). See schema.sql / PARTNER_AGENT.md §12.
  db.exec(`CREATE TABLE IF NOT EXISTS payer (
    partner_id TEXT PRIMARY KEY REFERENCES partner(id),
    payer_type TEXT, country_code TEXT, population_est TEXT,
    claims_pain TEXT DEFAULT 'unknown', decision_authority TEXT DEFAULT 'unknown',
    warmth TEXT DEFAULT 'cold', contact_channel TEXT, source TEXT)`);
  return db;
}

// Real public hospital email domains (for email-pattern inference + worklist). Public info; verify
// before send. Shared by research_worklist.mjs and infer_contacts.mjs.
export const PARTNER_DOMAINS = {
  "ganga-ram": "sgrh.com", "hinduja": "hindujahospital.com", "frontier-lifeline": "frontierlifeline.com",
  "cytecare": "cytecare.com", "artemis": "artemishospitals.com",
  "marengo": "marengoasia.com", "sakra-world": "sakraworldhospital.com",
  "cloudnine": "cloudninecare.com",
};

// LIKE-FOR-LIKE cost comparators for infographics. The category price range is an AGGREGATE across
// different procedures (dental spans a $500 implant AND a $9,500 full-mouth job) — comparing that blob to
// a single Western procedure produces nonsense (dental showed "-217%"). So each category names ONE
// representative procedure; india price comes from the data core for THAT procedure; `west` is its cited
// Western reference (/build-os/08). Compared midpoint-to-midpoint with a sanity guard (see comparator()).
export const CATEGORY_COMPARATOR = {
  cardiac:   { match: "bypass",  label: "Heart bypass (CABG)",         west: [90000, 120000] },
  ortho:     { match: "knee",    label: "Knee replacement",           west: [35000, 50000] },
  oncology:  { match: "marrow",  label: "Bone-marrow transplant",     west: [150000, 400000] },
  fertility: { match: "ivf",     label: "IVF (per cycle)",            west: [12000, 25000] },
  cosmetic:  { match: "sleeve",  label: "Bariatric (gastric sleeve)", west: [20000, 30000] },
  dental:    { match: "implant", label: "Single dental implant",      west: [2000, 3500] },
};
// Returns a validated like-for-like comparator {label, india_low/high, west_low/high, savings, valid} or null.
// savings = midpoint-to-midpoint; valid=false (and no % shown) if it's ≤0 or >95 (a data/mapping error).
export function comparator(db, categoryId) {
  const c = CATEGORY_COMPARATOR[categoryId];
  if (!c) return null;
  const p = db.prepare(`SELECT procedure, india_low, india_high FROM category_price WHERE category_id=? AND lower(procedure) LIKE ? ORDER BY india_low LIMIT 1`).get(categoryId, `%${c.match}%`)
    || db.prepare(`SELECT procedure, india_low, india_high FROM category_price WHERE category_id=? ORDER BY india_low LIMIT 1`).get(categoryId);
  if (!p || !p.india_low) return null;
  const savings = Math.round((1 - (p.india_low + p.india_high) / (c.west[0] + c.west[1])) * 100);
  const valid = savings > 0 && savings <= 95;                 // guard: reject garbage before it becomes a PNG
  return { label: c.label, india_low: p.india_low, india_high: p.india_high, west_low: c.west[0], west_high: c.west[1], savings, valid };
}

// PRICE LADDER — the comparison in the order the patient actually makes it: their best LOCAL option first,
// then the other international destinations they'd realistically weigh, then India last (highlighted).
// Rationale (/build-os/03): leading with "India vs the USA" answers a question a patient in Muscat never
// asked — they are choosing between Muscat, Bangkok, Dubai, and India. Answering their real question is the
// trust play, and it survives the case where India ISN'T the cheapest (the ladder still tells the truth).
//
// The India rung prefers a CONFIRMED partner package rate over the indicative aggregate range — once a
// signed partner sheet exists, the ladder quotes a real hospital, which is the entire commercial pitch.
// Rungs with no price are returned with low=null and `gap:true` — rendered as an explicit unknown, never
// guessed. Returns { procedure, label, rungs[], marketCode } or null.
export function priceLadder(db, categoryId, marketCode) {
  const c = CATEGORY_COMPARATOR[categoryId];
  if (!c) return null;
  const rows = db.prepare(
    `SELECT * FROM reference_price WHERE category_id=? AND procedure_key=? AND (market_code=? OR market_code='*')
     ORDER BY CASE tier WHEN 'local' THEN 0 WHEN 'international' THEN 1 ELSE 2 END, low IS NULL, low`
  ).all(categoryId, c.match, marketCode);

  const rungs = rows.filter((r) => r.tier !== "india").map((r) => ({
    tier: r.tier, dest: r.dest_code, label: r.dest_label,
    low: r.low, high: r.high, gap: !(r.low && r.high), cite: r.source_cite,
  }));

  // Final rung: a confirmed partner package if we have one, else the indicative India range.
  const pp = db.prepare(
    `SELECT pp.*, p.name FROM partner_price pp JOIN partner p ON p.id=pp.partner_id
     WHERE pp.category_id=? AND pp.procedure_key=? AND pp.status='confirmed' ORDER BY pp.low LIMIT 1`
  ).get(categoryId, c.match);
  const ind = db.prepare(
    `SELECT india_low AS low, india_high AS high FROM category_price
     WHERE category_id=? AND lower(procedure) LIKE ? ORDER BY india_low LIMIT 1`
  ).get(categoryId, `%${c.match}%`);

  if (pp) rungs.push({ tier: "india", dest: "IN", label: `${pp.name} (your package rate)`, low: pp.low, high: pp.high,
                       gap: false, ours: true, confirmed: true, includes: pp.includes, cite: pp.source_cite });
  else if (ind?.low) rungs.push({ tier: "india", dest: "IN", label: "India — accredited hospitals", low: ind.low,
                                  high: ind.high, gap: false, ours: true, confirmed: false, cite: "indicative range — data-core" });

  if (!rungs.length) return null;
  return { procedure: c.match, label: c.label, marketCode, rungs,
           complete: rungs.every((r) => !r.gap), hasLocal: rungs.some((r) => r.tier === "local" && !r.gap) };
}

// COMMISSION / MARGIN MODEL — the facilitator economics, made explicit and designed to run on ACTUAL
// hospital package rates once we have them (capture_partner_price.mjs), falling back to the indicative range
// only when we don't. The facilitator model: the hospital's package price is what the patient pays; the
// hospital pays US a facilitation commission out of that price and nets the rest — we are NOT a patient
// markup. The strategic point (Sachin + founder numbers, 2026-07-22): INCUMBENT agents charge 25–33%. We use
// a volume RAMP that STEPS UP from 20% to 25% across three tiers of cumulative annual revenue routed to the
// partner — we deliberately START BELOW the incumbent floor (20% vs 25%) to win the pilot and prove the
// channel, and rise only to the incumbent FLOOR (25%), never above, once we are demonstrably driving volume.
// So we're cheaper than any incumbent early and at parity with their cheapest at scale, with our upside tied
// to the volume we deliver (and the "extra" we ask back, value_ask, strongest in the early undercut phase).
// `pkg` is {low,high} from a confirmed partner_price (actual) or category range (indicative); feePct defaults
// to the entry tier (20). incumbentPct defaults to the BOTTOM of the incumbent range (25) so the uplift pitch
// is conservative — vs a 33% incumbent it's larger still.
export const INCUMBENT_COMMISSION = { low: 25, high: 33 };   // what hospitals pay incumbent agents today (founder input)
export const USD_INR = 83;   // indicative FX to bucket INR revenue tiers against USD package data — refresh before contracting
// Volume-based commission that STEPS UP as cumulative annual revenue ROUTED TO THE PARTNER grows (marginal
// brackets, like tax: each band of routed revenue is billed at that band's rate). Thresholds in INR (₹Lakh)
// per the founder's structure. OPENING proposal — negotiable per partner, not a published rate card.
export const COMMISSION_TIERS = [
  { uptoINR: 20_00_000, pct: 20,   label: "entry · ₹0–20L/yr routed (below the incumbent floor)" },
  { uptoINR: 50_00_000, pct: 22.5, label: "growth · ₹20L–50L/yr routed" },
  { uptoINR: Infinity,  pct: 25,   label: "scale · ₹50L+/yr routed (incumbent floor, never above)" },
];
// Which tier applies at a given cumulative routed revenue. tierFor takes INR; tierForUSD converts USD package data.
export function tierFor(cumulativeRoutedINR = 0) {
  return COMMISSION_TIERS.find((t) => cumulativeRoutedINR < t.uptoINR) ?? COMMISSION_TIERS.at(-1);
}
export function tierForUSD(cumulativeRoutedUSD = 0) {
  return tierFor(cumulativeRoutedUSD * USD_INR);
}
export function commissionModel(pkg, feePct = COMMISSION_TIERS[0].pct, incumbentPct = INCUMBENT_COMMISSION.low) {
  const lo = Number(pkg?.low) || 0, hi = Number(pkg?.high) || 0;
  const fee = Math.max(0, feePct) / 100, inc = Math.max(0, incumbentPct) / 100;
  const ourFee = { low: Math.round(lo * fee), high: Math.round(hi * fee) };
  const hospitalNet = { low: Math.round(lo * (1 - fee)), high: Math.round(hi * (1 - fee)) };
  // What the hospital nets ABOVE what an incumbent at incumbentPct would leave them — the pitch, per case.
  // Conservative by default (vs the 25% floor); pass INCUMBENT_COMMISSION.high for the headline version.
  const netUplift = { low: Math.round(lo * (inc - fee)), high: Math.round(hi * (inc - fee)) };
  return { patient: { low: lo, high: hi }, ourFee, hospitalNet, feePct, incumbentPct, netUplift, tiers: COMMISSION_TIERS };
}

// SALES-READINESS — deliberately SEPARATE from fit_score. Fit = "should we want them" (opportunity).
// Readiness = "can they actually take an international patient soon" (execution risk). High whitespace
// (the thing that makes fit attractive) usually means LOW readiness: no visa-invite desk, no interpreter
// network, no international pricing sheet. Conflating the two hides a 6-12 month setup behind a 96 score.
// Inferred from MVT presence + an international credential (JCI = a real int'l-readiness signal).
export function readiness(p) {
  const base = { established: 85, emerging: 55, latent: 30, none: 20 }[p.mvt_presence] ?? 40;
  const jci = /JCI/i.test(p.accreditation || "") ? 15 : 0;   // JCI implies int'l-patient infrastructure
  const score = Math.min(100, base + jci);
  const months = score >= 75 ? "0–2" : score >= 50 ? "3–6" : "6–12";   // rough time-to-first-bookable
  const label = score >= 75 ? "ready" : score >= 50 ? "ramping" : "needs setup";
  return { score, label, months };
}

// DOCTOR-AFFILIATE FIT — a different rubric for a different account type (see doctor_affiliate in
// schema.sql). A hospital is scored on quality x whitespace x proof; a doctor is scored on whether
// recruiting them would actually move patients toward our wedge categories from our actual markets — the
// accreditation/mvt_presence inputs partnerFit() uses don't mean anything for a person.
const SPECIALTY_W = { priority: 1.0, general: 0.6, unrelated: 0.3 };
const REACH_W = { high: 1.0, med: 0.6, low: 0.3, unknown: 0.3 };
// Sachin Rai named these unprompted, by real volume, as his own top categories. Cardiac is included only
// because it's the flagship override (T013) — his numbers don't support it; see PARTNER_AGENT.md.
export const DOCTOR_PRIORITY_SPECIALTIES = ["oncology", "ortho", "fertility", "cardiac"];
export function doctorFit(d) {
  const tier = DOCTOR_PRIORITY_SPECIALTIES.includes(d.specialty) ? "priority" : d.specialty ? "general" : "unrelated";
  const specialty = SPECIALTY_W[tier];
  const market = d.inTargetMarket ? 1.0 : 0.4;                // Africa / Middle East / SE Asia = the actual GTM markets
  const reach = REACH_W[d.reach_est] ?? REACH_W.unknown;
  const score = Math.round(100 * (0.35 * specialty + 0.35 * market + 0.30 * reach));
  const specTxt = tier === "priority" ? `${d.specialty} is a category a live desk actually moves real volume in`
    : tier === "general" ? `${d.specialty} is adjacent, not a core wedge category` : "specialty not recorded";
  const marketTxt = d.inTargetMarket ? "based in a target market" : "outside the current target markets — lower priority regardless of specialty";
  const reachTxt = { high: "high referral volume", med: "moderate referral volume", low: "low referral volume", unknown: "referral volume not yet estimated" }[d.reach_est] ?? "referral volume not yet estimated";
  return { score, reason: `${specTxt}; ${marketTxt}; ${reachTxt}.` };
}

// Readiness answers "can this become a live referral channel soon" — separate from fit for the same reason
// partner readiness() is separate from partnerFit(). warmth is the dominant lever on purpose: Sachin's
// account is that relationship tenure and trust decide flow, not a pitch — the same warm-intro thesis
// already applied to Aster/Manipal/Fortis (seed_warm_accounts.mjs), one level down to an individual.
export function doctorReadiness(d) {
  const base = d.warmth === "warm" ? 70 : 30;
  const routed = d.hasExistingPartnerHospital ? 15 : 0;       // their own hospital is already one of ours — no new institutional relationship needed
  const score = Math.min(100, base + routed);
  const label = score >= 70 ? "ready to approach" : score >= 40 ? "needs a warm path" : "cold — relationship-build only";
  return { score, label };
}

// PAYER FIT — the base of a third account type (type='payer'), channel parked for phase 2/3. A payer
// (insurer / TPA / self-insured employer / government office) is scored on none of the hospital or doctor
// axes: the pitch is claims-cost math applied to a POPULATION, so fit ≈ how many lives they cover × how much
// those lives are costing them on treatments we could redirect × whether one deal can actually move volume.
// Deliberately minimal — a real-but-simple prior, not a validated model, matching the "base only" scope.
const REACH_POP_W = { high: 1.0, med: 0.6, low: 0.3, unknown: 0.3 };
const PAIN_W = { high: 1.0, med: 0.6, low: 0.3, unknown: 0.3 };
const AUTHORITY_W = { concentrated: 1.0, distributed: 0.4, unknown: 0.4 };
// population_est is free text ("4.4M", "50k employees", "unknown") — bucket it coarsely, never invent a number.
function popBucket(popEst) {
  const s = String(popEst || "").toLowerCase();
  if (/\bunknown\b|^$/.test(s)) return "unknown";
  const m = s.match(/([\d.]+)\s*([mk])?/);
  if (!m) return "unknown";
  const n = parseFloat(m[1]) * (m[2] === "m" ? 1e6 : m[2] === "k" ? 1e3 : 1);
  return n >= 1e6 ? "high" : n >= 5e4 ? "med" : "low";
}
export function payerFit(p) {
  const popTier = popBucket(p.population_est);
  const population = REACH_POP_W[popTier];
  const pain = PAIN_W[p.claims_pain] ?? PAIN_W.unknown;
  const authority = AUTHORITY_W[p.decision_authority] ?? AUTHORITY_W.unknown;
  const market = p.inTargetMarket ? 1.0 : 0.6;                // payers in a target market rank higher, but a big payer anywhere is still worth it
  const score = Math.round(100 * (0.35 * population + 0.30 * pain + 0.20 * authority + 0.15 * market));
  const popTxt = { high: "covers a large population (1M+)", med: "covers a mid-size population", low: "covers a small population", unknown: "covered population not yet established" }[popTier];
  const painTxt = { high: "high claims exposure on redirectable treatments", med: "moderate claims exposure", low: "low claims exposure", unknown: "claims exposure not yet estimated" }[p.claims_pain] ?? "claims exposure not yet estimated";
  const authTxt = p.decision_authority === "concentrated" ? "one deal can move real volume" : p.decision_authority === "distributed" ? "decision-making is fragmented — slower to move volume" : "decision authority not yet mapped";
  return { score, reason: `${popTxt}; ${painTxt}; ${authTxt}.` };
}
// Readiness is warmth-dominated, same thesis as hospitals and doctors: a real introduction beats a cold pitch.
export function payerReadiness(p) {
  const score = Math.min(100, (p.warmth === "warm" ? 70 : 30) + (p.decision_authority === "concentrated" ? 15 : 0));
  const label = score >= 70 ? "ready to approach" : score >= 40 ? "needs a warm path" : "cold — relationship-build only";
  return { score, label };
}

// Weighted category score (/build-os/03 weights). Factors are 1-5.
export const WEIGHTS = { cost_arb: 0.25, quality: 0.20, ease: 0.15, demand: 0.20, margin: 0.10, whitespace: 0.10 };
export function scoreOf(f) {
  return +(f.cost_arb * WEIGHTS.cost_arb + f.quality * WEIGHTS.quality + f.ease * WEIGHTS.ease +
           f.demand * WEIGHTS.demand + f.margin * WEIGHTS.margin + f.whitespace * WEIGHTS.whitespace).toFixed(2);
}
export const j = (v) => JSON.stringify(v ?? null);

// Log a run/activity entry so every loop iteration is visible in the console.
export function logRun(db, agent, action, detail = "", ref = null, status = "ok") {
  db.prepare(`INSERT INTO run (agent,action,detail,ref,status) VALUES (?,?,?,?,?)`)
    .run(agent, action, detail, ref, status);
}

// System state (heartbeat, last backup) — for monitoring the unattended loop.
export function setState(db, k, v) {
  db.prepare(`INSERT INTO system_state (k,v,updated) VALUES (?,?,datetime('now'))
    ON CONFLICT(k) DO UPDATE SET v=excluded.v, updated=datetime('now')`).run(k, String(v));
}
export function getState(db, k) { return db.prepare(`SELECT v, updated FROM system_state WHERE k=?`).get(k) || null; }

// Regulatory gate: may we market/solicit patients in this source market yet?
// 'verified' = counsel cleared it. 'blocked' = known not-allowed. 'unverified' (default) = DD not done → no.
export function marketCleared(db, code) {
  const m = db.prepare(`SELECT regulatory_status s, regulatory_note n FROM market WHERE code=?`).get(code);
  return { cleared: m?.s === "verified", status: m?.s || "unverified", note: m?.n || null };
}

// Freshness guard for idempotency: true if `iso` is within `days` of now (so we SKIP re-doing it).
export function isFresh(iso, days = 7) {
  if (!iso) return false;
  const t = Date.parse(iso.replace(" ", "T") + (iso.includes("Z") ? "" : "Z"));
  return Number.isFinite(t) && (Date.now() - t) < days * 864e5;
}

// Opportunity/margin = quality (must clear bar) x inverse of current MVT presence.
// High-quality + low-presence brands => better commercial terms, less competition (the margin play).
const PRESENCE_W = { none: 1.0, latent: 0.9, emerging: 0.6, established: 0.2 };
const QUALITY_W = { High: 1.0, Med: 0.6 };
export function oppOf(fit, presence) {
  const s = (QUALITY_W[fit] ?? 0.4) * (PRESENCE_W[presence] ?? 0.5);
  return s >= 0.8 ? "High" : s >= 0.45 ? "Med" : "Low";
}

// Partner-fit ("does this partner actually NEED us?") — the margin thesis as a 0-100 score + a
// stated reason. High score = high quality + low current MVT presence + a proof point to sell.
// This is what makes an account worth working, and why. Inputs are real partner-row fields.
const ACCRED_W = { JCI: 1.0, "NABH+JCI": 1.0, NABH: 0.7 };
export function partnerFit(p, catNames = []) {
  const quality = QUALITY_W[p.fit] ?? 0.4;                    // must clear the bar
  const whitespace = PRESENCE_W[p.mvt_presence] ?? 0.5;      // low presence = more room for us
  const proof = Math.max(...Object.entries(ACCRED_W)         // do they have a credential we can sell?
    .filter(([k]) => (p.accreditation || "").toUpperCase().includes(k.split("+")[0].toUpperCase()))
    .map(([, w]) => w), 0) || 0.4;
  const score = Math.round(100 * (0.45 * quality + 0.40 * whitespace + 0.15 * proof));
  const cats = catNames.length ? catNames.join(", ") : "core specialties";
  // strip internal "(verify …)" research notes so they don't surface in a reason line
  const accred = (p.accreditation || "").replace(/\s*\((?:verify|est)[^)]*\)/gi, "").trim();
  const ac = accred && !/specialty/i.test(accred) ? ` (${accred})` : "";
  let reason;
  if (p.mvt_presence === "latent" || p.mvt_presence === "none") {
    reason = `Benchmark quality${ac}, strong in ${cats}, but little/no international-patient presence — best margin & terms; we bring the demand engine they aren't running.`;
  } else if (p.mvt_presence === "emerging") {
    reason = `Quality brand${ac} building MVT (${cats}) — early enough to win preferred-facilitator terms before the desk matures.`;
  } else {
    reason = `Established IPS desk${ac} (${cats}); compete on our source-market demand + service depth. Thinner margin — pursue for volume/brand, not terms.`;
  }
  return { score, reason };
}

// ACCESS SCORE — "how do we actually get in the door", as a 0-100. The warm-intro re-think: a set of real
// introductions (Sachin's own desk at Fortis Bangalore; the Aster family; the ex-Manipal legal head) changes
// who we work first far more than fit does. A great account we can't reach is a worse *next move* than a good
// account a trusted person will introduce us into tomorrow. Purely about reachability, not value.
export const CONNECTION_W = {
  adviser_desk: 100,     // our own adviser's desk — the warmest path that exists (Fortis Bannerghatta / Sachin)
  warm_group: 85,        // a real group/board-level introduction (owning family, former group officer)
  warm_individual: 65,   // a named warm contact inside the org, below board level
  named_public: 35,      // we know the named decision-maker (public), but have no warm path to them
  desk: 15,              // only a generic international-desk inbox
  cold: 5,               // no path yet
};
export function accessScore(p) {
  const score = CONNECTION_W[p.connection] ?? CONNECTION_W.cold;
  const label = { adviser_desk: "adviser's own desk", warm_group: "warm group-level intro",
    warm_individual: "warm individual contact", named_public: "named but no warm path",
    desk: "generic desk only", cold: "no path yet" }[p.connection] ?? "no path yet";
  return { score, label };
}

// SPEED SCORE — time-to-market, as a 0-100 (higher = faster to a signed pilot). Sachin's read, 2026-07-22:
// with an established international desk, partnering is *fast once the commission number is agreed* — the fee
// is the real gate, not process. So speed is driven by (a) how settled the commission conversation is and
// (b) how ready the desk already is to take an international patient (readiness()) — a latent brand with no
// int'l desk is slow to switch on even if it says yes tomorrow. Pass the same readiness() object.
const COMMISSION_BASE = { agreed: 60, in_discussion: 35, unknown: 20 };
export function speedScore(p, rd) {
  const base = COMMISSION_BASE[p.commission_status] ?? COMMISSION_BASE.unknown;
  const readyLift = Math.round((rd?.score ?? 40) * 0.3);   // an already-live desk onboards in weeks, not months
  const score = Math.min(100, base + readyLift);
  const months = score >= 75 ? "weeks" : score >= 50 ? "1–2 months" : "3–6 months";
  const commTxt = { agreed: "fee agreed", in_discussion: "fee in discussion", unknown: "fee not yet raised" }[p.commission_status] ?? "fee not yet raised";
  return { score, months, label: commTxt };
}

// PURSUIT SCORE — the single number the account board now ranks on: WHO DO WE WORK FIRST. It blends the three
// axes deliberately, access-weighted, because the warm intros are the change that prompted this. fit still
// matters (a warm intro into a low-value account isn't a priority) and speed breaks ties toward what closes
// this quarter, but reach leads. Weights: access .45 · fit .30 · speed .25. Kept SEPARATE from fit_score so
// the margin thesis stays legible on its own and we never again hand-hack fit_score to force warm accounts up.
export function pursuitScore({ fit, access, speed }) {
  const score = Math.round(0.45 * access + 0.30 * fit + 0.25 * speed);
  const band = score >= 70 ? "work now" : score >= 45 ? "warm up" : "park / build path";
  return { score, band };
}
