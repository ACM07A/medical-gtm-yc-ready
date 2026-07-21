// TRAVEL READINESS AGENT — the return-journey reminder. Tracks WHEN to start the return-travel
// conversation; never itself decides whether the patient is fit to fly.
//
// That split mirrors lib/safety.mjs's FITNESS_CALL guardrail exactly on purpose: "you are safe to fly" is a
// blocked clinical claim everywhere else in this system, and this agent is the one place that conversation
// naturally comes up, so it is the one place most tempting to fudge. It doesn't get to. This agent computes
// a date and asks the hospital a question; it never answers the question itself.
import { checkMessage } from "../safety.mjs";

// Rough, categoryLED minimum recovery windows before return-travel is even worth ASKING about — a starting
// point for the conversation, explicitly not a clearance. Real windows vary hugely by patient and always
// need the treating hospital's sign-off.
const MIN_DAYS_BEFORE_ASK = { cardiac: 10, oncology: 14, ortho: 7, fertility: 3, cosmetic: 10, dental: 2 };

export function returnReadiness({ category, dischargeDate, plannedReturnDate = null }) {
  if (!category || !dischargeDate) return { error: "category and dischargeDate are required" };
  const discharge = new Date(dischargeDate);
  if (isNaN(discharge.getTime())) return { error: "dischargeDate must be parseable" };
  const minDays = MIN_DAYS_BEFORE_ASK[category] ?? 10;
  const earliestAsk = new Date(discharge.getTime() + minDays * 86400000);
  const today = new Date();

  const status = today < earliestAsk ? "too_early_to_ask"
    : plannedReturnDate ? "ask_hospital_for_clearance" : "ask_patient_for_return_date";

  const text = {
    too_early_to_ask: `Too early to raise return travel — ${category} patients typically need at least ${minDays} days of recovery before this is even worth asking about. We'll check back closer to that point.`,
    ask_patient_for_return_date: `You're now past the earliest point we'd normally raise return travel for ${category} recovery. When you have a return date in mind, let us know and we'll confirm with your hospital's team that it works with your recovery plan.`,
    ask_hospital_for_clearance: `Before booking your return flight on ${plannedReturnDate}, we need the hospital's care team to confirm you're cleared to travel — that's their call, not ours. We'll follow up with them directly and come back to you.`,
  }[status];

  const safe = checkMessage(text, { outbound: true });
  return { category, dischargeDate, minRecoveryDays: minDays, earliestAsk: earliestAsk.toISOString(), status, text,
    safety: { verdict: safe.verdict, findings: safe.findings },
    note: "This agent NEVER clears a patient to fly — fitness-to-fly is always the hospital's determination (see lib/safety.mjs FITNESS_CALL)." };
}
