// DOCUMENT KYC AGENT — a stateful verification workflow, not a checklist that resets every time you look
// at it. document_checklist.mjs answers "what does this patient need" (stateless, per-country facts, still
// used to SEED this). This agent answers "of what they need, what's actually in hand, what's been checked,
// and what's still blocking" — which requires persistence (data-core/db.mjs: doc_item) because a real
// intake spans days and multiple submissions, not one screen.
//
// WHAT "AGENTIC" MEANS HERE, PRECISELY: some checks are genuinely deterministic (a passport expiry date is
// arithmetic; a submitted amount either clears the quoted total or it doesn't) and are verified
// automatically. Others cannot be — nobody should trust a model's opinion that a photo "looks compliant,"
// so those are marked `needs_human_review` on submission and STAY there until a person clears them. The
// agent's job is running the deterministic checks correctly and being honest about which items it cannot
// itself decide — not pretending to verify what it can't.
import { visaChecklist, attendantsAllowed, MED_VISA_FACTS } from "../visa.mjs";

// Canonical item keys, derived from the same facts document_checklist.mjs uses, but split into ones a rule
// can check vs ones that always need eyes on them.
function seedItems(countryCode, attendants) {
  const vc = visaChecklist(countryCode);
  const items = vc.documents.map((label) => {
    const key = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 40);
    const auto = /passport valid/i.test(label);   // the one item with an unambiguous, checkable rule
    return { key, label, auto };
  });
  if (attendants > 0) items.push({ key: "attendant_docs", label: `Attendant visa documents × ${attendants}`, auto: false });
  items.push({ key: "invitation_letter", label: "Hospital Medical Invitation Letter — issued by the hospital, we chase this, you don't", auto: false, hospitalOwned: true });
  items.push({ key: "frro", label: `FRRO registration: ${MED_VISA_FACTS.frro}`, auto: false, deferred: true });
  return items;
}

// Idempotent: only inserts items that don't already exist for this lead, so re-running never wipes progress.
export function initChecklist(db, leadId, { countryCode, attendants = 1, category = null } = {}) {
  const items = seedItems(countryCode, attendants);
  const ins = db.prepare(`INSERT OR IGNORE INTO doc_item (lead_id, key, label, status) VALUES (?,?,?, 'missing')`);
  for (const it of items) ins.run(leadId, it.key, it.label);
  return kycStatus(db, leadId);
}

// A submission carries whatever evidence exists for that item. `value` is free text for most (we don't
// receive real documents in this build, only what a patient/hospital states); for `passport_valid` it's
// expected to be an ISO date (expiry) so the one deterministic rule can actually run.
export function submitDocument(db, leadId, key, value, { note = "" } = {}) {
  const row = db.prepare(`SELECT * FROM doc_item WHERE lead_id=? AND key=?`).get(leadId, key);
  if (!row) return { error: `unknown document key '${key}' for lead ${leadId} — run initChecklist first` };

  let status = "needs_human_review";   // default: submitted, but a person must clear it
  let autoNote = note;

  if (/^passport_valid/.test(key) && value) {
    const expiry = new Date(value);
    const sixMonthsOut = new Date(); sixMonthsOut.setMonth(sixMonthsOut.getMonth() + 6);
    if (isNaN(expiry.getTime())) { status = "needs_human_review"; autoNote = "expiry date unreadable — human check the passport directly"; }
    else if (expiry >= sixMonthsOut) { status = "verified"; autoNote = autoNote || "expiry clears the 6-month rule — verified automatically"; }
    else { status = "rejected"; autoNote = `passport expires ${value}, inside the 6-month window — this WILL be rejected at the mission; patient needs to renew before applying`; }
  }

  db.prepare(`UPDATE doc_item SET status=?, value=?, note=?, submitted_at=datetime('now'), checked_at=datetime('now') WHERE lead_id=? AND key=?`)
    .run(status, value, autoNote, leadId, key);
  return { key, status, note: autoNote };
}

// A human (Studio) override — for the items the agent correctly refused to auto-clear.
export function reviewDocument(db, leadId, key, { approve, note = "" } = {}) {
  db.prepare(`UPDATE doc_item SET status=?, note=?, checked_at=datetime('now') WHERE lead_id=? AND key=?`)
    .run(approve ? "verified" : "rejected", note, leadId, key);
  return kycStatus(db, leadId);
}

export function kycStatus(db, leadId) {
  const items = db.prepare(`SELECT key, label, status, value, note FROM doc_item WHERE lead_id=? ORDER BY id`).all(leadId);
  if (!items.length) return { leadId, items: [], complete: false, blocking: [], percent: 0, note: "not initialised — call initChecklist first" };
  const verified = items.filter((i) => i.status === "verified").length;
  const blocking = items.filter((i) => i.status === "missing" || i.status === "rejected" || i.status === "needs_human_review");
  return {
    leadId, items, percent: Math.round((verified / items.length) * 100),
    complete: verified === items.length,
    blocking: blocking.map((i) => ({ key: i.key, label: i.label, status: i.status, why: i.note })),
    readyToApply: blocking.filter((i) => i.status !== "needs_human_review").length === 0 && blocking.filter(i => i.status === 'needs_human_review').length === 0,
  };
}
