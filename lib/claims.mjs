// Claim + voice linter for generated partner-facing text. Two failure modes the "no fabrication" guardrail
// missed because it only watched for MISSING numbers, not numbers dressed up as adjectives:
//   1. Confident quantifiers with no cited figure ("significant demand from the GCC") — must be tagged
//      [VERIFY: quantify + cite], same rule the compliance doc already requires for missing stats.
//   2. Generic LLM register ("seamless patient journeys", "bridging this gap", "world-class") — flagged so
//      it gets cut before it reaches the human queue, not after.

// vague magnitude words that imply data without giving it
const VAGUE = /\b(significant|substantial|strong|considerable|huge|massive|robust|surging|booming|rapidly[- ]growing|growing rapidly|tremendous|enormous|sizable|sizeable)\s+(demand|growth|market|interest|volume|opportunity|opportunities|number|pipeline|potential|need|appetite)\b/gi;

// LLM-default filler / corporate voice
const FILLER = [
  "seamless", "bridging the gap", "bridge this gap", "world-class", "world class", "cutting-edge", "cutting edge",
  "leverage", "leverages", "leveraging", "unlock", "unlocking", "elevate", "elevating", "tailored solutions",
  "patient journey", "patient journeys", "ecosystem", "synergy", "synergies", "best-in-class", "holistic",
  "empower", "empowering", "streamline", "streamlining", "at the forefront", "game-chang", "state-of-the-art",
  "unwavering", "testament to", "in today's", "ever-evolving", "landscape of", "dedicated to providing",
];

// Insert a [VERIFY] tag after any vague magnitude claim that has no number within ~45 chars.
export function tagVagueClaims(text) {
  const flags = [];
  const out = text.replace(VAGUE, (m, adj, noun, offset) => {
    const window = text.slice(offset, offset + 55);
    if (/\d/.test(window)) return m;                 // already quantified nearby → leave it
    flags.push(m.trim());
    return `${m} [VERIFY: quantify + cite a source]`;
  });
  return { text: out, flags };
}

// List filler phrases present (for a QA flag / de-AI pass).
export function findFiller(text) {
  const low = text.toLowerCase();
  return [...new Set(FILLER.filter((p) => low.includes(p)))];
}

// One call for the proposal/outreach QA: tag vague claims + report filler.
export function lintClaims(text) {
  const { text: tagged, flags } = tagVagueClaims(text);
  return { text: tagged, vague: flags, filler: findFiller(tagged) };
}
