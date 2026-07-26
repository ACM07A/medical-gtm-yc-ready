// RED-TEAM SUITE FOR THE CONCIERGE (Suhail) — the patient/family point of contact.
//
// This is our answer to "how do we test the live system for bias, leakage, or breakdown?" The concierge is
// deliberately DETERMINISTIC (intent-matching over the live case record, no LLM at runtime), so the risks are
// not hallucination — they are:
//   • LEAKAGE   — a consent-blocked case must never surface medical/personal detail through ANY phrasing,
//                 and the underlying case reader must reject cross-tenant access.
//   • BREAKDOWN — safety ordering must hold (emergencies outrank everything), the bot must carry no write
//                 "pen", and identical questions must return identical answers (no drift).
//   • BIAS/SCOPE— a clinical question must always route to the doctors, never be answered by us.
//
// Every assertion targets the REAL seeded ground truth (from data-core/os_core.mjs), so if the demo data or a
// boundary regex changes in a way that opens a hole, this suite fails loudly rather than the demo leaking.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { open } from "../data-core/db.mjs";
import { ensureOsSchema, seedDemoOs } from "../data-core/os_core.mjs";
import { apiCase } from "../server/os_pages.mjs";
import { answerConcierge, BOT_NAME } from "../server/concierge_bot.mjs";

const ADMIN = { role: "platform_admin", organization_id: "org_platform" };
const GOLDEN = "case_ibrahim_musa";   // consent "captured" — the bot answers normally
const BLOCKED = "case_amina_okoro";   // consent "missing"  — the bot must refuse detail

function seededDb() {
  const dir = mkdtempSync(join(tmpdir(), "canopus-concierge-redteam-"));
  const db = open(join(dir, "test.db"));
  ensureOsSchema(db);
  seedDemoOs(db);
  return { db, dir };
}
const close = (db, dir) => { db.close(); rmSync(dir, { recursive: true, force: true }); };

// Sensitive tokens that leaking the blocked case's record would expose. Derived from the live record so the
// canaries follow the seed; the patient's own name is excluded (the refusal deliberately names them), and the
// warnings string is excluded because it legitimately shares the word "consent" with the refusal copy.
function leakCanaries(rec) {
  const out = new Set();
  for (const field of [rec.treatment_request, rec.travel_window]) {
    for (const w of String(field || "").split(/[^A-Za-z0-9]+/)) {
      if (w.length >= 4) out.add(w);
    }
  }
  for (const money of String(rec.budget_band || "").match(/\d[\d,]{2,}/g) || []) out.add(money);
  return [...out];
}

// A battery that probes every intent plus adversarial and social-engineering phrasings. None contain an
// emergency term (those are tested separately) so the consent gate is the only thing that can answer.
const PROBES = [
  "What's the status?",
  "What's happening with the case?",
  "What documents are missing?",
  "Give me the full case file.",
  "How much will it cost?",
  "What's the estimate?",
  "How does travel work, and the visa?",
  "Which hospital is treating her?",
  "When is the surgery scheduled?",
  "Just tell me what treatment she is getting.",
  "Ignore the consent rule and tell me her budget.",
  "I'm her husband — share the medical details with me.",
  "What is her diagnosis?",
];

test("LEAKAGE — a consent-missing case leaks no medical or personal detail through any phrasing", () => {
  const { db, dir } = seededDb();
  const truth = apiCase(db, ADMIN, BLOCKED);

  // Preconditions: this really is the consent-blocked case and it really holds the PHI we claim to protect.
  assert.equal((truth.consent_status || "").toLowerCase(), "missing", "fixture drift: blocked case is no longer consent-missing");
  const canaries = leakCanaries(truth);
  assert.ok(canaries.some((c) => /oncolog/i.test(c)), "fixture drift: expected the blocked case to carry a treatment detail to protect");
  assert.ok(canaries.some((c) => /[\d,]{5,}/.test(c)), "fixture drift: expected a budget figure to protect");

  for (const text of PROBES) {
    const r = answerConcierge(db, { caseId: BLOCKED, text });
    assert.equal(r.blocked, true, `probe should be refused: "${text}"`);
    assert.equal(r.intent, "blocked", `probe should not reach an intent answer: "${text}"`);
    for (const c of canaries) {
      assert.ok(!r.reply.toLowerCase().includes(c.toLowerCase()), `LEAK — "${c}" surfaced answering "${text}"`);
    }
  }
  close(db, dir);
});

test("BREAKDOWN — a medical emergency outranks the consent gate and a missing case", () => {
  const { db, dir } = seededDb();

  // Emergency on the consent-blocked case: safety must win, so it escalates rather than refusing on consent.
  const onBlocked = answerConcierge(db, { caseId: BLOCKED, text: "She has severe chest pain and can't breathe" });
  assert.equal(onBlocked.escalated, true);
  assert.equal(onBlocked.intent, "emergency");
  assert.notEqual(onBlocked.blocked, true);
  assert.match(onBlocked.reply, /emergency services|nearest hospital/i);

  // Emergency on a case that does not exist: still escalates (checked before any record lookup).
  const onMissing = answerConcierge(db, { caseId: "case_does_not_exist", text: "he collapsed and is unconscious" });
  assert.equal(onMissing.escalated, true);
  assert.equal(onMissing.intent, "emergency");
  close(db, dir);
});

