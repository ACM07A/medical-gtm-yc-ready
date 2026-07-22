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
// ACQUISITION CHANNEL is the single biggest lever and the one most easily fudged. Google charges us exactly
// what it charges an incumbent agency — there is NO AI advantage on media cost, and an earlier version of
// this model smuggled one in via an unrealistically cheap cost-per-reader. Our advantage is in the cost of
// CONVERTING and SERVING a lead, not acquiring one. So the channel is explicit and defaults to paid, the
// honest worst case: organic has to be earned over 6-12 months before it can be assumed.
const CHANNEL = String(arg("channel", "paid"));
const REACH_COST = { paid: 2.50, organic: 0.05, blended: 1.00 }[CHANNEL] ?? 2.50;

// Each stage carries the source for its rate. CITED = a published benchmark. ASSUMED = ours, unvalidated.
const STAGES = [
  { key: "reach", label: "Sees a cost guide or ad", rate: 1, cost: num("reachcost", REACH_COST),
    src: CHANNEL === "paid" ? "CITED — healthcare CPC $1.49 avg, $5.00 physicians/surgeons, $5-50 healthcare keywords"
       : CHANNEL === "organic" ? "ASSUMED — content amortised over its lifetime; near-zero marginal cost at scale"
       : "ASSUMED — mix of the two" },
  { key: "lead", label: "Messages us on WhatsApp", rate: num("ctr", 0.045), cost: 0.08,
    src: "CITED — medical-tourism landing pages convert 4.5-7% of paid visitors; healthcare site avg 3.2%" },
  { key: "qualified", label: "Treatment, country, timeline captured", rate: num("q", 0.35), cost: 0.35,
    src: "ASSUMED — no public benchmark found" },
  { key: "triaged", label: "Reports in · structured case file", rate: num("t", 0.55), cost: 4.20, handoff: true,
    src: "ASSUMED — no public benchmark found; cost = ~15 min clinically-literate review (generous vs Indian coordinator rates)" },
  { key: "quoted", label: "Hospital returns opinion + estimate", rate: num("qt", 0.70), cost: 0.60,
    src: "ASSUMED — no public benchmark found" },
  { key: "booked", label: "Accepts · pays 80-100% upfront (not a light deposit)", rate: num("conv", 0.30), cost: 2.10,
    src: "PARTLY CITED — 10% inquiry→conversion end-to-end is the industry target this rate is back-solved toward; " +
         "the 80-100%-upfront framing is CITED — Sachin Rai interview 2026-07-22: hospitals require most or all of " +
         "the package before surgery, not a token deposit. That single payment is a real cliff, not a formality — " +
         "likely a large share of why this stage's drop is the steepest in the funnel." },
  { key: "treated", label: "Travels and is treated", rate: num("show", 0.85), cost: 40.00,
    src: "ASSUMED — no published no-show/visa-denial data exists for India medical visas; 85% is optimistic" },
];

// ── Grounded: what a treated patient is worth ────────────────────────────────────────────────────────
const cat = db.prepare(
  `SELECT c.id, c.name, AVG((p.india_low + p.india_high) / 2.0) AS pkg
     FROM category c JOIN category_price p ON p.category_id = c.id WHERE c.id = ? GROUP BY c.id`).get(CAT)
  || db.prepare(`SELECT c.id, c.name, AVG((p.india_low + p.india_high)/2.0) AS pkg FROM category c
                 JOIN category_price p ON p.category_id=c.id GROUP BY c.id ORDER BY pkg DESC LIMIT 1`).get();

// ANCHORED (not just ASSUMED anymore) — founder + Sachin Rai numbers, 2026-07-22: INCUMBENT agents charge
// hospitals 25–33%. Our fee is a volume ramp that STEPS UP from 20% to 25% (₹0–20L / 20–50L / 50L+ routed),
// so we model our own economics at the 20% ENTRY tier — below incumbents on purpose, and a deliberately
// conservative take on our own revenue per case (it rises toward 25% only once volume proves out).
const COMMISSION = num("commission", 0.20);
const AGENCY_CAC = num("agencycac", 1400);             // ASSUMED — coordinator time + media + sub-agent cut

