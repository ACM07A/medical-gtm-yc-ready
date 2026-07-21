// AGENT SMOKE TEST — runs all four concierge agents headlessly and checks they return usable output,
// with or without an LLM key. This exists specifically for "the demo must not break live in front of
// someone" — run it before any call, not during one.
//   node --experimental-sqlite data-core/smoke_agents.mjs
import { triage } from "../lib/agents/triage.mjs";
import { familyUpdate } from "../lib/agents/family_update.mjs";
import { documentChecklist } from "../lib/agents/document_checklist.mjs";
import { reconcile, explainVariance } from "../lib/agents/billing_reconciliation.mjs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") { console.log(`  ${ok ? "✓" : "✗"} ${name}${detail ? " — " + detail : ""}`); ok ? pass++ : fail++; }

console.log(`\n  AGENT SMOKE TEST — ${process.env.NVIDIA_API_KEY || process.env.GEMINI_API_KEY ? "LLM key present" : "no LLM key — deterministic fallback path"}\n`);

const t = await triage("I need a knee replacement, I'm 58, from Oman, no reports yet");
check("triage: returns key_facts", Array.isArray(t.key_facts) && t.key_facts.length > 0);
check("triage: safety verdict present", !!t.safety?.verdict);

const emergency = await triage("crushing chest pain, can't breathe");
check("triage: emergency escalates (not a quote)", emergency.urgency === "possible_emergency" && emergency.safety.verdict === "escalate");

const fu = await familyUpdate({ stage: "post_op", patientFirstName: "Fatima", note: "first walk today" });
check("family-update: non-empty, not truncated mid-word", fu.text.length > 40 && /[.!]\s*$/.test(fu.text.trim()), `"${fu.text.slice(0, 60)}…"`);
check("family-update: safety verdict present", !!fu.safety?.verdict);

const dc = documentChecklist({ countryCode: "OM", attendants: 1, category: "cardiac" });
check("document-checklist: has items", dc.items.length > 5);
check("document-checklist: attendant math correct", dc.attendantsAllowed === 2);

const diff = reconcile([{ label: "Procedure", amount: 5500 }, { label: "Stay", amount: 800 }],
                        [{ label: "Procedure", amount: 5500 }, { label: "Stay", amount: 1400 }, { label: "ICU night", amount: 900 }]);
check("billing: total delta arithmetic correct", diff.totalDelta === 1500);
const ev = await explainVariance(diff);
check("billing: explanation non-empty", ev.text.length > 10);
check("billing: safety verdict present", !!ev.safety?.verdict);

console.log(`\n  ${pass} passed, ${fail} failed.\n`);
process.exit(fail ? 1 : 0);
