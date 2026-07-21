// PRICE-LADDER RESEARCH WORKLIST — the prices we're missing, ranked by how much they matter.
// A ladder is only trustworthy if rung 1 (their best LOCAL option) has a real number; a ladder that skips
// straight to international options is the exact "India vs the USA" strawman we're replacing. So local
// rungs in live, regulator-cleared markets rank first.
//
//   node --experimental-sqlite data-core/price_gaps.mjs [market]
import { open } from "./db.mjs";

const db = open();
const only = (process.argv[2] || "").toUpperCase();

const rows = db.prepare(
  `SELECT r.category_id, r.procedure_key, r.tier, r.market_code, r.dest_code, r.dest_label,
          m.name AS market_name, m.status AS market_status, m.regulatory_status
     FROM reference_price r JOIN market m ON m.code = r.market_code
    WHERE r.status='needs_research' ${only ? "AND r.market_code=?" : ""}
    ORDER BY (m.status='live') DESC, (m.regulatory_status='verified') DESC,
             (r.tier='local') DESC, r.market_code, r.category_id`
).all(...(only ? [only] : []));

if (!rows.length) { console.log("✓ No price gaps — every ladder rung carries a cited number."); process.exit(0); }

// Priority: a missing LOCAL rung in a cleared, live market blocks publishable content. Everything else is
// enrichment. Surfacing that difference stops the team researching Poland before they've priced Muscat.
const blocking = rows.filter((r) => r.tier === "local" && r.regulatory_status === "verified");
console.log(`\n  PRICE LADDER — ${rows.length} rungs need a real number (${blocking.length} are publish-blocking)\n`);

let market = null;
for (const r of rows) {
  if (r.market_code !== market) {
    market = r.market_code;
    const flag = r.regulatory_status === "verified" ? "cleared" : "gated";
    console.log(`\n  ${r.market_name} (${market}) · ${flag}`);
  }
  const tag = r.tier === "local" ? (r.regulatory_status === "verified" ? "⚑ LOCAL" : "  local") : "  intl ";
  console.log(`   ${tag}  ${r.category_id.padEnd(10)} ${r.procedure_key.padEnd(9)} → ${r.dest_label}`);
}

console.log(`\n  Capture one with:`);
console.log(`    node --experimental-sqlite data-core/capture_reference_price.mjs <cat> <proc> <market> <dest> <low> <high> "<source>"\n`);
