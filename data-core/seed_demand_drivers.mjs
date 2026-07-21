// DEMAND DRIVERS — why this market travels for this treatment.
//
// Country is the wrong unit for content strategy. A Kenyan patient needing a bone-marrow transplant and a
// Kenyan patient needing a dental implant are not the same reader: the first cannot get the treatment at
// home at all, the second can but not at that price. Writing both the same way — which is what a
// (category × market) grid does by default — produces content that half-answers everyone.
//
// So the driver is stored per (category × market) and it changes the whole page: the headline, the first
// objection to handle, what "proof" means, and the CTA. Three drivers:
//
//   capability — the treatment is unavailable or unreliable at home. The reader's fear is competence and
//                safety, not price. Lead with accreditation, procedure volume, named specialists.
//   queue      — available at home, but the wait is unacceptable. The reader is angry, not scared, and is
//                comparing a date, not a hospital. Lead with time-to-treatment.
//   cost       — available and timely at home, but unaffordable privately. Lead with an honest price
//                ladder against their real local option.
//
//   node --experimental-sqlite data-core/seed_demand_drivers.mjs
import { open, logRun } from "./db.mjs";

const db = open();
try { db.exec(`ALTER TABLE category_market ADD COLUMN demand_driver TEXT`); } catch {}
try { db.exec(`ALTER TABLE category_market ADD COLUMN driver_note TEXT`); } catch {}

// Tertiary/complex care that a weaker health system genuinely cannot deliver at volume. For these,
// capability beats price as the reason to travel — and price-led content actively misreads the reader.
const COMPLEX = new Set(["oncology", "cardiac"]);

// Region → how that region's demand is generated. Europe is deliberately separate: those patients are not
// escaping an absent service, they are escaping a WAITING LIST. Different trigger, different competitor
// set (Türkiye and Poland are closer and cheaper to reach), and a different regulatory perimeter — GDPR
// requires SCCs and a transfer risk assessment before their data can be processed in India at all.
function driverFor(region, categoryId) {
  if (region === "europe") return ["queue", "Available at home but queued; the reader is comparing a DATE, not a hospital"];
  if (region === "africa") {
    return COMPLEX.has(categoryId)
      ? ["capability", "Limited domestic tertiary capacity; the reader's fear is competence and safety"]
      : ["cost", "Available privately at home but expensive; compare against the real local private price"];
  }
  if (region === "middle_east") {
    return COMPLEX.has(categoryId)
      ? ["capability", "Complex cases routinely referred abroad; some state-sponsored — check sponsorship route"]
      : ["cost", "Strong local private sector; we compete on honest price, not availability"];
  }
  if (region === "se_asia") {
    return COMPLEX.has(categoryId)
      ? ["capability", "Regional tertiary gaps; competes with Thailand and Singapore, not with home"]
      : ["cost", "Price-led, with Thailand and Malaysia as the real alternatives"];
  }
  return ["cost", "Default — verify the actual travel trigger before writing for this market"];
}

const cells = db.prepare(
  `SELECT cm.category_id, cm.market_code, m.region, m.name AS mname
     FROM category_market cm JOIN market m ON m.code = cm.market_code`).all();

const upd = db.prepare(`UPDATE category_market SET demand_driver=?, driver_note=? WHERE category_id=? AND market_code=?`);
const tally = {};
for (const c of cells) {
  const [driver, note] = driverFor(c.region, c.category_id);
  upd.run(driver, note, c.category_id, c.market_code);
  tally[driver] = (tally[driver] || 0) + 1;
}

logRun(db, "Content", "seed-demand-drivers", Object.entries(tally).map(([k, v]) => `${k}:${v}`).join(" · "));
console.log(`\n✓ Demand drivers set on ${cells.length} (category × market) cells`);
for (const [k, v] of Object.entries(tally)) console.log(`   ${k.padEnd(11)} ${v} cells`);
console.log(`\n  These change the page, not just a tag: headline, first objection, what counts as proof, and the CTA.\n`);
