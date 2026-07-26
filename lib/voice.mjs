// VOICE — Canopus Care's empathy principle, in one place, hardcoded.
//
// The user's standing mandate (2026-07-22): "Empathy has to be hardcoded across the business model and
// everything that Canopus Care does" — and, pointedly, "not only in the messaging" but in the content that gets
// published too. This file is the literal implementation of "hardcoded in one place": one shared CORE, and
// two composers that adapt it to the two surfaces where the register genuinely differs — short 1:1 messages
// vs. long-form published content a frightened stranger reads alone. Every patient-/family-facing generator
// builds its system prompt from here rather than reinventing a warm tone that drifts. Grep `EMPATHY` for
// every surface it governs.
//
// WHO THE READER IS, ALWAYS: a person going through one of the hardest, most frightening things in their
// life — a parent's cancer, their own diagnosis, a decision made far from home under real money and time
// pressure, often in a second language. The copy only works if it reads like it was written by someone who
// understands that. That is a product requirement here, not a nicety: it is the difference between a
// facilitator trusted with the hardest decision of someone's life and an aggregator that is not.

// The universal core — true on every surface, message or published page.
const EMPATHY_CORE = `Remember who is reading: a person going through one of the hardest, most frightening
things in their life — a serious diagnosis, a loved one's surgery, a decision made far from home under real
money and time pressure, often in a language that isn't their first.
- Acknowledge the human weight before the logistics. If the news is hard, the wait anxious, or the answer not
  what they hoped, be kind and honest about that first — then be useful.
- Plain, warm, human words. Empty comfort ("peace of mind", "rest assured", "world-class") reads as insincere
  to someone genuinely afraid; concrete honesty is what actually reassures.
- Warmth is NEVER a promise about a medical outcome — that belongs to the doctors, and it is a line we do not
  cross. Be warm about the person and the process, honest about the medicine.
- Never use fear or urgency to push. "Whenever you're ready", "we're here" — never "act now".`;

// MESSAGES — 1:1 WhatsApp / family updates. Here brevity is itself a kindness.
export const EMPATHY = `${EMPATHY_CORE}
- Short is kinder than thorough here: respect their stress and their time, and keep it brief.`;

// PUBLISHED CONTENT — guides, social posts, anything a patient reads alone, often at 2am, often about someone
// they love. The register is different: here thoroughness IS the kindness, and there is a moral line about
// never trading on fear to sell.
export const EMPATHY_CONTENT = `${EMPATHY_CORE}
- Write to that frightened person, never to a search engine and never about the business. Their fear is real
  even when their questions sound practical; meet it with substance, not sympathy theatre.
- Here, thoroughness IS the kindness. A scared person needs the complete, honest picture — so answer the
  question fully, and answer the ones they haven't dared to ask out loud: is cheaper worse, will they be safe,
  what happens if something goes wrong far from home.
- Never use their fear to sell. No manufactured urgency, no "huge savings" spun over someone's illness, no
  exploiting worry. Trust is earned by being the most useful and most honest page they find, not the most
  persuasive one.
- Be honest to be kind: name plainly what a price does NOT cover and what can go wrong. Hiding it to sound
  comforting is a betrayal a frightened reader will feel later.
- Respect their intelligence and their language: write like a real expert who cares, in genuinely native
  prose in whatever language you are asked to write, never a translated brochure.`;

// Compose a system prompt with the MESSAGE empathy principle. For short 1:1 patient/family messages.
// Deliberately NOT used for the discharge/medication relay (lib/agents/discharge_relay.mjs): that agent must
// relay the hospital's clinical text WITHOUT softening or adding a word, and empathy instructions would be
// actively dangerous there — warmth is not allowed to change a dose or a warning. That exception is a feature
// of the principle, not a gap in it.
export function withEmpathy(system) {
  return `${system}\n\nHOW TO SOUND — this governs every word you write:\n${EMPATHY}`;
}

// Compose a system prompt with the CONTENT empathy principle. For anything published for a patient to read —
// long-form guides (gen_content), social repurposing (repurpose_content), SEO copy (gen_meta), credibility
// narratives (gen_credibility).
export function withEmpathyContent(system) {
  return `${system}\n\nHOW TO SOUND — this governs every word you write:\n${EMPATHY_CONTENT}`;
}
