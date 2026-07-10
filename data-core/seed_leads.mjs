// Seed DEMO leads across the journey so the comms engine (comms_run.mjs) has something to act on. These are
// synthetic + PII-minimised (a handle, never real records). Idempotent: clears prior demo leads first.
//   node --experimental-sqlite data-core/seed_leads.mjs
import { open, logRun } from "./db.mjs";
const db = open();

db.prepare(`DELETE FROM service WHERE lead_id IN (SELECT id FROM lead WHERE ref LIKE 'demo-%')`).run();
db.prepare(`DELETE FROM lead WHERE ref LIKE 'demo-%'`).run();

// fields: market, category, stage, consent, source_type, {inbound_ago, outbound_ago, nudges, opted_out}
const now = "datetime('now')";
const leads = [
  ["OM", "cardiac",  "intake",            1, "own",      { out: null,  in: null,  n: 0 }],   // fresh → first touch
  ["OM", "cardiac",  "awaiting_reply",    1, "own",      { out: "-3 days", in: null, n: 0 }], // nudge due (D2 passed)
  ["OM", "cosmetic", "qualifying",        1, "own",      { out: "-2 hours", in: "-1 hours", n: 0 }], // session open
  ["OM", "ortho",    "product_selection", 1, "partner",  { out: "-1 hours", in: "-30 minutes", n: 0 }],
  ["OM", "cardiac",  "visa",              1, "own",      { out: "-2 days", in: "-12 hours", n: 0 }], // triggers startVisa + visa_start msg
  ["OM", "ortho",    "travel",            1, "own",      { out: "-2 days", in: "-12 hours", n: 0 }], // triggers stay search + stay_options msg
  ["NG", "cardiac",  "intake",            0, "external", { out: null, in: null, n: 0 }],  // NO consent (plugged-in) → held
];

let i = 0;
for (const [mkt, cat, stage, consent, src, tm] of leads) {
  const ref = `demo-${++i}-${mkt.toLowerCase()}-${cat}`;
  const inAt = tm.in ? `datetime('now','${tm.in}')` : "NULL";
  const outAt = tm.out ? `datetime('now','${tm.out}')` : "NULL";
  // build with inline datetime modifiers (safe: values are from our own array, not user input)
  db.prepare(`INSERT INTO lead
    (market_code,category_id,channel,ref,urgency,budget_band,docs_ready,consent,status,source_type,journey_stage,nudge_count,opted_out,last_inbound_at,last_outbound_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?, ${inAt}, ${outAt})`)
    .run(mkt, cat, "whatsapp", ref, "planning", "unknown", 0, consent, "qualified", src, stage, tm.n, 0);
}

const n = db.prepare(`SELECT count(*) c FROM lead WHERE ref LIKE 'demo-%'`).get().c;
logRun(db, "Comms", "Demo leads seeded", `${n} leads across journey stages for the comms engine`, null, "ok");
console.log(`✓ ${n} demo leads seeded across stages: ${leads.map((l) => l[2]).join(", ")}`);
db.close();
