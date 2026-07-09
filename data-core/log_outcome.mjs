// Outcome logger — the ground truth the fit model needs. Records what ACTUALLY happened with a partner so
// the scoring can be validated (see `query calibration`) and, once enough deals are logged, its weights
// calibrated. Without this, fit_score is an untested assertion.
//   node --experimental-sqlite data-core/log_outcome.mjs <partner_id> <outcome> ["note"]
//   outcome ∈ contacted | replied | meeting | pilot | signed | lost
import { open, logRun } from "./db.mjs";
const db = open();
const [, , pid, outcome, note] = process.argv;
const OUTCOMES = { contacted: "Outreach sent", replied: "Responded", meeting: "Responded", pilot: "Pilot live", signed: "Signed", lost: null };
if (!pid || !(outcome in OUTCOMES)) {
  console.error(`usage: log_outcome.mjs <partner_id> <${Object.keys(OUTCOMES).join("|")}> ["note"]`);
  process.exit(1);
}
const p = db.prepare(`SELECT * FROM partner WHERE id=?`).get(pid);
if (!p) { console.error(`no partner '${pid}'`); process.exit(1); }

db.prepare(`UPDATE partner SET outcome=?, outcome_at=datetime('now'), outcome_note=? WHERE id=?`).run(outcome, note || null, pid);
const stage = OUTCOMES[outcome];
if (stage) db.prepare(`UPDATE partner SET stage=? WHERE id=?`).run(stage, pid);
// mirror onto the latest proposal if there is one
if (["replied", "meeting", "signed", "lost"].includes(outcome))
  db.prepare(`UPDATE proposal SET outcome=?, replied_at=CASE WHEN ? IN ('replied','meeting') THEN datetime('now') ELSE replied_at END WHERE partner_id=? AND id=(SELECT max(id) FROM proposal WHERE partner_id=?)`).run(outcome, outcome, pid, pid);

logRun(db, "Partner Sourcing", `Outcome · ${pid}`, `${p.name}: ${outcome}${note ? " — " + note : ""} (fit was ${p.fit_score})`, null, outcome === "lost" ? "fail" : "ok");
console.log(`✓ ${p.name}: outcome='${outcome}' (fit_score ${p.fit_score})${stage ? ` → stage '${stage}'` : ""}. Run 'query calibration' to see fit-vs-outcome.`);
db.close();
