// Capture a payer account — the BASE of MedYatra's third GTM motion (insurer / TPA / self-insured employer /
// government health office), deliberately parked for phase 2/3. The pitch is claims-cost reduction applied to
// a whole population, not a clinical-trust pitch to one referrer — precedent: Sachin's Toyota example, and the
// MedYatra × TruDoc partnership already prototypes it. See PARTNER_AGENT.md §12.
//
// Base scope, on purpose: this is the only entry point (a payer becomes real through a relationship, not a
// cold directory — same rule as capture_doctor.mjs / capture_poc.mjs). There is NO outreach generator and NO
// console UI yet; those are phase 2/3. This just lands a scored account on the board so nothing is scrambled
// when a real payer conversation starts.
//   node --experimental-sqlite data-core/capture_payer.mjs "Name" <insurer|tpa|employer|government> <country> "<population e.g. 4.4M|unknown>" <claims_pain:low|med|high> <authority:concentrated|distributed> <warmth:cold|warm> "source note"
import { open, logRun, payerFit, payerReadiness } from "./db.mjs";
const db = open();
const [, , name, payerType, countryCode, populationEst, claimsPain, authority, warmth, ...sourceParts] = process.argv;

if (!name || !payerType || !countryCode) {
  console.error('usage: capture_payer.mjs "Name" <insurer|tpa|employer|government> <country> "<population|unknown>" <claims_pain:low|med|high> <authority:concentrated|distributed> <warmth:cold|warm> "source note"');
  process.exit(1);
}
const validTypes = ["insurer", "tpa", "employer", "government"];
if (!validTypes.includes(payerType)) { console.error(`payer_type must be one of: ${validTypes.join(", ")}`); process.exit(1); }

const market = db.prepare(`SELECT * FROM market WHERE code=?`).get(countryCode.toUpperCase());
const inTargetMarket = !!market && ["africa", "middle_east", "se_asia"].includes(market.region);

const id = "payer-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
if (db.prepare(`SELECT id FROM partner WHERE id=?`).get(id)) {
  console.error(`'${id}' already captured — use \`npm run outcome\` to update stage/outcome instead.`);
  process.exit(1);
}

const pain = ["low", "med", "high"].includes(claimsPain) ? claimsPain : "unknown";
const auth = ["concentrated", "distributed"].includes(authority) ? authority : "unknown";
const warmthVal = warmth === "warm" ? "warm" : "cold";
const source = sourceParts.join(" ") || null;

const { score, reason } = payerFit({ population_est: populationEst, claims_pain: pain, decision_authority: auth, inTargetMarket });
const { score: readyScore, label: readyLabel } = payerReadiness({ warmth: warmthVal, decision_authority: auth });
const opportunity = score >= 70 ? "High" : score >= 45 ? "Med" : "Low";
const nextAction = warmthVal === "warm"
  ? "Warm intro on file — frame the claims-cost pitch for their population (phase 2/3: build the outreach template)"
  : "No introduction yet — relationship-build before any outreach";

db.prepare(`INSERT INTO partner (id, name, city, type, stage, mvt_presence, opportunity, fit_score, fit_reason, next_action, owner, notes)
  VALUES (?,?,?, 'payer', 'Sourced', NULL, ?, ?, ?, ?, 'Partner Sourcing', ?)`)
  .run(id, name, market?.name || countryCode.toUpperCase(), opportunity, score, reason, nextAction, source);

db.prepare(`INSERT INTO payer (partner_id, payer_type, country_code, population_est, claims_pain, decision_authority, warmth, source)
  VALUES (?,?,?,?,?,?,?,?)`)
  .run(id, payerType, countryCode.toUpperCase(), populationEst || null, pain, auth, warmthVal, source);

logRun(db, "Partner Sourcing", `Payer captured · ${id}`,
  `${name} (${payerType}, ${countryCode.toUpperCase()}) — fit ${score} [${opportunity}], readiness ${readyScore} (${readyLabel})`, null, "ok");

console.log(`\n✓ ${name} — ${payerType}, ${countryCode.toUpperCase()}`);
console.log(`  fit ${score}/100 [${opportunity}] — ${reason}`);
console.log(`  readiness ${readyScore}/100 (${readyLabel})`);
console.log(`  next: ${nextAction}`);
console.log(`  (payer channel is base-only — outreach + console UI are parked for phase 2/3, see PARTNER_AGENT.md §12)\n`);
db.close();
