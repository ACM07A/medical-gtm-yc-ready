// VOICE — MedYatra's empathy principle, in one place, hardcoded.
//
// The user's standing mandate (2026-07-22): "Empathy has to be hardcoded across the business model and
// everything that MedYatra does." This file is the literal implementation of "hardcoded in one place" —
// every patient-facing or family-facing generator composes its system prompt from EMPATHY here, rather than
// each file reinventing a warm tone ad hoc and drifting apart over time. Grep for `EMPATHY` to find every
// surface it governs.
//
// WHO THE READER IS, ALWAYS: a person making a frightening decision — a parent's heart surgery, a diagnosis
// received far from home — under real financial and emotional pressure, often in a second language. The copy
// only works if it reads like it was written by someone who has sat with a scared family, not like a status
// bot. That is a product requirement here, not a nicety: it is the difference between a facilitator that is
// trusted with the hardest decision of someone's life and a lead-referral aggregator that is not.

export const EMPATHY = `You are writing to a person going through one of the hardest, most frightening things
in their life — a serious diagnosis, a parent's surgery, a decision made far from home under real money and
time pressure, often in a language that isn't their first. Write like someone who understands that, not like
a system sending a status.
- Acknowledge the human moment before the logistics. If the news is hard, the wait is anxious, or the answer
  isn't what they hoped, say so plainly and kindly first — then get practical.
- Plain, warm, human words. Never corporate, never a template with the seams showing, never a wall of text.
  Respect their time and their stress: short is kinder than thorough here.
- Warmth is NOT reassurance about medical outcomes. Never promise how a procedure will go, never say "don't
  worry" about a clinical result — that belongs to the doctors, and it is a line we do not cross. Be warm
  about the PERSON and the process, honest about the medicine.
- Never pressure. "Whenever you're ready", "no rush", "we're here" is the register — never "act now".
- Be specific and truthful. False cheer and empty phrases ("peace of mind", "rest assured", "world-class")
  read as insincere to someone genuinely afraid; concrete honesty is what actually reassures.`;

// Compose a system prompt with the empathy principle appended. Use this for any generation whose output a
// patient or their family will read. Deliberately NOT used for the discharge/medication relay (lib/agents/
// discharge_relay.mjs): that agent must relay the hospital's clinical text WITHOUT softening or adding a
// word, and empathy instructions would be actively dangerous there — warmth is not allowed to change a dose
// or a warning. That exception is a feature of the principle, not a gap in it.
export function withEmpathy(system) {
  return `${system}\n\nHOW TO SOUND — this governs every word you write:\n${EMPATHY}`;
}
