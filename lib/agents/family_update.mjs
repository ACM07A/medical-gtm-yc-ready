// FAMILY UPDATE AGENT — a daily, plain-language message to whoever is waiting at home, in their language.
//
// This is the single highest-trust, lowest-cost thing in the whole concierge journey, and the reason it
// does not exist anywhere else in this market is structural: a human-coordinator model cannot afford to
// write it, every day, in six languages, for every admitted patient. An agent can, almost for free. It is
// the clearest demonstration of why an AI-native facilitator is a different kind of company, not a cheaper
// version of the same one — see PROJECT_CONTEXT.md §5.6 and BUSINESS_STATUS.md.
//
// SCOPE: this reports STATUS, never CONDITION. "In recovery, resting" is ours to say; "the surgery went
// well" is not — that is an outcome claim and belongs to the hospital. The prompt draws that line and the
// safety gate enforces it, same discipline as everywhere else agent output reaches a person.
import { generate } from "../../integrations/glm_generate.mjs";
import { checkMessage } from "../safety.mjs";
import { withEmpathy } from "../voice.mjs";

const STAGE_STATUS = {
  travel: "has arrived and is settling in near the hospital",
  pre_op: "is at the hospital completing pre-procedure checks",
  in_treatment: "is at the hospital; the care team has today's update",
  complication: "is being cared for; the hospital's team is actively managing today's plan",
  post_op: "is in recovery at the hospital",
  recovery_bundle: "has moved to the recovery stay",
};

const SYSTEM = withEmpathy(`You write short daily updates to a family member waiting at home while their
relative is being treated abroad — someone who is anxious and thinking about the person constantly. You report
LOGISTICAL STATUS ONLY — where they are, that they are being cared for, what happens next, when the next
update will come. You NEVER report a clinical outcome, NEVER say how the procedure "went," NEVER offer
reassurance about medical results ("all went well", "nothing to worry about") — that is the hospital's to say,
not ours, and saying it is not something we are allowed to do. If you don't know something, say the hospital's
team will share it directly. Two to four sentences.`);

// Deterministic fallback — used with no LLM key, or if generation fails. Still genuinely useful; a family
// member checking WhatsApp does not need literary prose, they need to know their relative is not forgotten.
function deterministicUpdate(stageLabel, patientFirstName = "your relative") {
  return `Hello — a short update on ${patientFirstName}, we know you'll be thinking of them. ${patientFirstName} ${stageLabel}. ` +
    `We'll message again tomorrow with the next update. If the hospital's team has anything to share about the ` +
    `procedure itself, they'll be in touch with you directly. We're here if you need anything in the meantime.`;
}

export async function familyUpdate({ stage, patientFirstName = "your relative", note = "", language = "en" } = {}) {
  const stageLabel = STAGE_STATUS[stage] || "is progressing through their treatment";
  const hasKey = !!(process.env.NVIDIA_API_KEY || process.env.GEMINI_API_KEY);

  let text, method;
  if (!hasKey) {
    text = deterministicUpdate(stageLabel, patientFirstName);
    method = "deterministic";
  } else {
    const langLine = language !== "en" ? ` Write it in ${language}.` : "";
    const prompt = `Patient: ${patientFirstName}. Current stage: ${stageLabel}.${note ? ` Additional logistics note (status only, not clinical): "${note}".` : ""}${langLine}\nWrite today's family update.`;
    try {
      text = (await generate(prompt, { system: SYSTEM, maxTokens: 220, temperature: 0.6 })).trim();
      method = "llm";
    } catch (e) {
      text = deterministicUpdate(stageLabel, patientFirstName);
      method = "llm-failed-fallback";
    }
  }

  // Every family update clears the same clinical-scope gate as any other outbound message — this is
  // exactly the surface an over-eager model would drift into "the surgery went well" on, so it is checked,
  // not trusted.
  const safe = checkMessage(text, { outbound: true });
  return { text, method, stage, safety: { verdict: safe.verdict, findings: safe.findings } };
}
