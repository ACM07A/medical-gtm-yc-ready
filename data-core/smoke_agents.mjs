// AGENT SMOKE TEST — runs the concierge agents headlessly and checks they return usable output, with or
// without an LLM key. This exists specifically for "the demo must not break live in front of someone" — run
// it before any call, not during one. Deliberately DB-free (CI runs this BEFORE `npm run seed`): covers every
// PURE agent function directly. The DB-backed variants (document_kyc, billing_reconciliation's ledger path,
// family_channel, visa's startVisa, stay's bookStay) need a real lead row and are exercised live at /agents
// instead — adding a DB dependency here would break the "runs before any seed exists" property this test relies on.
//   node --experimental-sqlite data-core/smoke_agents.mjs
import { triage } from "../lib/agents/triage.mjs";
import { familyUpdate } from "../lib/agents/family_update.mjs";
import { documentChecklist } from "../lib/agents/document_checklist.mjs";
import { reconcile, explainVariance } from "../lib/agents/billing_reconciliation.mjs";
import { planPickup } from "../lib/agents/ground_logistics.mjs";
import { scheduleInterpreter } from "../lib/agents/interpreter_scheduling.mjs";
import { returnReadiness } from "../lib/agents/travel_readiness.mjs";
import { routePayment } from "../lib/agents/payment_routing.mjs";
import { visaChecklist, attendantsAllowed } from "../lib/visa.mjs";
import { stayPlan, searchStays } from "../lib/stay.mjs";
import { travelWindow, searchFlights } from "../lib/flights.mjs";
import { consultWindow } from "../lib/agents/video_consult.mjs";

let pass = 0, fail = 0;
function check(name, ok, detail = "") { console.log(`  ${ok ? "✓" : "✗"} ${name}${detail ? " — " + detail : ""}`); ok ? pass++ : fail++; }

console.log(`\n  AGENT SMOKE TEST — ${process.env.NVIDIA_API_KEY || process.env.GEMINI_API_KEY ? "LLM key present" : "no LLM key — deterministic fallback path"}\n`);

const t = await triage("I need a knee replacement, I'm 58, from Oman, no reports yet");
check("triage: returns key_facts", Array.isArray(t.key_facts) && t.key_facts.length > 0);
check("triage: safety verdict present", !!t.safety?.verdict);

const emergency = await triage("crushing chest pain, can't breathe");
check("triage: emergency escalates (not a quote)", emergency.urgency === "possible_emergency" && emergency.safety.verdict === "escalate");
check("triage: emergency carries a calm patient-facing reply (empathy, not just an internal flag)",
  typeof emergency.patient_message === "string" && emergency.patient_message.length > 40 && !/\b\d+\s?(mg|ml)\b|diagnos/i.test(emergency.patient_message));

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

const pickup = planPickup({ flightNo: "EK568", arrivalTime: "2026-08-04T14:30", attendants: 1, patientMobility: "walking" });
check("ground-logistics: returns a confirm text + a plan", !!pickup.confirmText && !!pickup.plan);

const interp = scheduleInterpreter({ consultTime: "2026-08-05T11:00", language: "ar" });
check("interpreter-scheduling: matches a staffed language", interp.matched === true);
const interpUnstaffed = scheduleInterpreter({ consultTime: "2026-08-05T11:00", language: "fr" });
check("interpreter-scheduling: refuses an unstaffed language rather than guessing", interpUnstaffed.matched === false);

const tr = returnReadiness({ category: "cardiac", dischargeDate: "2026-07-25", plannedReturnDate: null });
check("travel-readiness: never itself clears fitness to fly", !/cleared|fit to fly/i.test(tr.text || ""));

const pay = routePayment({ method: "sponsored", countryCode: "KE", packageEstimateLow: 3200 });
check("payment-routing: Kenya SHA cap routes as eligible under the cap", pay.path === "sponsored_sha_kenya" && pay.eligible === true);

const vc = visaChecklist("BD");
check("visa: country-specific attendant cap applied", attendantsAllowed("BD") === 3 && vc.documents.some((d) => /invitation letter/i.test(d)));

const sp = stayPlan({ categoryId: "cardiac", admissionDate: "2026-08-15", attendants: 1 });
check("stay: cardiac gets the longest post-op window", sp.postop.nights === 12);
const ss = await searchStays({ city: "Bengaluru", guests: 2 });
check("stay: curated fallback returns real options with no provider keyed", ss.provider === "curated" && ss.options.length > 0);

const tw = travelWindow({ categoryId: "cardiac", admissionDate: "2026-08-15", targetDepartureDate: "2026-08-12", flexDays: 4 });
check("ticketing: pre-op buffer pushes the latest arrival before admission", tw.feasible === true && tw.latestArrivalRequired < "2026-08-15");
const infeasible = travelWindow({ categoryId: "cardiac", admissionDate: "2026-08-15", targetDepartureDate: "2026-08-20", flexDays: 1 });
check("ticketing: a departure window entirely after admission is flagged infeasible, not silently clamped", infeasible.feasible === false && !!infeasible.note);
const fs = await searchFlights({ categoryId: "cardiac", admissionDate: "2026-08-15", targetDepartureDate: "2026-08-12", flexDays: 4, region: "africa", city: "Bengaluru" });
check("ticketing: curated fallback ranks candidate dates cheapest-first", fs.provider === "curated" && fs.options.length > 0 &&
  fs.options[0].estUSD === Math.min(...fs.options.map((o) => o.estUSD)));

// Video consult: the timezone-overlap arithmetic is the part that must never be wrong. Nigeria is UTC+1,
// 4.5h behind IST — a 10:00 IST surgeon slot is 05:30 in Lagos, so the workable window must start later.
const vwNG = consultWindow({ marketCode: "NG" });
check("video-consult: Nigeria window shifts so the patient is never called before 08:00 local",
  vwNG.feasible === true && vwNG.localWindow[0] >= "08:00" && vwNG.istWindow[0] > "10:00");
const vwOM = consultWindow({ marketCode: "OM" });
check("video-consult: Oman (UTC+4, 1.5h behind IST) keeps the full surgeon window",
  vwOM.feasible === true && vwOM.istWindow[0] === "10:00" && vwOM.istWindow[1] === "17:00");
const vwXX = consultWindow({ marketCode: "XX" });
check("video-consult: unknown market falls back honestly (assumed flag set, still feasible)",
  vwXX.feasible === true && vwXX.tzAssumed === true);

console.log(`\n  ${pass} passed, ${fail} failed.\n`);
process.exit(fail ? 1 : 0);
