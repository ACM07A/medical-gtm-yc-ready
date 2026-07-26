// PATIENT–DOCTOR VIDEO CONSULT AGENT — the step between "quote finalized" and "book travel".
//
// Why it exists (user-directed, 2026-07-22): before a patient commits to flying, they should speak to the
// treating surgeon face-to-face. It converts (a named doctor beats a brochure), it de-risks (surgeon confirms
// suitability BEFORE anyone buys a ticket), and it is the single strongest trust moment in the funnel.
//
// The journey gate is real: the consult is scheduled only AFTER a finalized quote exists for the lead
// (estimate_line kind='quote') — that's what "post quote finalization" means mechanically. No quote, no consult.
//
// The compliance line (the whole design): the call is PATIENT ↔ DOCTOR. Canopus Care schedules it, checks the
// tech, attaches an interpreter — and is NOT a party to the clinical conversation. We do not join, record,
// store, or summarise the medical content of the call. What we keep is scheduling metadata only (that it
// happened, when, with which hospital) and the NON-clinical outcome (proceed / revise quote / not suitable) —
// the facilitator read-scope, same line lib/safety.mjs draws everywhere else.
//
// Deterministic core: timezone-overlap arithmetic between the hospital (IST) and the patient's market —
// a wrong "your doctor will call at 3pm" is worse than none. Video platform is provider-agnostic and
// clearly-labelled mock until keyed (Zoom/Meet/WhatsApp behind env keys) — the lib/plugins.mjs pattern.
// Requesting a slot is a human-gated dry-run, same posture as accommodation/ticketing.
import { checkMessage } from "../safety.mjs";
import { scheduleInterpreter } from "./interpreter_scheduling.mjs";

export const PLATFORM_SOURCE = "mock — no video provider keyed yet (Zoom/Meet/WhatsApp video are env-keys away, lib/plugins.mjs pattern)";

// Market-code → UTC offset (hours) for consult-window math. Curated, not exhaustive; unknown market falls
// back to +3 (mid-band for our source map) and says so rather than silently pretending precision.
const MARKET_TZ = {
  IQ: 3, OM: 4, YE: 3, AE: 4, SA: 3,                    // Middle East
  NG: 1, KE: 3, ET: 3, SD: 2, TZ: 3, ZM: 2, ZW: 2, NA: 2, CM: 1,  // Africa
  UZ: 5, KZ: 5, TJ: 5, KG: 6, TM: 5,                    // Central Asia
  MM: 6.5, GB: 0, IE: 0,                                 // SE Asia + Europe
};
const IST = 5.5;                                          // the hospital side, always India
const DOCTOR_HOURS = [10, 17];                            // consult slots a surgeon realistically offers, IST

// The overlap of the doctor's IST consult hours with the patient's waking hours (08–21 local), expressed in
// BOTH clocks. Pure arithmetic — this is the part that must never be wrong.
export function consultWindow({ marketCode }) {
  const tz = MARKET_TZ[marketCode] ?? 3;
  const assumed = !(marketCode in MARKET_TZ);
  const shift = tz - IST;                                 // add to an IST hour to get patient-local
  const lo = Math.max(DOCTOR_HOURS[0], 8 - shift);        // patient local >= 08:00
  const hi = Math.min(DOCTOR_HOURS[1], 21 - shift);       // patient local <= 21:00
  if (lo >= hi) return { feasible: false, marketCode, reason: "no overlap between surgeon hours (IST) and the patient's waking hours — needs a special slot, escalate to the desk" };
  const fmt = (h) => `${String(Math.floor(h)).padStart(2, "0")}:${h % 1 ? "30" : "00"}`;
  return {
    feasible: true, marketCode, tzOffset: tz, tzAssumed: assumed,
    istWindow: [fmt(lo), fmt(hi)], localWindow: [fmt(lo + shift), fmt(hi + shift)],
    note: `Surgeon slots ${fmt(lo)}–${fmt(hi)} IST = ${fmt(lo + shift)}–${fmt(hi + shift)} for the patient${assumed ? " (timezone assumed +3 — market not in the curated map, verify)" : ""}`,
  };
}

