// Partner Layer — CRM backbone. Turns the partner/POC rows from a static directory into a working
// account board: (1) fit score + "why this account" reason, (2) normalize every POC into the account
// model (desk vs named vs inferred + confidence), (3) a concrete NEXT ACTION + owner per account so the
// pipeline actually moves. Idempotent — safe to re-run. FREE (no external calls).
//   node --experimental-sqlite data-core/partner_layer.mjs
import { open, logRun, partnerFit, readiness, accessScore, speedScore, pursuitScore } from "./db.mjs";
const db = open();
const A = (s, ...p) => db.prepare(s).all(...p);
const O = (s, ...p) => db.prepare(s).get(...p);

// The roles that actually sign / route facilitator deals, in priority order. Discovery + human
// research target THESE, not the reception desk.
const TARGET_ROLES = [
  "GM / VP – International Business",
  "Head – International Patient Services (IPD)",
  "Business Development – Medical Value Travel",
  "International Marketing Manager",
];

// Map a channel string to an account-model contact_type + confidence.
function classifyChannel(name, channel) {
  if (name) {
    const isEmail = /@/.test(channel || "");
    return { type: "named-public", value: channel || "", conf: isEmail ? 60 : 45, sen: "unknown" };
  }
  if (/@/.test(channel || "")) return { type: "desk", value: channel, conf: 25, sen: "desk" };  // generic inbox
  return { type: "desk", value: channel || "", conf: 10, sen: "desk" };                          // "resolve IPS" etc.
}

let fits = 0, pocs = 0, actions = 0;

// --- (1) + (3) per partner: fit score/reason + next action ---------------------------------------
for (const p of A(`SELECT * FROM partner`)) {
  const cats = A(`SELECT c.name FROM partner_category pc JOIN category c ON c.id=pc.category_id WHERE pc.partner_id=?`, p.id).map(r => r.name);
  const { score, reason } = partnerFit(p, cats);
  const named = O(`SELECT count(*) c FROM poc WHERE partner_id=? AND person_name IS NOT NULL AND person_name<>''`, p.id).c;
  const desk = O(`SELECT count(*) c FROM poc WHERE partner_id=?`, p.id).c;

  // The three-axis score: fit (worth it?) + access (can we get in?) + speed (how fast?). pursuit_score is what
  // the board ranks on now — see db.mjs. Access/speed read the partner's connection + commission_status fields
  // (set by the seeds); they default to cold/unknown, so a partner nobody has touched scores low on pursuit
  // even if its fit is high, which is exactly the point.
  const rd = readiness(p);
  const acc = accessScore(p);
  const spd = speedScore(p, rd);
  const pur = pursuitScore({ fit: score, access: acc.score, speed: spd.score });

  // Next action follows the real state of the account, not a guess — and leads with access when there's a path.
  let next, owner = "Partner Sourcing";
  if (p.stage === "Outreach queued" || p.stage === "Outreach sent") next = "Follow up in 4 days; log response";
  else if (p.commission_status === "in_discussion") next = `Close the commission number (${p.commission_target_pct ? p.commission_target_pct + "%" : "target %"}); it's the gate on a fast signing`;
  else if (/warm|adviser/.test(p.connection || "")) next = `Use the warm intro (${acc.label}); open with terms + the extra we want back for a lower fee`;
  else if (named > 0) next = `Verify direct contact for named POC, then send ${p.mvt_presence === "latent" ? "margin/demand" : "scale"} outreach`;
  else if (desk > 0) next = `Resolve named ${TARGET_ROLES[0]} (public-DM discovery / enrichment), then draft outreach`;
  else next = "Add IPS channel + open a POC row";

  db.prepare(`UPDATE partner SET fit_score=?, fit_reason=?, next_action=?, owner=?, access_score=?, speed_score=?, pursuit_score=? WHERE id=?`)
    .run(score, reason, next, owner, acc.score, spd.score, pur.score, p.id);
  fits++; actions++;
}

// --- (2) normalize existing POC rows into the account model --------------------------------------
for (const r of A(`SELECT * FROM poc`)) {
  const { type, value, conf, sen } = classifyChannel(r.person_name, r.channel_public);
  // Fortis named contacts are comms/partnership, not the IPD head — record the real role honestly.
  const role = r.person_name ? (r.title_target && /IPS|IPD|International/i.test(r.title_target) ? r.title_target : "Corporate Comms / partnership inquiry (role unconfirmed)") : null;
  db.prepare(`UPDATE poc SET role=?, seniority=?, contact_type=?, contact_value=?, confidence=? WHERE id=?`)
    .run(role, sen, type, value, conf, r.id);
  pocs++;
}

// Ensure every star account (latent/High + priority chains) has at least one OPEN target-role slot to fill.
for (const p of A(`SELECT * FROM partner WHERE opportunity='High' OR priority=1`)) {
  const has = O(`SELECT count(*) c FROM poc WHERE partner_id=? AND title_target=?`, p.id, TARGET_ROLES[0]).c;
  if (!has) db.prepare(`INSERT INTO poc (partner_id,title_target,contact_type,confidence,resolved) VALUES (?,?,?,?,0)`)
    .run(p.id, TARGET_ROLES[0], "open", 0);
}

logRun(db, "Partner Sourcing", "Partner layer rebuilt (CRM backbone)",
  `${fits} accounts scored + next-action set; ${pocs} POCs normalized; target-role slots opened for star accounts`, null, "ok");

// --- report ---------------------------------------------------------------------------------------
// Ranked by PURSUIT now (access + fit + speed), not fit alone — who to work first, warm intros on top.
console.log("ACCOUNT BOARD (pursuit-ranked — who to work first):");
console.log(" pur | fit | acc | spd | account                        | connection            | next");
for (const p of A(`SELECT * FROM partner ORDER BY pursuit_score DESC, fit_score DESC LIMIT 12`)) {
  const cell = (n) => String(n ?? 0).padStart(3);
  console.log(` ${cell(p.pursuit_score)} | ${cell(p.fit_score)} | ${cell(p.access_score)} | ${cell(p.speed_score)} | ${p.name.slice(0, 30).padEnd(30)} | ${(p.connection || "cold").padEnd(21)} | ${(p.next_action || "").slice(0, 40)}`);
}
console.log(`\nRanking key: pursuit = 0.45·access + 0.30·fit + 0.25·speed. Target roles hunted: ${TARGET_ROLES[0]} (+${TARGET_ROLES.length - 1} more)`);
db.close();
