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

// ── THE TRAVEL BASKET — what the hospital package does NOT cover (stress-tested 2026-07-26) ──────────
// Founder question: "do hospitals actually have travel costs built in?" Answer: NO. An Indian hospital's
// international package covers the CLINICAL stay — surgeon/OT/ICU/ward/consumables/routine investigations —
// and at bigger desks an airport pickup and the desk's own interpreter. It does NOT cover flights, visa
// fees, out-of-hospital accommodation (the long post-op recovery), the attendant, food, local transport,
// or post-discharge medicines. Two consequences this model now carries:
//   1. The PATIENT's real budget is package + basket (~25-40% on top). A quote that hides the basket is
//      the industry's bait pricing — our estimates must always show the ALL-IN number.
//   2. OUR basket revenue is VENDOR-SIDE commission (standard travel-agency economics) — the patient pays
//      market rate; the vendor pays us for the booking we bring. Never a patient surcharge.
// One deeper honesty note (founder correction, 2026-07-26): a hospital will NOT pass our lower fee through as
// a cheaper patient package — it pockets the difference as margin. So we do NOT win the patient on price; the
// same treatment costs the same whether they come via us, an agent, or on their own. We win on REMOVING the
// complexity and ambiguity of the whole journey (reports → hospital quote → travel → stay → local logistics)
// and on TRANSPARENCY (showing the true all-in, not a bait package price). What our below-incumbent fee buys
// FROM the hospital is our ask: the same package inclusions it already extends to its agents, PLUS a pre-travel
// video consult with a senior specialist. Every number below is ASSUMED until a vendor agreement or a hospital
// package sheet replaces it.
const BASKET = [
  { label: "Flights — patient + 1 attendant, return", cost: 1200, ours: 0,  src: "ASSUMED Africa/ME→BLR avg; airline affiliate margin ≈ 0 — flights are a service, not a revenue line" },
  { label: "India e-medical visas ×2",                cost: 160,  ours: 25, src: "ASSUMED $80/head official fee; ours = documentation-service fee IF charged (else 0)" },
  { label: "Stay — ~14 nights near hospital",         cost: 560,  ours: 56, src: "ASSUMED $40/night guest house; ours = 10% vendor commission (industry 10-15%)" },
  { label: "Interpreter beyond the hospital desk",    cost: 150,  ours: 30, src: "ASSUMED — many desks staff Arabic/French free; ours = marketplace margin only when we supply" },
  { label: "Food + local transport + misc",           cost: 450,  ours: 0,  src: "ASSUMED — patient-managed; we only advise" },
];
const basketCost = BASKET.reduce((s, b) => s + b.cost, 0);
const basketOurs = BASKET.reduce((s, b) => s + b.ours, 0);

// ── AGENT-CHANNEL CASE — the wedge's own economics ───────────────────────────────────────────────────
// A case ingested from a travel agent's existing book skips the ENTIRE acquisition funnel (no media, no
// landing page, no cold triage volume) — the agent already holds the patient relationship. In exchange the
// agent takes a share of our facilitation fee. Serving cost = the post-acquisition stages only.
const AGENT_REVSHARE = num("revshare", 0.40);          // ASSUMED — share of OUR fee paid to the sourcing agent
const SERVE_COST = 4.20 + 0.60 + 2.10 + 40.00;         // triage-review + quote + booking + serving stages, per treated case

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

// The patient's real budget — package plus everything the package does not cover. Printed FIRST because
// it is the number the patient actually pays, and the one an honest estimate must lead with.
console.log(`\n  THE ALL-IN PATIENT BUDGET (what the package quote hides)`);
console.log(`     Hospital package (clinical)    ${$(cat.pkg).padStart(10)}   paid to the hospital directly`);
for (const b of BASKET) console.log(`     ${b.label.padEnd(42)}${$(b.cost).padStart(6)}   patient-paid, market rate`);
console.log(`     ${"ALL-IN".padEnd(42)}${$(cat.pkg + basketCost).padStart(6)}   (basket adds ${Math.round((basketCost / cat.pkg) * 100)}% on top of the package)`);

