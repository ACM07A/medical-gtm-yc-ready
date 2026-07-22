// DOCTOR-AFFILIATE outreach generator — closes the loop on PARTNER_AGENT.md §11: Sachin Rai's own "next
// level" is a structured referral relationship with an individual clinician (CME engagement, a named single
// point of contact, eventually a local info-center), not a generic finder's-fee pitch. Mirrors
// gen_proposals.mjs's pattern exactly (same failover chain, same claims lint, same human-gated 'review'
// status) but for `partner.type='doctor'` rows instead of hospitals.
//
// ONE non-negotiable addition vs. the hospital proposal: physician self-referral / anti-kickback rules vary
// sharply and unpredictably by country — several jurisdictions restrict or ban direct payment to a referring
// doctor outright. So this NEVER lets a draft state a referral-fee number; the system prompt forces a
// [VERIFY: confirm local permissibility] placeholder there every time, no matter what the model tries to
// write, and the compliance caveat is a REQUIRED section, not an optional one.
//   node --experimental-sqlite data-core/gen_doctor_outreach.mjs [limit]
import { generateWithModel } from "../integrations/glm_generate.mjs";
import { open, logRun, isFresh } from "./db.mjs";
import { lintClaims } from "../lib/claims.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const db = open();
const O = (s, ...p) => db.prepare(s).get(...p);
const A = (s, ...p) => db.prepare(s).all(...p);
const FORCE = process.env.FORCE === "1";
const LIMIT = Number(process.argv[2]) || 4;
const PAST = new Set(["Responded", "Pilot proposed", "Pilot live", "Signed", "Active"]);
const DONE_OUTCOME = new Set(["replied", "meeting", "pilot", "signed"]);
mkdirSync(join(ROOT, "outputs", "doctor-outreach"), { recursive: true });

const SYSTEM = "You are a partnerships lead at MedYatra, a medical-value-travel FACILITATOR, writing to an individual clinician (not a hospital's international-patient desk). " +
  "Write like a real, senior person: formal, practical, specific — NOT marketing copy, NOT an AI assistant. Short declarative sentences; concrete nouns over adjectives. " +
  "BANNED phrases: seamless, world-class, bridging the gap, leverage, patient journey, ecosystem, cutting-edge, holistic, empower, tailored solutions, unlock, elevate, state-of-the-art, synergy, robust, streamline. " +
  "BANNED AI tells: 'I hope this finds you well', 'In today's world', rhetorical questions, a closing paragraph that restates the ask. Open with the point. " +
  "NEVER claim an existing relationship or introduction that was not explicitly given to you as a fact. " +
  "NON-NEGOTIABLE: you must NEVER state a specific referral-fee percentage, dollar amount, or payment structure to this doctor. Physician self-referral and anti-kickback rules vary sharply by country and several jurisdictions restrict or ban direct payment to a referring clinician outright. Wherever compensation would naturally come up, write exactly this placeholder instead of a number: '[VERIFY: confirm local permissibility + structure of any referral arrangement with counsel before discussing terms]'. This rule overrides any other instruction in this prompt. " +
  "Only promise what a facilitator actually does — coordinating a referred patient's enquiry, documents, and case handoff. Do NOT promise a fee, a job, or clinical collaboration. Output clean Markdown.";

function prompt(d, cat, market) {
  const warm = d.warmth === "warm";
  const source = (d.source || "").trim();
  const cme = (d.cme_notes || "").trim();
  return `Write a first-touch message from MedYatra to ${d.name}, a ${cat.name} clinician${d.current_hospital ? ` currently at ${d.current_hospital}` : ""} in ${market ? market.name : d.country_code}.

Context (use only this — do not invent anything beyond it):
- Relationship warmth: ${warm ? `WARM — a real introduction exists${source ? ` (${source})` : ""}. Reference it briefly and naturally, do not oversell it.` : "COLD — no introduction exists yet. Do not imply one. Open on the substance instead: what MedYatra does and why a ${cat.name} clinician in this market is relevant."}
${cme ? `- CME/engagement context already discussed: ${cme}` : ""}
- Why this matters to them: patients in ${market ? market.name : "their market"} needing ${cat.name} care sometimes look abroad; when that happens, MedYatra coordinates the referral, the hospital match, and the paperwork — this doctor stays their patient's doctor of record for anything that isn't the procedure itself.

Structure:
1. Who we are (facilitator, not a competing clinician, not a hospital) and, if warm, the real introduction.
2. Why we're reaching out to THEM specifically — their specialty and market, not a generic pitch.
3. What a referral relationship actually looks like in practice: a single named MedYatra coordinator, visibility into their patient's case status (with the patient's consent), and MedYatra handling logistics coordination once a referral is made — nothing clinical, nothing that competes with their own practice.
4. Compensation/terms — do NOT state a number or structure. Use the exact required placeholder verbatim: "[VERIFY: confirm local permissibility + structure of any referral arrangement with counsel before discussing terms]".
5. The ask — a short call to explain how it would work for a specific recent case type, not a commitment.

~250-350 words. Professional sign-off from "MedYatra Partnerships".`;
}

