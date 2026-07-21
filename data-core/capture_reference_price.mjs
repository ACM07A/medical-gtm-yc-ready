// CAPTURE A REAL PRICE onto a ladder rung — the human bridge for pricing, mirroring capture_poc.mjs.
// A price only becomes 'cited' through this script, which REQUIRES a source string. There is deliberately
// no path that writes a price without an attribution: an uncited number on a patient-facing comparison is
// the single most damaging thing this system could publish.
//
//   node --experimental-sqlite data-core/capture_reference_price.mjs cardiac bypass OM OM 9000 14000 "Badr Al Samaa quote, 2026-07-18"
import { open, logRun } from "./db.mjs";

const [cat, proc, market, dest, low, high, ...src] = process.argv.slice(2);
const source = src.join(" ").trim();
if (!cat || !proc || !market || !dest || !low || !high || !source) {
  console.error("usage: capture_reference_price.mjs <category> <procedure_key> <market> <dest> <low> <high> \"<source citation>\"");
  process.exit(1);
}
const lo = Number(low), hi = Number(high);
if (!(lo > 0 && hi >= lo)) { console.error("✗ low/high must be positive numbers with high >= low"); process.exit(1); }

const db = open();
const r = db.prepare(
  `UPDATE reference_price SET low=?, high=?, status='cited', source_cite=?, retrieved=date('now')
    WHERE category_id=? AND procedure_key=? AND market_code=? AND dest_code=?`
).run(lo, hi, source, cat, proc, market.toUpperCase(), dest.toUpperCase());

if (!r.changes) {
  console.error(`✗ no such rung (${cat}/${proc}/${market}/${dest}). Run price_gaps.mjs to see valid rungs.`);
  process.exit(1);
}
logRun(db, "pricing", "capture-reference-price", `${cat}/${proc} ${market}→${dest}: $${lo}–${hi} (${source})`);
console.log(`✓ ${cat}/${proc} · ${market} → ${dest}: $${lo.toLocaleString()}–$${hi.toLocaleString()}`);
console.log(`  cited: ${source}`);