console.log(`\n  ECONOMICS PER TREATED PATIENT — our own P&L`);
console.log(`     Facilitation fee (${Math.round(COMMISSION * 100)}% of ${$(cat.pkg)}, hospital-paid)  ${$(fee).padStart(9)}`);
console.log(`     Ancillary, vendor-side (stay/visa/interpreter)  ${$(basketOurs).padStart(9)}   ASSUMED — needs vendor agreements`);
console.log(`     Our all-in cost (own-acquisition funnel)        ${$(-treated.per).padStart(9)}`);
console.log(`     Contribution — OWN-ACQUISITION case             ${$(fee + basketOurs - treated.per).padStart(9)}   (${Math.round(((fee + basketOurs - treated.per) / (fee + basketOurs)) * 100)}% of revenue)`);
console.log(`     A traditional agency, same fee                  ${$(fee - AGENCY_CAC).padStart(9)}   (coordinator time scales with leads)`);

// The wedge case: agent-sourced. No acquisition spend at all — the agent brings the patient; we pay the
// agent a fee share and run the coordination rails. This is why "agents as channel" closes the unit-economics
// gap that paid acquisition opens: the funnel above is the EARNED path, this is the DAY-ONE path.
const agentContribution = fee * (1 - AGENT_REVSHARE) + basketOurs - SERVE_COST;
console.log(`\n     Contribution — AGENT-CHANNEL case (the wedge)   ${$(agentContribution).padStart(9)}`);
console.log(`       = fee ${$(fee)} × ${Math.round((1 - AGENT_REVSHARE) * 100)}% (after ${Math.round(AGENT_REVSHARE * 100)}% agent share, ASSUMED) + ${$(basketOurs)} ancillary − ${$(SERVE_COST)} serving cost`);
console.log(`       No media spend, no funnel drop-off — the agent already holds the patient relationship.`);

console.log(`\n  ⚠ NEEDS A REAL NUMBER — ask Aster / Manipal / Fortis:`);
console.log(`     • THEIR commission rate (anchored to a real 20-25% desk range, not guessed — still theirs to confirm, using ${Math.round(COMMISSION * 100)}%)`);
console.log(`     • what share of their international inquiries convert          (using ${Math.round(STAGES[5].rate * 100)}% quote→book)`);
console.log(`     • what an inquiry costs them through their current agent panel (using ${$(AGENCY_CAC)})`);
console.log(`     • EXACTLY what their international package includes — airport pickup? interpreter? how many ward nights?`);
console.log(`       (the travel basket above assumes NONE of it is covered beyond the clinical stay)`);
console.log(`     • agent rev-share market rate for a sourced case               (using ${Math.round(AGENT_REVSHARE * 100)}% of our fee)`);
console.log(`\n  ⚠ FX RISK ON THE #1 MARKET: Ethiopia's forex controls mean a patient needs National Bank approval`);
console.log(`     to remit the package legally — incumbents route around it informally. A compliant forex path`);
console.log(`     (medical-remittance documentation as part of our checklist) is both a hard requirement and a moat.`);
// Where every number came from — printed every run, so nobody quotes this model without its foundations.
console.log(`\n  PROVENANCE (channel: ${CHANNEL})`);
for (const s of STAGES) console.log(`     ${s.key.padEnd(10)} ${s.src}`);
console.log(`     package    CITED — data-core category_price rows`);
console.log(`     commission ANCHORED ${Math.round(COMMISSION * 100)}% — founder + Sachin 2026-07-22: incumbents charge 25-33%, we ramp 20%→22.5%→25% (₹0-20L/20-50L/50L+); modelled at our 20% entry`);
const cited = STAGES.filter((s) => s.src.startsWith("CITED")).length;
console.log(`\n  ${cited} of ${STAGES.length} funnel stages rest on a published benchmark. The rest are ours.`);
console.log(`  Treat every figure above as a range, not a number, until a real cohort replaces it.`);
console.log(`\n  Compare channels:  npm run economics -- --channel organic    (paid is the honest default)\n`);