const doctors = A(`SELECT p.*, d.* FROM partner p JOIN doctor_affiliate d ON d.partner_id = p.id
  WHERE p.type='doctor' ORDER BY p.fit_score DESC LIMIT ?`, LIMIT);

if (!doctors.length) {
  console.log("No doctor-affiliate accounts on file yet — capture one first: node --experimental-sqlite data-core/capture_doctor.mjs \"Dr Name\" <specialty> <country> ...");
  db.close();
  process.exit(0);
}

let made = 0;
for (const d of doctors) {
  if (!FORCE && (PAST.has(d.stage) || DONE_OUTCOME.has(d.outcome))) { console.log(`outreach → ${d.name} … skip (stage '${d.stage}'${d.outcome && d.outcome !== "none" ? ", outcome " + d.outcome : ""})`); continue; }
  const existing = O(`SELECT generated_at FROM proposal WHERE partner_id=? AND category_id=?`, d.id, d.specialty);
  if (!FORCE && isFresh(existing?.generated_at, 14)) { console.log(`outreach → ${d.name} … skip (fresh, ${existing.generated_at})`); continue; }

  const cat = O(`SELECT * FROM category WHERE id=?`, d.specialty) || { id: d.specialty, name: d.specialty };
  const market = O(`SELECT * FROM market WHERE code=?`, d.country_code);

  process.stdout.write(`outreach → ${d.name} (${d.warmth}) … `);
  let r; try { r = await generateWithModel(prompt(d, cat, market), { system: SYSTEM, maxTokens: 2048, temperature: 0.5 }); }
  catch (e) { console.log("FAIL:", String(e.message || e).slice(0, 50)); logRun(db, "Partner Sourcing", `doctor outreach ${d.id}`, "gen error", null, "fail"); continue; }

  const lint = lintClaims(r.text);
  // HARD GATE, not just a lint flag: refuse to write out a draft that leaked a percentage or currency figure
  // near "fee"/"referral"/"payment" language despite the system prompt — the one rule in this file that
  // cannot ship broken, because the failure mode is a compliance problem, not a tone problem.
  const feeLeak = /(fee|referral|payment|compensat\w*|commission)[^.]{0,40}(\d+(\.\d+)?\s?%|\$\s?\d)/i.test(lint.text);
  if (feeLeak) {
    console.log("BLOCKED: model stated a compensation figure — refusing to write this draft");
    logRun(db, "Safety", `Doctor outreach blocked · ${d.id}`, `${d.name} — draft stated a referral-fee figure despite the hard system-prompt rule; not written to disk`, null, "fail");
    continue;
  }
  const flagNote = (lint.vague.length || lint.filler.length)
    ? `<!-- QA: ${lint.vague.length} vague-claim(s) auto-tagged [VERIFY]${lint.filler.length ? ` · filler to cut: ${lint.filler.slice(0, 6).join(", ")}` : ""} -->\n` : "";
  const file = join("outputs", "doctor-outreach", `${d.id}.md`);
  const header = `<!-- DOCTOR OUTREACH · DRAFT (human review before send) · ${d.warmth} · ${d.id} · model:${r.model} · ${new Date().toISOString().slice(0, 10)} -->\n${flagNote}\n# Doctor Outreach — ${d.name}\n_${cat.name} · ${market ? market.name : d.country_code} · prepared by MedYatra Partnerships_\n\n`;
  writeFileSync(join(ROOT, file), header + lint.text.trim() + "\n");

  db.prepare(`DELETE FROM proposal WHERE partner_id=? AND category_id=?`).run(d.id, d.specialty);
  db.prepare(`INSERT INTO proposal (partner_id,category_id,market_code,fee_pct,status,file_ref,blockers,generated_at) VALUES (?,?,?,NULL,'review',?,?,datetime('now'))`)
    .run(d.id, d.specialty, d.country_code, file, "referral-fee terms not set — compliance review required before any figure is discussed");
  db.prepare(`UPDATE partner SET stage='Pilot proposed' WHERE id=? AND stage NOT IN ('Responded','Pilot live','Signed','Active')`).run(d.id);
  made++;
  logRun(db, "Partner Sourcing", `Doctor outreach · ${d.name}`, `${d.warmth} · ${cat.name}×${d.country_code} · review (human-gated)${r.failedOver ? " · " + r.model : ""}`, null, "ok");
  console.log(`ok (${r.model}) -> ${file}`);
}
logRun(db, "Partner Sourcing", "Doctor outreach batch complete", `${made} doctor-affiliate outreach drafts → review (human-gated)`);
console.log(`\n${made} drafts → outputs/doctor-outreach/ + proposal table (status review). Human review before send — referral-fee terms are NEVER auto-filled.`);
db.close();
