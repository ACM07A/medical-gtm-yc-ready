// CAPTURE PARTNER PRICE — the only entry point for a REAL hospital package rate card. The pricing model is
// designed to run on ACTUALS from partners; this is how an actual gets in. Same "a human is vouching for this"
// rule as capture_poc.mjs — a number is only marked 'confirmed' when a person passes the explicit `confirmed`
// flag, because a confirmed rate REPLACES the indicative range on the patient-facing ladder (db.mjs
// priceLadder) and drives the commission model — we must never auto-promote a guess to a quoted number.
//
//   node --experimental-sqlite data-core/capture_partner_price.mjs \
//     <partner_id> <category_id> <procedure_key> <low> <high> [confirmed|indicative] "<includes>" "<source>"
//
// Example (a real Fortis Bannerghatta CABG package sheet):
//   ... fortis-bangalore cardiac bypass 6200 8500 confirmed "OT, 5-day stay, 1 follow-up" "package sheet 2026-07"
import { open, logRun, commissionModel, COMMISSION_TIERS } from "./db.mjs";

const [, , partnerId, categoryId, procKey, lowS, highS, statusArg, includes, source] = process.argv;
if (!partnerId || !categoryId || !procKey || !lowS || !highS) {
  console.error("usage: capture_partner_price.mjs <partner_id> <category_id> <procedure_key> <low> <high> [confirmed|indicative] \"<includes>\" \"<source>\"");
  process.exit(1);
}
const low = Number(lowS), high = Number(highS);
if (!(low > 0) || !(high >= low)) { console.error(`bad price range: low=${lowS} high=${highS} (need 0 < low <= high)`); process.exit(1); }
const status = statusArg === "confirmed" ? "confirmed" : "indicative";   // never confirmed unless explicitly asked

const db = open();
const partner = db.prepare(`SELECT id, name, commission_target_pct FROM partner WHERE id=?`).get(partnerId);
if (!partner) { console.error(`no partner '${partnerId}' — capture the account first`); db.close(); process.exit(1); }
const cat = db.prepare(`SELECT id FROM category WHERE id=?`).get(categoryId);
if (!cat) { console.error(`no category '${categoryId}'`); db.close(); process.exit(1); }

db.prepare(`INSERT INTO partner_price (partner_id,category_id,procedure_key,low,high,includes,status,source_cite,retrieved)
  VALUES (?,?,?,?,?,?,?,?,date('now'))
  ON CONFLICT(partner_id,category_id,procedure_key) DO UPDATE SET
    low=excluded.low, high=excluded.high, includes=excluded.includes, status=excluded.status,
    source_cite=excluded.source_cite, retrieved=excluded.retrieved`)
  .run(partnerId, categoryId, procKey, low, high, includes || null, status, source || null);

const feePct = partner.commission_target_pct ?? COMMISSION_TIERS[0].pct;
const m = commissionModel({ low, high }, feePct);
logRun(db, "Pricing", `Rate card · ${partnerId}/${categoryId}/${procKey}`,
  `${status} package $${low}-${high}; at ${feePct}% our fee $${m.ourFee.low}-${m.ourFee.high}, hospital nets $${m.hospitalNet.low}-${m.hospitalNet.high}`,
  null, status === "confirmed" ? "ok" : "pending");

console.log(`\n✓ ${status.toUpperCase()} rate for ${partner.name} — ${categoryId}/${procKey}: $${low}–${high}`);
console.log(`  At ${feePct}% commission → our fee $${m.ourFee.low}–${m.ourFee.high} · hospital nets $${m.hospitalNet.low}–${m.hospitalNet.high}`);
if (status === "confirmed") console.log(`  This now REPLACES the indicative India rung on the price ladder for ${categoryId}/${procKey}.`);
else console.log(`  Held as INDICATIVE (not shown to patients). Re-run with 'confirmed' once a signed package sheet exists.`);
db.close();
