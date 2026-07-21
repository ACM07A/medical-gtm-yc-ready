// COMMS ENGINE DRIVER — walks each lead through lib/comms_machine.mjs and does the next human-gated thing:
// drafts the message (dry-run to outputs/comms/outbox — never auto-sends), advances stages on no-reply, and
// fires the ancillary services (visa workflow, near-hospital stay search) when a lead reaches those stages.
// Enforces the gates from the journey map: consent before any outbound, regulatory clearance per market,
// opt-out suppression, and the WhatsApp session/template rule.
//   node --experimental-sqlite data-core/comms_run.mjs
import { open, logRun, marketCleared } from "./db.mjs";
import { nextAction, sessionOpen } from "../lib/comms_machine.mjs";
import { checkMessage, explain } from "../lib/safety.mjs";
import { startVisa, visaChecklist, attendantsAllowed } from "../lib/visa.mjs";
import { searchStays, stayPlan } from "../lib/stay.mjs";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "outputs", "comms", "outbox");
mkdirSync(OUT, { recursive: true });
const db = open();
const O = (s, ...p) => db.prepare(s).get(...p);
const A = (s, ...p) => db.prepare(s).all(...p);

const catName = (id) => O(`SELECT name FROM category WHERE id=?`, id)?.name || id;
const fillBody = (body, vars) => body.replace(/\{\{(\d)\}\}/g, (_, n) => vars[n] || `{{${n}}}`);
// Fill each {{n}} from the template's own variable map (what that slot MEANS), with lead context. Names stay
// PII-minimised ("there") — real names come from the live conversation, never a synthetic demo.
const varValue = (desc, L) => {
  const d = (desc || "").toLowerCase();
  if (d.includes("name")) return "there";
  if (d.includes("treatment")) return catName(L.category_id);
  if (d.includes("attendant")) return String(attendantsAllowed(L.market_code));
  if (d.includes("turnaround")) return "2–3 days";
  if (d.includes("document")) return "your latest scan/report";
  if (d.includes("date")) return "the coming weeks";
  if (d.includes("city")) return O(`SELECT city FROM partner WHERE id=?`, L.routed_to || "")?.city || "the hospital city";
  return "";
};
const contextVars = (t, L) => {
  let tv = {}; try { tv = JSON.parse(t.variables || "{}"); } catch {}
  const m = {}; for (const [n, desc] of Object.entries(tv)) m[n] = varValue(desc, L); return m;
};

const leads = A(`SELECT * FROM lead ORDER BY id`);
let blocked = 0; let sent = 0, held = 0, advanced = 0, awaiting = 0, services = 0;
const report = [];

