// TRIAGE AGENT — turns a patient's own words (WhatsApp text, voice-note transcript, photo captions) into
// the structured case file a hospital consultant can review in three minutes. This is the "handoff" unit
// the whole business model is built around (see data-core/unit_economics.mjs) — it is what we sell.
//
// SCOPE, ENFORCED NOT REQUESTED: this agent EXTRACTS what the patient said. It never adds a clinical
// opinion, never estimates severity, never names a likely diagnosis. That line is enforced twice: the
// system prompt states it, and every field is re-checked against lib/safety.mjs before the result is
// trusted — because a prompt instruction is not a guarantee (see the safety-gate verdict bug in
// data-core/eval_safety.mjs; the same discipline applies here).
//
// WORKS WITHOUT A KEY. A demo, or a hospital call, must never break because a free-tier quota ran out —
// so a deterministic keyword extractor is the floor, and the LLM is a strict upgrade over it, not a
// dependency. Every result is tagged with which path produced it.
import { generate } from "../../integrations/glm_generate.mjs";
import { checkMessage } from "../safety.mjs";

const RED_FLAGS = /\b(chest pain|can'?t breathe|cannot breathe|unconscious|severe bleeding|bleeding heavily|stroke|slurred speech|seizure|suicid|overdose)\b/i;

// Deterministic fallback: keyword-only category guess, no clinical inference. Used when no LLM key is
// present, or if the model call fails — the demo degrades to "less smart," never to "broken."
const CATEGORY_KEYWORDS = {
  cardiac: /\b(heart|cardiac|bypass|valve|angioplasty|stent|chest pain)\b/i,
  ortho: /\b(knee|hip|joint|replacement|fracture|orthop)\b/i,
  oncology: /\b(cancer|tumou?r|chemo|oncolog|biopsy|marrow)\b/i,
  fertility: /\b(ivf|fertility|conceive|embryo)\b/i,
  cosmetic: /\b(bariatric|weight loss|gastric sleeve|obes)\b/i,
  dental: /\b(tooth|teeth|dental|implant|denture)\b/i,
};
function deterministicTriage(text) {
  const cat = Object.entries(CATEGORY_KEYWORDS).find(([, re]) => re.test(text))?.[0] || null;
  return {
    category_guess: cat, urgency: RED_FLAGS.test(text) ? "possible_emergency" : "unknown",
    key_facts: [text.slice(0, 200)], missing: ["structured extraction unavailable — no LLM key; raw text only"],
    method: "deterministic",
  };
}

// Structured extraction via the failover chain. STRICT JSON, STRICT scope: the prompt is written to refuse
// clinical inference the same way the safety gate refuses it downstream — belt and suspenders.
const SYSTEM = `You are an intake clerk for a medical-travel facilitator, not a clinician. Extract ONLY what
the patient stated. Never infer a diagnosis, never estimate severity, never suggest a treatment. If something
is unclear, put it in "missing" rather than guessing. Output ONLY valid JSON, no prose, no markdown fences.`;

export async function triage(patientText, { category_hint = null } = {}) {
  if (!patientText || !patientText.trim()) return { error: "empty input" };

  // Emergency check runs FIRST, on the raw patient text, before any generation call — an emergency must
  // never wait on an LLM round-trip.
  if (RED_FLAGS.test(patientText)) {
    return { urgency: "possible_emergency", action: "ESCALATE — do not continue the funnel; direct to local emergency services and notify a human immediately",
      key_facts: [patientText.slice(0, 200)], method: "emergency-shortcut", safety: { verdict: "escalate" } };
  }

  const hasKey = !!(process.env.NVIDIA_API_KEY || process.env.GEMINI_API_KEY);
  let result;
  if (!hasKey) {
    result = deterministicTriage(patientText);
  } else {
    const prompt = `Patient message${category_hint ? ` (they were asked about: ${category_hint})` : ""}:\n"""${patientText}"""\n\n` +
      `Return JSON: {"category_guess": one of [cardiac,ortho,oncology,fertility,cosmetic,dental,null],
"urgency": one of [routine,soon,unknown], "key_facts": [short factual bullet strings, quoting or closely
paraphrasing the patient — no inference], "missing": [what a hospital would need but wasn't given, e.g.
"no reports attached", "no timeline stated", "age not given"]}`;
    try {
      const raw = await generate(prompt, { system: SYSTEM, maxTokens: 500, temperature: 0.2 });
      const parsed = JSON.parse(raw.trim().replace(/^```json\s*|\s*```$/g, ""));
      result = { ...parsed, method: "llm" };
    } catch (e) {
      result = { ...deterministicTriage(patientText), method: "llm-failed-fallback", error: String(e.message || e).slice(0, 120) };
    }
  }

  // SAFETY RE-CHECK — the extraction is itself checked before being trusted, the same gate every outbound
  // message clears. An extraction agent that echoed a clinical inference back would fail exactly like a
  // drafted message would, and it is caught the same way.
  const asText = JSON.stringify(result);
  const safe = checkMessage(asText, { outbound: false });
  return { ...result, safety: { verdict: safe.verdict, findings: safe.findings } };
}
