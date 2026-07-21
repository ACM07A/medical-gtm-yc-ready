// INTERPRETER SCHEDULING AGENT — matches a consult time to an interpreter, deterministically.
//
// No real interpreter vendor is wired — that's an env-key-away plugin like everything in lib/plugins.mjs,
// not built here. What IS built is the scheduling logic against a roster, so the moment a real vendor API
// exists this agent's shape doesn't change, only ROSTER's source does (a fetch instead of a literal). The
// roster below is explicitly marked mock so nobody mistakes a demo run for a real booking.
import { checkMessage } from "../safety.mjs";

export const ROSTER_SOURCE = "mock — no interpreter vendor keyed yet (see lib/plugins.mjs pattern)";
const ROSTER = [
  { id: "int-ar-1", name: "Interpreter A", languages: ["ar"], hours: [9, 18] },
  { id: "int-ar-2", name: "Interpreter B", languages: ["ar"], hours: [14, 22] },
  { id: "int-sw-1", name: "Interpreter C", languages: ["sw", "en"], hours: [8, 17] },
  { id: "int-am-1", name: "Interpreter D", languages: ["am"], hours: [9, 17] },
  { id: "int-my-1", name: "Interpreter E", languages: ["my"], hours: [10, 19] },
];

export function scheduleInterpreter({ consultTime, language, durationMin = 45 }) {
  if (!consultTime || !language) return { error: "consultTime and language are required" };
  const t = new Date(consultTime);
  if (isNaN(t.getTime())) return { error: "consultTime must be a parseable date/time" };
  const hour = t.getHours();

  const candidates = ROSTER.filter((i) => i.languages.includes(language) && hour >= i.hours[0] && hour < i.hours[1]);
  if (!candidates.length) {
    const anyLang = ROSTER.filter((i) => i.languages.includes(language));
    return {
      matched: false,
      reason: anyLang.length ? `no ${language} interpreter is on the (mock) roster during that hour — earliest coverage: ${anyLang[0].hours[0]}:00–${anyLang[0].hours[1]}:00`
                              : `no ${language} interpreter on the (mock) roster at all — this language needs sourcing before it can be scheduled`,
      rosterSource: ROSTER_SOURCE,
    };
  }
  const pick = candidates[0];
  const confirmText = `Interpreter confirmed for your ${t.toLocaleString()} consult (${durationMin} min, ${language}). They'll join by phone shortly before the consult starts.`;
  const safe = checkMessage(confirmText, { outbound: true });
  return { matched: true, interpreterId: pick.id, consultTime: t.toISOString(), language, durationMin,
    confirmText, safety: { verdict: safe.verdict, findings: safe.findings }, rosterSource: ROSTER_SOURCE };
}
