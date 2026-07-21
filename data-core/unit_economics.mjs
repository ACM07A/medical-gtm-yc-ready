// UNIT ECONOMICS — what a patient costs us, stage by stage.
//
// The question this answers is the one a hospital partner actually asks: "what am I getting, and what did
// it cost you to produce?" So the model is a funnel with cost accumulating down it, not a spreadsheet of
// blended averages. The number that matters is the cost of a patient AT THE HANDOFF POINT — a pre-triaged,
// high-intent case file — because that is the unit we sell to a hospital, not a treated patient.
//
// Cost of dropouts is absorbed by the survivors: that is why cost-per-survivor climbs down the funnel, and
// why "cost per lead" is a meaningless number to quote anyone.
//
// HONESTY CONTRACT: package prices come live from cited category_price rows. Every rate and cost below is
// an ASSUMPTION labelled with who must confirm it. The ones marked ASK are the questions for Aster /
// Manipal / Fortis — do not quote them externally until a real number replaces them.
//
//   npm run economics                      · npm run economics -- --cat ortho --conv 0.30
import { open } from "./db.mjs";

const db = open();
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const num = (k, d) => Number(arg(k, d));

const CAT = String(arg("cat", "cardiac"));
const COHORT = 1000;                                   // people who see a guide, for legibility

// ── The funnel ───────────────────────────────────────────────────────────────────────────────────────
// `rate` = share of the previous stage that reaches this one. `cost` = $ spent per ENTRANT to that stage.
const STAGES = [
  { key: "reach",     label: "Sees a cost guide or ad",              rate: 1,               cost: 0.45, note: "content amortised + paid media, blended" },
  { key: "lead",      label: "Messages us on WhatsApp",              rate: num("ctr", 0.02), cost: 0.08, note: "first agent turns" },
  { key: "qualified", label: "Treatment, country, timeline captured", rate: num("q", 0.35),  cost: 0.35, note: "multi-turn qualification, agent-led" },
  { key: "triaged",   label: "Reports in · structured case file",     rate: num("t", 0.55),  cost: 4.20, handoff: true,
    note: "report chasing, OCR/structuring, human clinical-literacy review ~15 min" },
  { key: "quoted",    label: "Hospital returns opinion + estimate",   rate: num("qt", 0.70), cost: 0.60, note: "relay + follow-up" },
  { key: "booked",    label: "Accepts · deposit paid",                rate: num("conv", 0.30), cost: 2.10, note: "objections, payment, sponsor paperwork" },
  { key: "treated",   label: "Travels and is treated",               rate: num("show", 0.85), cost: 40.00, note: "concierge: documents, logistics, interpreter, family updates" },
];

// ── Grounded: what a treated patient is worth ────────────────────────────────────────────────────────
const cat = db.prepare(
  `SELECT c.id, c.name, AVG((p.india_low + p.india_high) / 2.0) AS pkg
     FROM category c JOIN category_price p ON p.category_id = c.id WHERE c.id = ? GROUP BY c.id`).get(CAT)
  || db.prepare(`SELECT c.id, c.name, AVG((p.india_low + p.india_high)/2.0) AS pkg FROM category c
                 JOIN category_price p ON p.category_id=c.id GROUP BY c.id ORDER BY pkg DESC LIMIT 1`).get();

const COMMISSION = num("commission", 0.20);            // ASK — the real rate Aster/Manipal pay today
const AGENCY_CAC = num("agencycac", 1400);             // ASSUMED — coordinator time + media + sub-agent cut

// ── Walk the funnel ──────────────────────────────────────────────────────────────────────────────────
let n = COHORT, spend = 0;
const rows = [];
for (const s of STAGES) {
  n = n * s.rate;
  spend += n * s.cost;                                 // cost is incurred on everyone who reaches the stage
  rows.push({ ...s, n, spend, per: n > 0 ? spend / n : Infinity });
}

// Sign goes OUTSIDE the currency symbol ("-$267", not "$-266.67"), and anything above $100 loses the cents
// — a contribution figure quoted to the cent implies a precision these assumptions do not have.
const $ = (v) => (v < 0 ? "-" : "") + "$" + (Math.abs(v) >= 100 ? Math.round(Math.abs(v)).toLocaleString() : Math.abs(v).toFixed(2));
const handoff = rows.find((r) => r.handoff);
const treated = rows[rows.length - 1];
const fee = cat.pkg * COMMISSION;

console.log(`\n  WHAT A PATIENT COSTS US — ${cat.name}, package ${$(cat.pkg)}\n`);
console.log(`  ${"".padEnd(42)}${"people".padStart(8)}${"cost each".padStart(12)}`);
console.log(`  ${"─".repeat(62)}`);
for (const r of rows) {
  const mark = r.handoff ? "▶" : " ";
  const people = r.n >= 10 ? Math.round(r.n).toString() : r.n.toFixed(1);
  console.log(`${mark} ${r.label.padEnd(42)}${people.padStart(8)}${$(r.per).padStart(12)}${r.handoff ? "   ◀ HANDOFF" : ""}`);
}

console.log(`\n  ▶ THE UNIT WE SELL: a pre-triaged, high-intent case file`);
console.log(`     ${Math.round(handoff.n)} of ${COHORT} readers reach it · costs us ${$(handoff.per)} to produce`);
console.log(`     What the hospital receives: treatment need confirmed, country and timeline captured,`);
console.log(`     reports collected and structured into a reviewable case file, indicative price band`);
console.log(`     already accepted, and ${Math.round((rows[5].n / handoff.n) * 100)}% of these go on to book.`);

console.log(`\n  ECONOMICS PER TREATED PATIENT`);
console.log(`     Commission (${Math.round(COMMISSION * 100)}% of ${$(cat.pkg)})   ${$(fee).padStart(10)}`);
console.log(`     Our all-in cost                ${$(treated.per).padStart(10)}`);
console.log(`     Contribution                   ${$(fee - treated.per).padStart(10)}   (${Math.round(((fee - treated.per) / fee) * 100)}% of the fee)`);
console.log(`     A traditional agency, same fee ${$(fee - AGENCY_CAC).padStart(10)}   (${Math.round(((fee - AGENCY_CAC) / fee) * 100)}% — coordinator time scales with leads)`);

console.log(`\n  ⚠ NEEDS A REAL NUMBER — ask Aster / Manipal / Fortis:`);
console.log(`     • the commission rate they actually pay a facilitator today   (using ${Math.round(COMMISSION * 100)}%)`);
console.log(`     • what share of their international inquiries convert          (using ${Math.round(STAGES[5].rate * 100)}% quote→book)`);
console.log(`     • what an inquiry costs them through their current agent panel (using ${$(AGENCY_CAC)})`);
console.log(`\n  Sensitivity:  npm run economics -- --cat oncology --conv 0.20 --commission 0.25\n`);
