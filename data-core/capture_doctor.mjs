// Capture a doctor-affiliate — the second GTM motion Sachin Rai described unprompted: recruit an individual
// clinician (CME engagement, a revenue share, a local info-center) rather than only signing hospitals.
// There is no directory to bulk-source doctors from the way partner_layer.mjs sources hospitals, so this is
// the PRIMARY creation path for this account type: a doctor only enters the board when someone vouches for
// a real introduction. Same "no fabrication" rule as capture_poc.mjs, one level up.
//   node --experimental-sqlite data-core/capture_doctor.mjs "Dr Full Name" <specialty> <country_code> "Current Hospital" <reach:low|med|high> <warmth:cold|warm> "source note"
import { open, logRun, doctorFit, doctorReadiness, DOCTOR_PRIORITY_SPECIALTIES } from "./db.mjs";
const db = open();
const [, , name, specialty, countryCode, currentHospital, reach, warmth, ...sourceParts] = process.argv;

if (!name || !specialty || !countryCode) {
  console.error('usage: capture_doctor.mjs "Dr Full Name" <specialty> <country_code> "Current Hospital" <reach:low|med|high> <warmth:cold|warm> "source note"');
  console.error(`  specialty must be an existing category id — priority ones (real volume, per Sachin): ${DOCTOR_PRIORITY_SPECIALTIES.join(", ")}`);
  process.exit(1);
}
const cat = db.prepare(`SELECT id FROM category WHERE id=?`).get(specialty);
if (!cat) { console.error(`unknown specialty '${specialty}' — must be an existing category id`); process.exit(1); }

const market = db.prepare(`SELECT * FROM market WHERE code=?`).get(countryCode.toUpperCase());
const inTargetMarket = !!market && ["africa", "middle_east", "se_asia"].includes(market.region);

const id = "doc-" + name.toLowerCase().replace(/^dr\.?\s*/i, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
if (db.prepare(`SELECT id FROM partner WHERE id=?`).get(id)) {
  console.error(`'${id}' already captured — use \`npm run outcome\` to update stage/outcome instead.`);
  process.exit(1);
}

const reachEst = ["low", "med", "high"].includes(reach) ? reach : "unknown";
const warmthVal = warmth === "warm" ? "warm" : "cold";
const hasExistingPartnerHospital = !!currentHospital &&
  !!db.prepare(`SELECT id FROM partner WHERE type!='doctor' AND lower(name) LIKE ?`).get(`%${currentHospital.toLowerCase()}%`);
const source = sourceParts.join(" ") || null;

const { score, reason } = doctorFit({ specialty, inTargetMarket, reach_est: reachEst });
const { score: readyScore, label: readyLabel } = doctorReadiness({ warmth: warmthVal, hasExistingPartnerHospital });
const opportunity = score >= 70 ? "High" : score >= 45 ? "Med" : "Low";
const nextAction = warmthVal === "warm" ? "Warm intro on file — schedule the first conversation" : "No real introduction yet — relationship-build before any outreach";

db.prepare(`INSERT INTO partner (id, name, city, type, stage, mvt_presence, opportunity, fit_score, fit_reason, next_action, owner, notes)
  VALUES (?,?,?, 'doctor', 'Sourced', NULL, ?, ?, ?, ?, 'Partner Sourcing', ?)`)
  .run(id, name, market?.name || countryCode.toUpperCase(), opportunity, score, reason, nextAction, source);

db.prepare(`INSERT INTO doctor_affiliate (partner_id, specialty, country_code, current_hospital, reach_est, warmth, source)
  VALUES (?,?,?,?,?,?,?)`)
  .run(id, specialty, countryCode.toUpperCase(), currentHospital || null, reachEst, warmthVal, source);

logRun(db, "Partner Sourcing", `Doctor affiliate captured · ${id}`,
  `${name} (${specialty}, ${countryCode.toUpperCase()}) — fit ${score} [${opportunity}], readiness ${readyScore} (${readyLabel})`, null, "ok");

console.log(`\n✓ ${name} — ${specialty}, ${countryCode.toUpperCase()}`);
console.log(`  fit ${score}/100 [${opportunity}] — ${reason}`);
console.log(`  readiness ${readyScore}/100 (${readyLabel})`);
console.log(`  next: ${nextAction}\n`);
db.close();