for (const L of leads) {
  const tag = `#${L.id} ${L.market_code}/${L.category_id} [${L.journey_stage}]`;
  // GATE 1 — consent before any outbound (esp. plugged-in external lists).
  if (!L.consent) { held++; report.push(`⛔ ${tag} — no consent → opt-in-first (held)`); continue; }
  // GATE 2 — opt-out is absolute.
  if (L.opted_out) { held++; report.push(`⛔ ${tag} — opted out → suppressed`); continue; }
  // GATE 3 — regulatory clearance to solicit in this market.
  const reg = marketCleared(db, L.market_code);
  if (!reg.cleared) { held++; report.push(`⚠ ${tag} — market ${reg.status} → nurture-only hold`); continue; }

  // Ancillary services fire when the lead reaches those stages (idempotent).
  if (L.journey_stage === "visa" && !O(`SELECT id FROM service WHERE lead_id=? AND kind='visa'`, L.id)) {
    const v = startVisa(db, L, { attendants: 1 }); services++;
    report.push(`🛂 ${tag} — visa started · ${v.attendantsRequested}/${v.attendantsAllowed} attendant(s) · blocked on: ${v.blocked_on}`);
  }
  if (L.journey_stage === "travel") {
    const plan = stayPlan({ categoryId: L.category_id, attendants: 1 });
    const city = O(`SELECT city FROM partner WHERE id=?`, L.routed_to || "")?.city || "Delhi NCR";
    const stays = await searchStays({ city, guests: plan.guests, kind: "stay_postop" });
    services++;
    report.push(`🏨 ${tag} — stay search (${stays.provider}) · ${stays.options.length} near-${city} options · post-op ${plan.postop.nights}n × ${plan.guests} guests`);
  }

  // The comms decision.
  const act = nextAction(L);
  if (!act) { report.push(`· ${tag} — idle (waiting in-window / terminal)`); continue; }

  if (act.do === "await_hospital") {
    awaiting++; report.push(`⇄ ${tag} — awaiting hospital${act.clinical ? " (clinical)" : ""}: ${act.reason}`);
    logRun(db, "Comms", `await hospital · lead ${L.id}`, act.reason, null, "pending"); continue;
  }
  if (act.do === "advance") {
    db.prepare(`UPDATE lead SET journey_stage=?, nudge_count=0, last_outbound_at=NULL WHERE id=?`).run(act.to, L.id);
    advanced++; report.push(`→ ${tag} — advanced to [${act.to}] (${act.reason})`);
    logRun(db, "Comms", `advance · lead ${L.id}`, `${L.journey_stage} → ${act.to}`, null, "ok"); continue;
  }
  if (act.do === "send") {
    const t = O(`SELECT * FROM comms_template WHERE name=?`, act.template);  // act.template = medyatra_<stage>
    const body = t ? fillBody(t.body, contextVars(t, L)) : "(template missing)";
    const draft = [
      `LEAD ${L.id} · ${L.market_code}/${L.category_id} · stage=${L.journey_stage}`,
      `via: ${act.via}${act.via === "template" ? ` (template: ${act.template})` : " (free-form, session open)"}`,
      act.clinical ? `CLINICAL HANDOFF — hospital medical team owns this content` : ``,
      act.nudge ? `nudge ${act.nudge}` : ``,
      `--- body ---`, body,
      `--- gate: HUMAN — approve in Studio before send (POST_LIVE dry-run) ---`,
    ].filter(Boolean).join("\n");
    // SAFETY GATE — every drafted message clears the clinical/PII/residency guardrail before it is even
    // written to the outbox. A 'block' verdict means the draft never becomes an approvable item: a human
    // shouldn't be given the option to click past a scope violation (that is how gates get eroded).
    const safe = checkMessage(body, { patientText: L.last_inbound_text || "", outbound: true, sourceMarket: L.market_code });
    if (safe.verdict === "block" || safe.verdict === "escalate") {
      blocked++;
      report.push(`⛔ ${tag} — ${safe.verdict.toUpperCase()}: ${safe.findings.map((f) => f.code).join(", ")}`);
      logRun(db, "Safety", `${safe.verdict} · lead ${L.id}`, explain(safe), "/studio", "fail");
      continue;
    }
    writeFileSync(join(OUT, `lead-${L.id}-${L.journey_stage}.txt`),
      draft + (safe.findings.length ? `\n--- safety: REVIEW ---\n${explain(safe)}\n` : "") + "\n");
    // record the outbound + advance awaiting_reply-style stages so the demo shows motion
    db.prepare(`UPDATE lead SET last_outbound_at=datetime('now'), nudge_count=nudge_count+? WHERE id=?`)
      .run(act.nudge ? 1 : 0, L.id);
    sent++; report.push(`✉ ${tag} — draft ${act.via}${act.clinical ? " (clinical)" : ""}: "${body.slice(0, 60)}…"`);
    logRun(db, "Comms", `draft · lead ${L.id}`, `${act.via} · ${L.journey_stage}${act.clinical ? " · clinical handoff" : ""}`, "/comms", "pending");
  }
}

console.log(`\n== COMMS ENGINE RUN ==`);
for (const line of report) console.log("  " + line);
console.log(`\n  drafted ${sent} · advanced ${advanced} · awaiting-hospital ${awaiting} · services fired ${services} · held ${held} · SAFETY-BLOCKED ${blocked}`);
console.log(`  drafts → outputs/comms/outbox/ (human-gated, dry-run). Nothing sent.`);
logRun(db, "Comms", "Comms engine run", `${sent} drafted · ${advanced} advanced · ${awaiting} awaiting hospital · ${services} services · ${held} held · ${blocked} safety-blocked`, "/comms", "ok");
db.close();
