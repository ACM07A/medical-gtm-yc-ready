// PRICING MODEL — the commission economics, designed to run on ACTUAL hospital rate cards and to be honest
// when it's still running on indicative ranges. Three things it makes explicit:
//   1. For every CONFIRMED partner rate card (capture_partner_price.mjs), the per-case economics: what the
//      patient pays, our fee at that partner's negotiated commission, what the hospital nets, and the net
//      UPLIFT the hospital keeps vs incumbent agents at 25–33% (founder numbers, 2026-07-22) — computed
//      conservatively against the 25% floor. Our structure: 20% entry, stepping down on revenue tiers.
//   2. Where we're still on INDICATIVE category ranges (no confirmed card yet) — clearly labelled, never
//      shown to a patient — so the model is never mistaken for real quotes.
//   3. The RATE-CARD GAP: the partners we're actively pursuing (top pursuit_score) that have no confirmed
//      card. This is the "design basis actual" worklist — the real numbers to collect on the next call.
// Read-only except a run-log summary. FREE (no external calls).
//   node --experimental-sqlite data-core/pricing_model.mjs
import { open, logRun, commissionModel, CATEGORY_COMPARATOR, COMMISSION_TIERS, INCUMBENT_COMMISSION } from "./db.mjs";
const db = open();
const A = (s, ...p) => db.prepare(s).all(...p);
const O = (s, ...p) => db.prepare(s).get(...p);
const money = (r) => `$${(r.low || 0).toLocaleString()}–${(r.high || 0).toLocaleString()}`;

// The partners we actually care about pricing for: the ones we're pursuing (warm/first set), highest first.
const PURSUED = A(`SELECT id,name,commission_target_pct,pursuit_score FROM partner
  WHERE pursuit_score >= 45 OR notes LIKE '%FIRST PARTNER SET%' ORDER BY pursuit_score DESC, name`);

// Indicative category package (india range) for a category's representative procedure — the fallback.
function indicative(categoryId) {
  const c = CATEGORY_COMPARATOR[categoryId];
  if (!c) return null;
  const p = O(`SELECT india_low low, india_high high FROM category_price
    WHERE category_id=? AND lower(procedure) LIKE ? ORDER BY india_low LIMIT 1`, categoryId, `%${c.match}%`)
    || O(`SELECT india_low low, india_high high FROM category_price WHERE category_id=? ORDER BY india_low LIMIT 1`, categoryId);
  return p?.low ? { ...p, procKey: c.match, label: c.label } : null;
}

console.log("PRICING MODEL — commission economics (actual rate cards where we have them)\n");

// 1) Confirmed rate cards → real per-case economics.
const confirmed = A(`SELECT pp.*, p.name, p.commission_target_pct FROM partner_price pp
  JOIN partner p ON p.id=pp.partner_id WHERE pp.status='confirmed' ORDER BY p.name, pp.category_id`);
console.log(`CONFIRMED rate cards (actuals): ${confirmed.length}`);
for (const r of confirmed) {
  const fee = r.commission_target_pct ?? COMMISSION_TIERS[0].pct;
  const m = commissionModel({ low: r.low, high: r.high }, fee);
  console.log(`  ${r.name.slice(0, 28).padEnd(28)} ${r.category_id}/${r.procedure_key}  patient ${money(m.patient)}  our fee@${fee}% ${money(m.ourFee)}  hospital nets ${money(m.hospitalNet)}  (+${money(m.netUplift)} vs ${m.incumbentPct}%)`);
}
if (!confirmed.length) console.log("  (none yet — every number below is indicative until a real card is captured)");

// 2) + 3) For each pursued partner × the categories it's strong in: confirmed, else indicative + gap flag.
let gaps = 0, filled = 0;
console.log(`\nBY PURSUED PARTNER (indicative where no confirmed card — GO GET THESE):`);
for (const p of PURSUED) {
  const cats = A(`SELECT category_id FROM partner_category WHERE partner_id=?`, p.id).map((r) => r.category_id);
  const fee = p.commission_target_pct ?? COMMISSION_TIERS[0].pct;
  for (const catId of cats) {
    if (!CATEGORY_COMPARATOR[catId]) continue;               // only wedge categories with a comparator procedure
    const c = CATEGORY_COMPARATOR[catId];
    const card = O(`SELECT low, high FROM partner_price WHERE partner_id=? AND category_id=? AND procedure_key=? AND status='confirmed'`, p.id, catId, c.match);
    if (card) { filled++; continue; }                         // already shown above
    const ind = indicative(catId);
    if (!ind) continue;
    gaps++;
    const m = commissionModel({ low: ind.low, high: ind.high }, fee);
    console.log(`  ⚠ ${p.name.slice(0, 26).padEnd(26)} ${catId.padEnd(9)} indicative ${money(ind)}  → at ${fee}% hospital would net ${money(m.hospitalNet)}, our fee ${money(m.ourFee)}  [need real card]`);
  }
}

const denom = gaps + filled;
console.log(`\nCOMMISSION STRUCTURE (opening proposal — negotiable per partner): incumbents charge ${INCUMBENT_COMMISSION.low}–${INCUMBENT_COMMISSION.high}%.`);
for (const t of COMMISSION_TIERS) console.log(`  ${String(t.pct).padStart(2)}%  ${t.label}`);
console.log(`  Uplift shown above is CONSERVATIVE (vs the ${INCUMBENT_COMMISSION.low}% incumbent floor); vs a ${INCUMBENT_COMMISSION.high}% incumbent it is larger still.`);
console.log(`\nRATE-CARD GAP: ${filled}/${denom} pursued partner×category cells have a CONFIRMED rate. ${gaps} still indicative.`);
console.log(`Capture a real card:  node --experimental-sqlite data-core/capture_partner_price.mjs <partner_id> <category> <procKey> <low> <high> confirmed "<includes>" "<source>"`);
logRun(db, "Pricing", "Pricing-model review",
  `${confirmed.length} confirmed rate cards; ${filled}/${denom} pursued cells priced on actuals, ${gaps} still indicative`,
  null, gaps ? "pending" : "ok");
db.close();
