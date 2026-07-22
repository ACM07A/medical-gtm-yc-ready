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
  // visa + attendant visas, accommodation (pre/post-op, patient + relatives), transfers. Delivered by
  // adapters (lib/visa, lib/stay); human-gated. status walks a per-kind lifecycle.
  //  kind   : visa | attendant_visa | stay_preop | stay_postop | transfer
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
