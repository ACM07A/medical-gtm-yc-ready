// VISA ASSISTANCE (India e-Medical Visa) — SUPPORTING DOCUMENTS ONLY, not an application service. There is
// no third-party API into the government portal (indianvisaonline.gov.in), and Canopus Care does NOT submit on
// the patient's behalf. Since 1 Apr 2025 the e-Medical / e-Ayush visa REQUIRES a system-generated Medical
// Invitation Letter (Appendix II) issued by the registered hospital. So Canopus Care's role is deliberately
// narrow: orchestrate the hospital's letter (a HOSPITAL handoff) and hand the patient a country-correct
// checklist. The PATIENT still applies themselves on the government portal — that line hasn't moved. Tickets
// have: Canopus Care now searches and recommends flight dates (lib/flights.mjs, the ticketing agent), though the
// patient still completes the actual purchase — same human-gated posture as accommodation (lib/stay.mjs).
// A VFS concierge can be keyed for a tenant later — but the default posture keeps the coordination layer light.
//
// Sources: india-evisa (Apr-2025 invitation-letter rule), VFS Global medical-visa checklist. Public info.

// Attendants permitted on a MED-X (medical attendant) visa. General rule = 2; two documented exceptions.
export const ATTENDANTS = { default: 2, PK: 1, BD: 3 };
export const attendantsAllowed = (countryCode) => ATTENDANTS[(countryCode || "").toUpperCase()] ?? ATTENDANTS.default;

export const MED_VISA_FACTS = {
  portal: "https://indianvisaonline.gov.in",
  processingDays: "3–7 working days",
  applyLeadTime: "3–4 weeks before travel",
  invitationLetter: "System-generated Medical Invitation Letter (Appendix II) issued by the hospital, emailed to the Indian mission (mandatory since 1 Apr 2025)",
  frro: "If treatment exceeds 180 days, patient + attendants must register with FRRO/FRO within 14 days of arrival",
  serviceProvider: "VFS Global handles India visa services in many countries (optional concierge)",
};

// Country-correct document checklist. Base list applies everywhere; per-country notes layer on top.
const BASE_DOCS = [
  "Passport valid ≥ 6 months with ≥ 2 blank pages",
  "Recent passport-size photo (white background, per spec)",
  "Hospital Medical Invitation Letter (system-generated, Appendix II)",
  "Confirmed (or tentative) treatment plan + estimated duration & cost",
  "Proof of funds (bank statement) for treatment + stay",
  "Return / onward ticket (or itinerary)",
  "Proof of residence / address",
];
const COUNTRY_NOTES = {
  PK: ["Only 1 attendant permitted", "Additional security clearance — apply earlier (paper visa, not e-Visa)"],
  BD: ["Up to 3 attendants permitted", "High volume — book biometrics/appointment early"],
  NG: ["Yellow-fever vaccination certificate typically required"],
  default: [],
};

// The ordered visa steps for a lead — status walks: requested → awaiting_hospital_letter → letter_ready →
// applied → approved. Attendant visas mirror the patient's, capped by nationality.
export function visaChecklist(countryCode) {
  const cc = (countryCode || "").toUpperCase();
  return {
    country: cc || "unknown",
    attendantsAllowed: attendantsAllowed(cc),
    documents: [...BASE_DOCS, ...(COUNTRY_NOTES[cc] || COUNTRY_NOTES.default).map((n) => `Country note: ${n}`)],
    facts: MED_VISA_FACTS,
  };
}

export function visaSteps() {
  return [
    { key: "invitation", label: "Hospital issues system-generated invitation letter", owner: "hospital", status: "awaiting_hospital_letter" },
    { key: "documents", label: "Patient assembles checklist documents (Canopus Care supplies the letter + checklist)", owner: "patient", status: "collecting" },
    { key: "apply", label: "Patient applies on indianvisaonline.gov.in (e-Medical + MED-X for attendants)", owner: "patient", status: "applied" },
    { key: "biometrics", label: "Biometrics / VFS appointment where required", owner: "patient", status: "applied" },
    { key: "grant", label: "Visa granted (3–7 working days)", owner: "mission", status: "approved" },
    { key: "frro", label: "FRRO registration if stay > 180 days (within 14 days of arrival)", owner: "patient (Canopus Care reminds)", status: "post_arrival" },
  ];
}

// Kick off the visa workflow for a lead: create the patient visa + attendant-visa service rows, awaiting the
// hospital's letter. Idempotent per lead. Returns a summary. Human-gated — no external calls here.
export function startVisa(db, lead, { attendants = 1 } = {}) {
  const cc = (lead.market_code || "").toUpperCase();
  const cap = attendantsAllowed(cc);
  const nAtt = Math.max(0, Math.min(attendants, cap));
  const detail = JSON.stringify({ country: cc, checklist: visaChecklist(cc).documents, steps: visaSteps() });
  const has = (kind) => db.prepare(`SELECT id FROM service WHERE lead_id=? AND kind=?`).get(lead.id, kind);
  const add = (kind, prov) => { if (!has(kind)) db.prepare(
    `INSERT INTO service (lead_id,kind,provider,status,detail) VALUES (?,?,?,?,?)`)
    .run(lead.id, kind, prov, "awaiting_hospital_letter", detail); };
  const provider = process.env.VFS_API_KEY ? "vfs-concierge" : "self-guided";
  add("visa", provider);
  for (let i = 0; i < nAtt; i++) add("attendant_visa", provider);
  return { country: cc, attendantsAllowed: cap, attendantsRequested: nAtt,
    provider, blocked_on: "hospital invitation letter", facts: MED_VISA_FACTS };
}

export function visaStatus(db, leadId) {
  return db.prepare(`SELECT kind, status, provider, ref FROM service WHERE lead_id=? AND kind IN ('visa','attendant_visa') ORDER BY kind`).all(leadId);
}
