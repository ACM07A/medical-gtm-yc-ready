// Seed WELLNESS / naturopathy as a SELLABLE product line + the resorts as SUPPLY partners.
// Two use-cases (both consumer-facing, our own funnel — NOT an acquisition channel):
//   1. Sell the wellness stay on its own — lowest-consideration, cash-pay, no clinical-outcome liability.
//   2. Bundle it as a POST-OP RECOVERY add-on onto a surgical journey (bundleable=1).
// Also drops the earlier (mis-modelled) acquisition_partner table. Idempotent.
//   node --experimental-sqlite data-core/seed_wellness.mjs
import { open, logRun, scoreOf } from "./db.mjs";
const db = open();

// --- 0) undo the earlier acquisition-channel mis-model ---
db.exec(`DROP TABLE IF EXISTS acquisition_partner`);

// --- 1) WELLNESS category (kind='wellness' keeps it out of surgical pricing/proposal logic; bundleable) ---
const f = { cost_arb: 5, quality: 4, ease: 5, demand: 4, margin: 4, whitespace: 5 };
const score = scoreOf(f);
// rank it just after the medical launch categories
const maxRank = db.prepare(`SELECT COALESCE(max(rank),0) r FROM category WHERE status='launch'`).get().r;
db.prepare(`DELETE FROM category WHERE id='wellness'`).run();
db.prepare(`INSERT INTO category (id,name,subtypes,status,cost_arb,quality,ease,demand,margin,whitespace,score,rank,flagship,kind,bundleable)
  VALUES ('wellness','Wellness / Naturopathy','naturopathy · panchakarma · detox · post-op recovery','launch',?,?,?,?,?,?,?,?,0,'wellness',1)`)
  .run(f.cost_arb, f.quality, f.ease, f.demand, f.margin, f.whitespace, score, maxRank + 1);

// --- 2) indicative pricing (package ranges, cited as indicative; verify per property) ---
const CITE = "indicative package ranges — verify per property";
const RET = new Date().toISOString().slice(0, 10);
db.prepare(`DELETE FROM category_price WHERE category_id='wellness'`).run();
const prices = [
  ["7-day naturopathy & detox program", 500, 2500, "Western wellness week $3k–7k"],
  ["14–21 day residential program", 1200, 6000, "Western multi-week retreat $8k–20k"],
  ["Post-op recovery stay (bundled add-on)", 700, 3000, "attaches to a surgical package"],
];
const pStmt = db.prepare(`INSERT INTO category_price (category_id,procedure,india_low,india_high,comparator,indicative,source_cite,retrieved)
  VALUES ('wellness',?,?,?,?,1,?,?)`);
for (const [proc, lo, hi, cmp] of prices) pStmt.run(proc, lo, hi, cmp, CITE, RET);

// --- 3) the resorts as SUPPLY partners (type='wellness'); public info, verify before outreach ---
// fields: id,name,city,acc,ch,src,fit,presence,opp,reason,notes
const partners = [
  ["jindal-naturecure", "Jindal Nature Cure Institute", "Bengaluru", "NABH-aligned naturopathy (verify)", "jindalnaturecure.in (public enquiry)", "jindalnaturecure.in", "High", "emerging", "High", "Flagship naturopathy brand; scale + credibility; long-stay programs", "Best-known name; strong for the standalone sell"],
  ["kshemavana", "Kshemavana Naturopathy & Yoga", "Nelamangala (Bengaluru)", "naturopathy centre (verify)", "kshemavana.com", "kshemavana.com", "High", "emerging", "High", "Modern facility, positioned for international guests", ""],
  ["soukya", "SOUKYA International Holistic Centre", "Bengaluru", "holistic centre (verify)", "soukya.com", "soukya.com", "High", "established", "Med", "Existing INTERNATIONAL (UK/EU/Gulf) clientele — best recovery-bundle fit", "Premium; already serves our source markets"],
  ["nimba", "Nimba Nature Cure Village", "Netrang, Gujarat", "medical-wellness (verify)", "nimba.in", "nimba.in", "Med", "emerging", "Med", "Large capacity; medical-wellness positioning suits post-op recovery", ""],
  ["atmantan", "Atmantan Wellness Centre", "Mulshi, Pune", "luxury wellness (verify)", "atmantan.com", "atmantan.com", "Med", "emerging", "Med", "Luxury tier; HNW self-pay guests", ""],
];
const paStmt = db.prepare(`INSERT OR REPLACE INTO partner
  (id,name,network,city,accreditation,ips_channel_public,ips_source,fit,stage,priority,type,mvt_presence,opportunity,notes,fit_reason)
  VALUES (?,?,'Wellness',?,?,?,?,?, 'Enriched', 0,'wellness',?,?,?,?)`);
const pcStmt = db.prepare(`INSERT OR IGNORE INTO partner_category (partner_id,category_id) VALUES (?, 'wellness')`);
for (const [id, name, city, acc, ch, src, fit, presence, opp, reason, notes] of partners) {
  paStmt.run(id, name, city, acc, ch, src, fit, presence, opp, notes, reason);
  pcStmt.run(id);
}

logRun(db, "Partner Sourcing", "Wellness product line seeded", `wellness category (bundleable) + ${partners.length} naturopathy supply partners · acquisition_partner table dropped`, null, "ok");
console.log(`✓ Wellness category added (kind=wellness, bundleable=1, rank ${maxRank + 1}, score ${score}).`);
console.log(`✓ ${partners.length} naturopathy SUPPLY partners seeded (type=wellness). acquisition_partner table dropped.`);
for (const r of db.prepare(`SELECT p.name, p.city, p.mvt_presence FROM partner p WHERE p.type='wellness' ORDER BY p.fit DESC, p.name`).all())
  console.log(`  · ${r.name} — ${r.city} · ${r.mvt_presence}`);
console.log(`\nSell standalone (low-hanging), or bundle as post-op recovery onto any surgical journey.`);
db.close();
