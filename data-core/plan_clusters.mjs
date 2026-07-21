// TOPIC CLUSTER PLANNER — turns 30 orphan cost guides into a linked organic engine.
//
// WHY: the economics say organic acquisition is the only viable channel at mid-ticket, and 30 unlinked
// pages is not an organic strategy — it is 30 pages. Search rewards topical depth and internal structure:
// one authoritative hub per (category × market) surrounded by spokes that answer the specific, long-tail
// questions people actually type, each linking back. That structure is also how a real reader researches.
//
// WHERE THE TOPICS COME FROM — and why they are not invented keywords: the 22-stage comms machine already
// encodes what a patient asks and where they stall, because it was built from the real journey. Every
// objection branch (price / trust / safety / timing), every document step, every stress case is a question
// somebody typed into a search bar before they ever messaged us. Reusing that map means the content answers
// the questions the funnel already proves people have, rather than the questions a keyword tool guesses.
//
// Planning is deterministic and free. GENERATION is what costs tokens, so this writes a prioritised plan
// and stops — the waves are generated separately, wedge-first, through the tier-2 failover chain.
//
//   node --experimental-sqlite data-core/plan_clusters.mjs [--write]
import { open, logRun, priceLadder, CATEGORY_COMPARATOR } from "./db.mjs";

const db = open();
const WRITE = process.argv.includes("--write");
for (const c of ["kind TEXT DEFAULT 'hub'", "topic TEXT", "priority INTEGER DEFAULT 3"]) {
  try { db.exec(`ALTER TABLE content_asset ADD COLUMN ${c}`); } catch {}
}

// Journey-derived spokes. `stage` names the point in the funnel this question belongs to — kept so a spoke
// can be traced back to the moment it exists to unblock, and so CTAs can match the reader's actual position.
const JOURNEY_SPOKES = [
  { stage: "triage",            slug: "choosing-hospital",   t: (c, m) => `How to choose a hospital in India for ${c} — what to check from ${m}` },
  { stage: "product_selection", slug: "whats-included",      t: (c) => `What a ${c} package in India includes — and what it does not` },
  { stage: "objection",         slug: "is-cheaper-worse",    t: (c) => `Is cheaper treatment worse? What ${c} costs in India, honestly explained` },
  { stage: "objection",         slug: "safety-record",       t: (c, m) => `How to verify an Indian hospital's accreditation and results from ${m}` },
  { stage: "visa",              slug: "medical-visa",        t: (c, m) => `Getting an Indian medical visa from ${m} — documents, timing, and the attendant visa` },
  { stage: "visa",              slug: "documents",           t: (c) => `The documents you need before travelling to India for ${c}` },
  { stage: "travel",            slug: "how-long-stay",       t: (c) => `How long you will be in India for ${c} — and where you stay` },
  { stage: "complication",      slug: "if-things-go-wrong",  t: (c) => `What happens if something goes wrong during ${c} treatment abroad` },
  { stage: "post_op",           slug: "recovery-and-flying", t: (c) => `Recovering after ${c} in India — and when you can fly home` },
  { stage: "booking",           slug: "how-payment-works",   t: (c) => `How paying for ${c} in India actually works — deposits, transfers, and insurance` },
];

// Driver-specific spokes. The reader's travel trigger changes which long-tail question they type first.
const DRIVER_SPOKES = {
  capability: { slug: "not-available-at-home", t: (c, m) => `${c} when it is not available in ${m} — how patients get treated abroad safely` },
  queue:      { slug: "waiting-times",         t: (c, m) => `${c} waiting times in ${m} — what the wait costs you and what the alternatives are` },
  cost:       { slug: "local-vs-india",        t: (c, m) => `${c} in ${m} vs India — the honest price comparison` },
};

const cells = db.prepare(
  `SELECT cm.category_id, cm.market_code, cm.demand_driver, c.name AS cat, m.name AS mname, m.tier
     FROM category_market cm
     JOIN category c ON c.id = cm.category_id
     JOIN market m ON m.code = cm.market_code
    WHERE c.status = 'launch'
    ORDER BY m.tier, cm.category_id`).all();

const ins = db.prepare(
  `INSERT INTO content_asset (category_id, market_code, language, title, file_ref, status, kind, topic, cluster, priority)
   VALUES (?,?,?,?,?,'planned',?,?,?,?)`);
const exists = db.prepare(`SELECT id FROM content_asset WHERE category_id=? AND market_code=? AND language='en' AND topic IS ?`);

// WEDGE FIRST. Generating 400 pages at once is how you get 400 mediocre pages and a thin domain. Cardiac
// and oncology in tier-A markets are the wedge, so they are wave 1; everything else queues behind them.
const WEDGE = new Set(["cardiac", "oncology"]);
const priorityOf = (cell) => (WEDGE.has(cell.category_id) && cell.tier === "A" ? 1 : WEDGE.has(cell.category_id) ? 2 : 3);

let planned = 0, skipped = 0;
const byPriority = { 1: 0, 2: 0, 3: 0 };

for (const cell of cells) {
  const hubSlug = `${cell.category_id}-cost-india-${cell.market_code.toLowerCase()}`;
  const prio = priorityOf(cell);
  const spokes = [...JOURNEY_SPOKES];

  const ds = DRIVER_SPOKES[cell.demand_driver];
  if (ds) spokes.unshift({ stage: "intake", slug: ds.slug, t: ds.t });

  // Comparison spokes, one per international rung on that market's price ladder. These are the highest-intent
  // long-tail queries in medical travel — somebody typing "India vs Türkiye" is comparing, not browsing.
  const ladder = priceLadder(db, cell.category_id, cell.market_code);
  for (const r of (ladder?.rungs || []).filter((x) => x.tier === "international")) {
    const dest = (r.label || "").replace(/\s*\(.*$/, "").trim();
    if (!dest) continue;
    spokes.push({ stage: "product_selection", slug: `vs-${r.dest.toLowerCase()}`,
      t: (c) => `${c} in India vs ${dest} — cost, quality and travel compared` });
  }

  for (const s of spokes) {
    const topic = s.slug;
    if (exists.get(cell.category_id, cell.market_code, topic)) { skipped++; continue; }
    const title = s.t(cell.cat, cell.mname);
    const file = `outputs/content/${hubSlug}-${topic}.md`;
    if (WRITE) ins.run(cell.category_id, cell.market_code, "en", title, file, "spoke", topic, hubSlug, prio);
    planned++; byPriority[prio]++;
  }
}

console.log(`\n  TOPIC CLUSTER PLAN ${WRITE ? "" : "(dry run — pass --write to save)"}`);
console.log(`  ${cells.length} hubs · ${planned} spokes planned${skipped ? ` · ${skipped} already existed` : ""}`);
console.log(`\n  Generation waves (wedge first — 400 pages at once is 400 mediocre pages):`);
console.log(`    wave 1  ${String(byPriority[1]).padStart(3)}  cardiac + oncology, tier-A markets`);
console.log(`    wave 2  ${String(byPriority[2]).padStart(3)}  cardiac + oncology, remaining markets`);
console.log(`    wave 3  ${String(byPriority[3]).padStart(3)}  all other categories`);
console.log(`\n  Every spoke traces to a real funnel stage — the questions the journey already proves people ask.\n`);

if (WRITE) logRun(db, "Content", "plan-clusters", `${planned} spokes across ${cells.length} hubs`);
else console.log(`  Nothing saved. Re-run with --write.\n`);