// Schedule the consult for a lead. db-backed and idempotent (one service row kind='video_consult' per lead);
// GATED on a finalized quote existing. `preferredDateTimeIST` is "YYYY-MM-DDTHH:MM" in IST.
export function scheduleVideoConsult(db, { leadId, preferredDateTimeIST, language = "en", logRun } = {}) {
  if (!leadId) return { error: "leadId is required" };
  const lead = db.prepare(`SELECT id, market_code, category_id FROM lead WHERE id=?`).get(Number(leadId));
  if (!lead) return { error: `no lead ${leadId}` };

  // THE GATE — post quote finalization only. The consult confirms a concrete plan, not a maybe.
  const quote = db.prepare(`SELECT count(*) c, round(sum(amount)) total FROM estimate_line WHERE lead_id=? AND kind='quote'`).get(lead.id);
  if (!quote.c) return { gated: true, reason: "no finalized quote on this lead yet — the video consult is scheduled after quote finalization, not before. Record the quote first (estimate_line kind='quote')." };

  const win = consultWindow({ marketCode: lead.market_code });
  if (!win.feasible) return { gated: false, feasible: false, reason: win.reason };

  // Validate the preferred slot against the real overlap window (IST side).
  let slotNote = null, slot = preferredDateTimeIST || null;
  if (slot) {
    const t = new Date(slot);
    if (isNaN(t.getTime())) return { error: "preferredDateTimeIST must be a parseable date/time (YYYY-MM-DDTHH:MM, IST)" };
    const h = t.getHours() + t.getMinutes() / 60;
    const [lo, hi] = win.istWindow.map((s) => +s.split(":")[0] + (+s.split(":")[1] ? 0.5 : 0));
    if (h < lo || h >= hi) { slotNote = `preferred time ${slot.slice(11)} IST is outside the workable window ${win.istWindow[0]}–${win.istWindow[1]} IST — proposing the window instead`; slot = null; }
  }

  // Interpreter: attach one for non-English consults, reusing the interpreter agent (mock roster, labelled).
  let interpreter = null;
  if (language !== "en") {
    interpreter = scheduleInterpreter({ consultTime: slot || new Date().toISOString(), language });
  }

  // Idempotent service row — one video consult per lead; re-running updates rather than duplicating.
  const existing = db.prepare(`SELECT id, status, detail FROM service WHERE lead_id=? AND kind='video_consult'`).get(lead.id);
  const detail = JSON.stringify({ slotIST: slot, window: win, language, platform: "unkeyed (dry-run)", quoteTotal: quote.total });
  if (existing) db.prepare(`UPDATE service SET detail=?, updated=datetime('now') WHERE id=?`).run(detail, existing.id);
  else db.prepare(`INSERT INTO service (lead_id, kind, provider, status, detail) VALUES (?,?,?,?,?)`)
    .run(lead.id, "video_consult", "unkeyed", "requested", detail);

  const confirmText = slot
    ? `Your video consultation with your treating doctor is being arranged for ${slot.replace("T", " at ")} (India time — ${win.localWindow[0]}–${win.localWindow[1]} your time is the workable window). You'll receive the joining link once the hospital confirms. Your questions are welcome on the call — please have your reports nearby.`
    : `We're arranging your video consultation with your treating doctor. Times between ${win.localWindow[0]} and ${win.localWindow[1]} (your local time) work on both sides — tell us what suits you and we'll request it from the hospital.`;
  const safe = checkMessage(confirmText, { outbound: true });
  logRun?.(db, "Concierge", `Video consult · lead ${lead.id}`,
    `${existing ? "updated" : "requested"} — ${slot ? "slot " + slot + " IST" : "window proposed"} (${language})${slotNote ? " · " + slotNote : ""}`, null, "pending");

  return {
    gated: false, feasible: true, leadId: lead.id, slotIST: slot, window: win, slotNote,
    interpreter, quoteTotal: quote.total, platformSource: PLATFORM_SOURCE,
    dryRun: true, humanGate: "hospital desk confirms the surgeon slot; nothing is booked or sent without it",
    confirmText, safety: { verdict: safe.verdict, findings: safe.findings },
    dataScope: "scheduling metadata only — Canopus Care does not join, record, or store the clinical conversation",
  };
}

// Record the NON-clinical outcome after the call — the only thing we keep. 'proceed' | 'revise_quote' |
// 'not_suitable' | 'follow_up'. Clinical detail ("surgeon said X about the tumour") is REFUSED by design.
const OUTCOMES = ["proceed", "revise_quote", "not_suitable", "follow_up"];
export function recordConsultOutcome(db, { leadId, outcome, note = "", logRun } = {}) {
  if (!OUTCOMES.includes(outcome)) return { error: `outcome must be one of: ${OUTCOMES.join(" | ")}` };
  const scan = checkMessage(note, { outbound: false });
  if (scan.verdict === "block") return { refused: true, reason: "the note reads as clinical content — we keep scheduling metadata and a non-clinical outcome only. Clinical findings stay between the doctor and the patient (and in the hospital's record)." };
  const row = db.prepare(`SELECT id FROM service WHERE lead_id=? AND kind='video_consult'`).get(Number(leadId));
  if (!row) return { error: `no video consult on lead ${leadId} to record an outcome for` };
  db.prepare(`UPDATE service SET status=?, ref=?, updated=datetime('now') WHERE id=?`)
    .run(outcome === "proceed" ? "complete" : "requested", outcome, row.id);
  logRun?.(db, "Concierge", `Consult outcome · lead ${leadId}`, `${outcome}${note ? " — " + note.slice(0, 80) : ""}`, null, "ok");
  return { recorded: true, leadId: Number(leadId), outcome, next: {
    proceed: "move to travel booking (visa → stay → flights)",
    revise_quote: "hospital revises the quote; re-finalize, then re-confirm",
    not_suitable: "close the case with care — off-ramp comms, no travel",
    follow_up: "second consult or additional tests requested — hold travel",
  }[outcome] };
}