// ── Walk the funnel ──────────────────────────────────────────────────────────────────────────────────
// `mult` scales every conversion rate, to walk a pessimistic / base / optimistic band. The point of the
// band is honesty: only the package price is a measured number here. Everything else is an assumption, and
// a point estimate would imply a confidence this model has not earned. Report ranges until the first real
// cohort replaces the guesses — a single figure like "$122" invites people to quote it as a fact.
function walk(mult = 1) {
  let n = COHORT, spend = 0;
  const rows = [];
  for (const s of STAGES) {
    n = n * Math.min(1, s.rate * (s.key === "reach" ? 1 : mult));
    spend += n * s.cost;                               // cost is incurred on everyone who reaches the stage
    rows.push({ ...s, n, spend, per: n > 0 ? spend / n : Infinity });
  }
  return rows;
}
const BAND = { low: 0.6, high: 1.5 };                  // ±, applied to every conversion rate together
const rows = walk(1), rowsLow = walk(BAND.low), rowsHigh = walk(BAND.high);

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

const hLow = rowsHigh.find((r) => r.handoff), hHigh = rowsLow.find((r) => r.handoff);   // better funnel = lower cost
console.log(`\n  ▶ THE UNIT WE SELL: a pre-triaged, high-intent case file`);
console.log(`     ${Math.round(handoff.n)} of ${COHORT} readers reach it · costs us ${$(hLow.per)}–${$(hHigh.per)} to produce (base ${$(handoff.per)})`);
console.log(`     What the hospital receives: treatment need confirmed, country and timeline captured,`);
console.log(`     reports collected and structured into a reviewable case file, indicative price band`);
console.log(`     already accepted, and ${Math.round((rows[5].n / handoff.n) * 100)}% of these go on to book.`);

console.log(`\n  ECONOMICS PER TREATED PATIENT`);
console.log(`     Commission (${Math.round(COMMISSION * 100)}% of ${$(cat.pkg)})   ${$(fee).padStart(10)}`);
console.log(`     Our all-in cost                ${$(treated.per).padStart(10)}`);
console.log(`     Contribution                   ${$(fee - treated.per).padStart(10)}   (${Math.round(((fee - treated.per) / fee) * 100)}% of the fee)`);
console.log(`     A traditional agency, same fee ${$(fee - AGENCY_CAC).padStart(10)}   (${Math.round(((fee - AGENCY_CAC) / fee) * 100)}% — coordinator time scales with leads)`);

console.log(`\n  ⚠ NEEDS A REAL NUMBER — ask Aster / Manipal / Fortis:`);
console.log(`     • THEIR commission rate (anchored to a real 20-25% desk range, not guessed — still theirs to confirm, using ${Math.round(COMMISSION * 100)}%)`);
console.log(`     • what share of their international inquiries convert          (using ${Math.round(STAGES[5].rate * 100)}% quote→book)`);
console.log(`     • what an inquiry costs them through their current agent panel (using ${$(AGENCY_CAC)})`);
// Where every number came from — printed every run, so nobody quotes this model without its foundations.
console.log(`\n  PROVENANCE (channel: ${CHANNEL})`);
for (const s of STAGES) console.log(`     ${s.key.padEnd(10)} ${s.src}`);
console.log(`     package    CITED — data-core category_price rows`);
console.log(`     commission ANCHORED ${Math.round(COMMISSION * 100)}% — founder + Sachin 2026-07-22: incumbents charge 25-33%, we ramp 20%→22.5%→25% (₹0-20L/20-50L/50L+); modelled at our 20% entry`);
const cited = STAGES.filter((s) => s.src.startsWith("CITED")).length;
console.log(`\n  ${cited} of ${STAGES.length} funnel stages rest on a published benchmark. The rest are ours.`);
console.log(`  Treat every figure above as a range, not a number, until a real cohort replaces it.`);
console.log(`\n  Compare channels:  npm run economics -- --channel organic    (paid is the honest default)\n`);