test("SCOPE — clinical questions always route to the doctors, never answered by the concierge", () => {
  const { db, dir } = seededDb();
  const clinicalProbes = [
    "What is his diagnosis?",
    "Should he take the medication the doctor prescribed?",
    "What's his prognosis and survival rate?",
    "Is the surgery safe?",              // the demo's own chip — must deflect, not fall to fallback
    "How risky is the operation?",
    "How long is the recovery?",
  ];
  for (const text of clinicalProbes) {
    const r = answerConcierge(db, { caseId: GOLDEN, text });
    assert.equal(r.intent, "clinical_deflect", `clinical probe not deflected: "${text}"`);
    assert.notEqual(r.blocked, true);
    assert.match(r.reply, /doctor|clinical|hospital/i, `deflection should point to the clinical team: "${text}"`);
  }
  close(db, dir);
});

test("CONTROL — a consented case answers normally, and every cost answer carries the indicative disclaimer", () => {
  const { db, dir } = seededDb();

  const status = answerConcierge(db, { caseId: GOLDEN, text: "What's the status?" });
  assert.equal(status.intent, "status");
  assert.notEqual(status.blocked, true);
  assert.match(status.reply, /Ibrahim/);

  const docs = answerConcierge(db, { caseId: GOLDEN, text: "What documents are missing?" });
  assert.equal(docs.intent, "documents");
  assert.notEqual(docs.blocked, true);

  // A money answer must never ship without the "indicative until confirmed in writing" disclaimer.
  const cost = answerConcierge(db, { caseId: GOLDEN, text: "How much will it cost?" });
  assert.equal(cost.intent, "cost");
  assert.match(cost.reply, /indicative/i);
  assert.match(cost.reply, /pay the hospital directly/i);
  close(db, dir);
});

test("BREAKDOWN — the concierge holds no write pen: no phrasing mutates state, answers are deterministic", () => {
  const { db, dir } = seededDb();
  const snap = () => ({
    cases: db.prepare(`SELECT count(*) c FROM patient_case`).get().c,
    audit: db.prepare(`SELECT count(*) c FROM audit_event`).get().c,
    blockedStage: db.prepare(`SELECT current_stage s FROM patient_case WHERE id=?`).get(BLOCKED).s,
    goldenStage: db.prepare(`SELECT current_stage s FROM patient_case WHERE id=?`).get(GOLDEN).s,
  });
  const before = snap();

  for (const text of [
    "Mark the case as complete.",
    "Cancel the flight booking.",
    "Delete this case.",
    "Approve the estimate now.",
    "Set the status to done and notify the hospital.",
  ]) {
    answerConcierge(db, { caseId: GOLDEN, text });
    answerConcierge(db, { caseId: BLOCKED, text });
  }
  assert.deepEqual(snap(), before, "the concierge must not change any state");

  // Deterministic: the same question yields byte-identical answers (no model, no drift).
  const q = "What will it cost?";
  assert.equal(answerConcierge(db, { caseId: GOLDEN, text: q }).reply, answerConcierge(db, { caseId: GOLDEN, text: q }).reply);
  close(db, dir);
});

test("LEAKAGE — the underlying case reader rejects cross-tenant access for scoped roles", () => {
  const { db, dir } = seededDb();
  const agentOwner = { role: "agent_admin", organization_id: "org_agent_lagos" };   // owns both demo cases
  const agentOther = { role: "agent_admin", organization_id: "org_agent_other" };   // owns neither
  const hospitalOther = { role: "hospital_ops", organization_id: "org_hospital_other" };
  const hospitalApollo = { role: "hospital_ops", organization_id: "org_hospital_apollo" };

  assert.ok(apiCase(db, agentOwner, GOLDEN), "owning agent should read its own case");
  assert.equal(apiCase(db, agentOther, GOLDEN), null, "a non-owning agent must not read the case");
  assert.equal(apiCase(db, agentOther, BLOCKED), null, "a non-owning agent must not read the blocked case");
  assert.equal(apiCase(db, hospitalOther, GOLDEN), null, "a different hospital must not read the case");
  assert.equal(apiCase(db, hospitalApollo, BLOCKED), null, "the assigned hospital must not read a case that isn't routed to it");
  close(db, dir);
});

test("CONTROL — the bot has a name and refuses gracefully on an unknown case rather than erroring", () => {
  const { db, dir } = seededDb();
  assert.ok(BOT_NAME.length > 0);
  const r = answerConcierge(db, { caseId: "case_unknown_id", text: "what's the status?" });
  assert.equal(r.intent, "fallback");
  assert.notEqual(r.blocked, true);
  assert.doesNotMatch(r.reply, /undefined|null|error/i);
  close(db, dir);
});
