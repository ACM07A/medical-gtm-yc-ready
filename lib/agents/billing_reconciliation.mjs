// BILLING RECONCILIATION AGENT — explains a variance between the quoted and actual bill, line by line.
//
// This is where facilitator trust dies in the current market: a patient gets a bill that doesn't match the
// estimate, nobody explains why in a language they're comfortable in, and the relationship ends there
// regardless of whether the variance was legitimate (an extra night, a complication) or not.
//
// The MATH is deterministic — never let a model compute money. The explanation of what moved is generated
// prose over that deterministic diff, so the number a patient sees is always exactly arithmetic, and the
// only thing an LLM touches is how it's phrased.
import { generate } from "../../integrations/glm_generate.mjs";
import { checkMessage } from "../safety.mjs";

// Pure arithmetic — no model involved. This is the part that must never be "approximately right."
export function reconcile(quotedLines, actualLines) {
  const byLabel = (lines) => Object.fromEntries(lines.map((l) => [l.label, l.amount]));
  const q = byLabel(quotedLines), a = byLabel(actualLines);
  const labels = [...new Set([...Object.keys(q), ...Object.keys(a)])];
  const rows = labels.map((label) => {
    const quoted = q[label] ?? 0, actual = a[label] ?? 0;
    return { label, quoted, actual, delta: actual - quoted, isNew: !(label in q), isDropped: !(label in a) };
  });
  const totalQuoted = rows.reduce((s, r) => s + r.quoted, 0);
  const totalActual = rows.reduce((s, r) => s + r.actual, 0);
  return { rows, totalQuoted, totalActual, totalDelta: totalActual - totalQuoted,
    pct: totalQuoted ? Math.round(((totalActual - totalQuoted) / totalQuoted) * 100) : null };
}

const SYSTEM = `You explain a medical-travel bill variance to a patient in plain language. State only what
the numbers show — never speculate about WHY a line changed unless a reason was given to you explicitly.
Never mention this in a way that sounds defensive. If the total went up, say so plainly and say what to ask
the hospital for in writing. Two to four sentences, no bullet points, no headers.`;

export async function explainVariance(diff, { reasons = {} } = {}) {
  const hasKey = !!(process.env.NVIDIA_API_KEY || process.env.GEMINI_API_KEY);
  const moved = diff.rows.filter((r) => r.delta !== 0);

  let text, method;
  if (!moved.length) {
    text = `Your final bill matches the quote exactly — no variance on any line.`;
    method = "deterministic";
  } else if (!hasKey) {
    const lines = moved.map((r) => `${r.label}: quoted $${r.quoted.toLocaleString()}, actual $${r.actual.toLocaleString()} (${r.delta > 0 ? "+" : ""}$${r.delta.toLocaleString()})`);
    text = `Lines that changed from the quote: ${lines.join("; ")}. Total change: ${diff.totalDelta > 0 ? "+" : ""}$${diff.totalDelta.toLocaleString()} (${diff.pct}%).`;
    method = "deterministic";
  } else {
    const factLines = moved.map((r) => `${r.label}: quoted $${r.quoted}, actual $${r.actual}${reasons[r.label] ? ` (reason given: ${reasons[r.label]})` : " (no reason given)"}`).join("\n");
    const prompt = `Quote total: $${diff.totalQuoted}. Actual total: $${diff.totalActual} (${diff.totalDelta >= 0 ? "+" : ""}${diff.totalDelta}, ${diff.pct}%).\nLines that changed:\n${factLines}\nExplain this to the patient.`;
    try { text = (await generate(prompt, { system: SYSTEM, maxTokens: 220, temperature: 0.4 })).trim(); method = "llm"; }
    catch { text = `Total changed from $${diff.totalQuoted.toLocaleString()} to $${diff.totalActual.toLocaleString()} (${diff.pct}%). Ask the hospital for a written breakdown of what changed.`; method = "llm-failed-fallback"; }
  }

  const safe = checkMessage(text, { outbound: true });
  return { text, method, diff, safety: { verdict: safe.verdict, findings: safe.findings } };
}
