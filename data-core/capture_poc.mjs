// Capture a human-confirmed decision-maker into the account board. Called from the research worklist.
//   node --experimental-sqlite data-core/capture_poc.mjs <partner_id> "Full Name" "Role" "<email|linkedin-url>"
// A human read the public LinkedIn/site result and is confirming it — so this lands as resolved=1.
// Email → contact_type 'named-verified' (still verify deliverability before send). URL-only → 'named-public'.
import { open, logRun } from "./db.mjs";
const db = open();
const [, , pid, name, role, contact] = process.argv;
if (!pid || !name) {
  console.error('usage: capture_poc.mjs <partner_id> "Full Name" "Role" "<email|linkedin-url>"');
  process.exit(1);
}
const p = db.prepare(`SELECT * FROM partner WHERE id=?`).get(pid);
if (!p) { console.error(`no partner '${pid}'. Run: query partners`); process.exit(1); }

const isEmail = /@/.test(contact || "");
const type = isEmail ? "named-verified" : contact ? "named-public" : "named-public";
const conf = isEmail ? 75 : 55;
const slot = db.prepare(`SELECT id FROM poc WHERE partner_id=? AND (person_name IS NULL OR person_name='') ORDER BY id LIMIT 1`).get(pid);
const now = new Date().toISOString().slice(0, 10);
if (slot) {
  db.prepare(`UPDATE poc SET person_name=?,role=?,contact_type=?,contact_value=?,confidence=?,source='human-confirmed (public research)',resolved=1,verified_at=? WHERE id=?`)
    .run(name, role || null, type, contact || "", conf, now, slot.id);
} else {
  db.prepare(`INSERT INTO poc (partner_id,title_target,person_name,role,contact_type,contact_value,confidence,source,resolved,verified_at) VALUES (?,?,?,?,?,?,?, 'human-confirmed (public research)',1,?)`)
    .run(pid, role || null, name, role || null, type, contact || "", conf, now);
}
// advance the pipeline + next action
db.prepare(`UPDATE partner SET stage='POC found', next_action=? WHERE id=?`)
  .run(isEmail ? "Verify email deliverability, then send tailored outreach" : "Find/infer direct email, then send tailored outreach", pid);
logRun(db, "Partner Sourcing", `POC confirmed · ${pid}`, `${name} — ${role || "role tbd"} ${contact ? "<" + contact + ">" : ""} (human-confirmed public)`, null, "ok");
console.log(`✓ ${p.name}: ${name}${role ? " — " + role : ""}${contact ? " · " + contact : ""} [${type}, conf ${conf}] → stage 'POC found'`);
db.close();
