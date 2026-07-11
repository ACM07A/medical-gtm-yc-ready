// CROSS-TENANT BENCHMARKS — the moat, done in a legally-clean way (see build-os/11).
// We CANNOT reuse one operator's patient data for another — that's siloed, full stop. What we CAN build is
// de-identified aggregate LEARNING: category×market conversion, funnel shape, message performance. This
// module computes those aggregates across ALL tenants while emitting NO tenant identifier and NO patient
// handle, and it SUPPRESSES any cell below a k-anonymity threshold so nothing is re-identifiable. That
// aggregate — not anyone's patient rows — is what compounds and is impossible for a single operator to hold.
//   node --experimental-sqlite data-core/benchmarks.mjs [k]
import { open } from "./db.mjs";

// Coarse funnel buckets over the comms-machine journey stages (order = the funnel).
const FUNNEL = ["reached", "engaged", "considering", "committed", "treated"];
const BUCKET = {
  intake: "reached", awaiting_reply: "reached", channel_fallback: "reached", dormant: "reached",
  qualifying: "engaged", triage: "engaged", awaiting_opinion: "engaged", off_ramp: "engaged",
  product_selection: "considering", awaiting_docs: "considering", objection: "considering",
  booking: "committed", visa: "committed", travel: "committed", pre_op: "committed", in_treatment: "committed",
  post_op: "treated", recovery_bundle: "treated", referral: "treated",
};
const bucketOf = (st) => BUCKET[st] || "reached";

export function benchmarks(db, { k = 5 } = {}) {
  // PRIVACY: this query selects NO source_ref (tenant) and NO ref (patient handle) — only category, market,
  // and the coarse journey stage. Nothing below is attributable to an operator or a person.
  const rows = db.prepare(`SELECT category_id cat, market_code mkt, journey_stage st FROM lead`).all();

  // Overall funnel across all tenants; suppress any bucket below k.
  const mix = {};
  for (const r of rows) { const b = bucketOf(r.st); mix[b] = (mix[b] || 0) + 1; }
  const stage_mix = FUNNEL.map((b) => (mix[b] >= k ? { stage: b, n: mix[b] } : { stage: b, n: null, suppressed: `n<${k}` }));

  // category × market cells; suppress cells below k (k-anonymity) so no small group is re-identifiable.
  const cell = {};
  for (const r of rows) {
    const key = `${r.cat}|${r.mkt}`;
    (cell[key] ||= { cat: r.cat, mkt: r.mkt, total: 0, past: 0 });
    cell[key].total++;
    if (["committed", "treated"].includes(bucketOf(r.st))) cell[key].past++;
  }
  const category_market = Object.values(cell).map((c) => c.total >= k
    ? { category: c.cat, market: c.mkt, leads: c.total, reached_booking_pct: Math.round((c.past / c.total) * 100) }
    : { category: c.cat, market: c.mkt, suppressed: `n<${k}` });

  const shown = category_market.filter((c) => !c.suppressed).length;
  return {
    generated: new Date().toISOString(), k, cross_tenant: true,
    tenants: db.prepare(`SELECT count(*) c FROM tenant WHERE active=1`).get().c,
    total_leads: rows.length, cells_shown: shown, cells_suppressed: category_market.length - shown,
    note: `De-identified aggregate across ALL tenants. No tenant or patient identifiers included. Cells below k=${k} are suppressed (k-anonymity) — this is aggregate learning, NOT patient-data reuse.`,
    stage_mix, category_market,
  };
}

import { pathToFileURL } from "node:url";
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const db = open();
  const b = benchmarks(db, { k: Number(process.argv[2]) || 5 });
  console.log(JSON.stringify(b, null, 2));
  db.close();
}
