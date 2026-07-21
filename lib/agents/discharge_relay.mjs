// DISCHARGE & MEDICATION RELAY AGENT — the highest-stakes text in the whole concierge journey, and
// deliberately the most restricted agent in this codebase.
//
// This agent NEVER generates medical content. It takes what the hospital's clinical team actually wrote —
// discharge instructions, a medication schedule — and does exactly two things to it: restructures it for
// readability (headings, a plain sequence) and translates it, without adding, removing, or softening a
// single clinical fact. If the hospital gave nothing, this agent produces nothing; it does not fill the gap
// with what "usually" happens after this kind of procedure, because that would be inventing a medication
// instruction, which is the single worst thing this system could ever output.
//
// TWO GUARDRAILS BEYOND THE NORMAL ONE: the model never receives an instruction to compose, only to
// relay — the prompt explicitly forbids adding a single fact — and the output ALWAYS requires human sign-off
// before it can send, regardless of what the safety gate says. checkMessage() catches dosage/prognosis
// language; it does not and cannot verify that a relay is FAITHFUL to a source document. Only a human who
// has read both can confirm that, so this agent never claims to have cleared itself.
import { generate } from "../../integrations/glm_generate.mjs";
import { checkMessage } from "../safety.mjs";

const SYSTEM = `You are a faithful relay, not a clinician. You will be given a hospital's own discharge
instructions verbatim. Your ONLY job: restructure them into a clear, numbered, plain-language format for a
patient to follow, and translate them if asked. You must NOT add any instruction, dose, timing, or warning
that was not explicitly present in the source text. You must NOT soften, generalise, or interpret anything
("take as needed" must stay "take as needed" — never guess a frequency). If the source is ambiguous, keep it
exactly as ambiguous in your output and do not resolve the ambiguity yourself. Output ONLY the restructured
instructions, nothing else.`;

export async function relayDischarge(hospitalText, { language = "en" } = {}) {
  if (!hospitalText || hospitalText.trim().length < 10)
    return { error: "no hospital discharge text provided — this agent will not generate one. Get the actual instructions from the hospital first." };

  const hasKey = !!(process.env.NVIDIA_API_KEY || process.env.GEMINI_API_KEY);
  let text, method;
  if (!hasKey) {
    // Deterministic floor: pass the source through with a formatting note, rather than attempt restructuring
    // without a model. Under-formatted-but-faithful beats well-formatted-but-invented, always.
    text = `[Unformatted — no LLM key; showing the hospital's text as given, unmodified]\n\n${hospitalText.trim()}`;
    method = "deterministic-passthrough";
  } else {
    const langLine = language !== "en" ? ` Translate the result into ${language}, faithfully — do not paraphrase away specifics.` : "";
    const prompt = `Hospital discharge instructions, verbatim:\n"""${hospitalText.trim()}"""\nRestructure for a patient to follow.${langLine}`;
    try { text = (await generate(prompt, { system: SYSTEM, maxTokens: 900, temperature: 0.1 })).trim(); method = "llm"; }
    catch (e) { text = hospitalText.trim(); method = "llm-failed-passthrough"; }
  }

  const safe = checkMessage(text, { outbound: true });
  // ALWAYS requires review — the generic safety gate is necessary but not sufficient here (see file header).
  return { text, method, safety: { verdict: "review", note: "medication/discharge content — ALWAYS requires a human to confirm this matches the hospital's original text before it can send, regardless of the automated scan below", scan: safe } };
}
