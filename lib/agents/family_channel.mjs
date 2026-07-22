// FAMILY CHANNEL — routes a family_update.mjs message to an actual person, correctly.
//
// The gap this closes: family_update.mjs generates good TEXT, but "will go on WhatsApp?" is really asking
// where it goes and under what rule, and the honest answer is: nowhere, automatically, ever — because the
// family member waiting at home is not the patient. It's a second person, on a second phone number, who
// has never messaged us. That means two things WhatsApp and privacy both force on us:
//
//   1. CONSENT is separate from the patient's. Telling a relative about someone's medical care is sharing
//      a third party's information with another third party — it needs its own opt-in, not inherited from
//      the patient's consent to be contacted themselves.
//   2. The WhatsApp SESSION/TEMPLATE rule applies to this thread independently (see lib/comms_machine.mjs
//      for the patient-side version of the same rule). The first message to a number that has never
//      messaged us must be an approved template — never freeform — exactly like patient first-touch.
//
// So this is a state machine with two states per contact: no consent → the only allowed action is sending
// the opt-in template; consent → the daily update is allowed, still human-gated, still safety-checked,
// still written to outbox rather than sent. Nothing here calls a real WhatsApp API — POST_LIVE-gated
// sending is lib/publishers.mjs's job, same as every other channel.
import { familyUpdate } from "./family_update.mjs";
import { checkMessage } from "../safety.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = join(ROOT, "outputs", "comms", "outbox");

export function addFamilyContact(db, leadId, { name, phone, relationship = "family", language = "en" } = {}) {
  if (!name || !phone) return { error: "name and phone are required" };
  const r = db.prepare(`INSERT INTO family_contact (lead_id, name, phone, relationship, language) VALUES (?,?,?,?,?)`)
    .run(leadId, name, phone, relationship, language);
  return { id: r.lastInsertRowid, leadId, name, phone, relationship, language, consent: 0 };
}

// The first-touch template — the ONLY message allowed before consent. Mirrors the shape of the patient
// first_touch template in comms_template: short, states who we are, states why we're messaging, asks for
// an explicit yes. A real deployment files this with Meta exactly like the other 21 templates.
export function optInTemplate({ name, patientFirstName = "your family member" }) {
  return `Hello${name ? " " + name : ""}, this is MedYatra. ${patientFirstName} is being treated in India and ` +
    `listed you as someone they'd like us to keep updated — we know you'll be thinking of them. Reply YES for a ` +
    `short daily note on how things are going, or STOP if you'd rather not be contacted. We'll only ever send ` +
    `the updates you've agreed to, nothing else.`;
}

export function recordOptIn(db, contactId, consent) {
  db.prepare(`UPDATE family_contact SET consent=?, consent_at=datetime('now'), opted_out=? WHERE id=?`)
    .run(consent ? 1 : 0, consent ? 0 : 1, contactId);
  return { contactId, consent: !!consent };
}

// The core routing decision. Returns what CAN be sent right now and why — never sends anything itself.
export async function queueFamilyUpdate(db, leadId, { stage, note = "", patientFirstName = "the patient" } = {}) {
  const contacts = db.prepare(`SELECT * FROM family_contact WHERE lead_id=? AND opted_out=0`).all(leadId);
  if (!contacts.length) return { queued: [], reason: "no family contact on file for this lead — add one with addFamilyContact() before any update can be sent" };

  mkdirSync(OUT, { recursive: true });
  const queued = [];
  for (const c of contacts) {
    if (!c.consent) {
      const body = optInTemplate({ name: c.name, patientFirstName });
      const file = join(OUT, `family-${leadId}-${c.id}-optin.txt`);
      writeFileSync(file, `TO: ${c.phone} (${c.name}, ${c.relationship})\nVIA: template (first touch — no consent on file)\n\n${body}\n`);
      queued.push({ contactId: c.id, via: "template", reason: "no consent yet — opt-in only, cannot send the actual update", file });
      continue;
    }
    const upd = await familyUpdate({ stage, patientFirstName: c.name ? patientFirstName : patientFirstName, note, language: c.language });
    if (upd.safety.verdict === "block" || upd.safety.verdict === "escalate") {
      queued.push({ contactId: c.id, via: "blocked", reason: `safety gate: ${upd.safety.verdict}`, findings: upd.safety.findings });
      continue;
    }
    const file = join(OUT, `family-${leadId}-${c.id}-${stage}.txt`);
    writeFileSync(file, `TO: ${c.phone} (${c.name}, ${c.relationship})\nVIA: freeform (consented ${c.consent_at})\nSAFETY: ${upd.safety.verdict}\n\n${upd.text}\n--- gate: HUMAN — approve in Studio before send (POST_LIVE dry-run) ---\n`);
    db.prepare(`UPDATE family_contact SET last_outbound_at=datetime('now') WHERE id=?`).run(c.id);
    queued.push({ contactId: c.id, via: "freeform", text: upd.text, method: upd.method, safety: upd.safety, file });
  }
  return { leadId, queued };
}
