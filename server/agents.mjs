// /agents — the concierge agents, live and clickable. Where /sandbox shows the SALES journey (WhatsApp
// state machine, human-edited templates), this shows the CONCIERGE journey: turning "a patient booked"
// into "a patient actually gets treated, their documents clear, their family isn't left wondering, and
// their bill is explained." Every run is REAL — it calls the actual failover chain (or the deterministic
// fallback if no key is set) and the actual safety gate, not a canned transcript.
import { triage } from "../lib/agents/triage.mjs";
import { familyUpdate } from "../lib/agents/family_update.mjs";
import { addFamilyContact, recordOptIn, queueFamilyUpdate } from "../lib/agents/family_channel.mjs";
import { documentChecklist } from "../lib/agents/document_checklist.mjs";
import { initChecklist, submitDocument, kycStatus } from "../lib/agents/document_kyc.mjs";
import { reconcile, explainVariance, reconcileLead } from "../lib/agents/billing_reconciliation.mjs";
import { relayDischarge } from "../lib/agents/discharge_relay.mjs";
import { planPickup } from "../lib/agents/ground_logistics.mjs";
import { scheduleInterpreter } from "../lib/agents/interpreter_scheduling.mjs";
import { returnReadiness } from "../lib/agents/travel_readiness.mjs";
import { routePayment } from "../lib/agents/payment_routing.mjs";
import { startVisa, visaStatus } from "../lib/visa.mjs";
import { stayPlan, searchStays, bookStay } from "../lib/stay.mjs";
import { searchFlights, requestFlight } from "../lib/flights.mjs";
import { scheduleVideoConsult, recordConsultOutcome } from "../lib/agents/video_consult.mjs";
import { logRun } from "../data-core/db.mjs";

export const CSS = `
:root{--bg:#eef3f9;--panel:#fff;--ink:#0c1b2e;--muted:#5a6b80;--line:#e2ecf7;--brand:#0b4a8b;--brand2:#1f6fd6;--green:#1c8b50;--amber:#e5a13a;--red:#b3261e;--shadow:0 18px 46px -28px rgba(11,74,139,.5)}
@media(prefers-color-scheme:dark){:root{--bg:#0e1621;--panel:#152232;--ink:#e7eefb;--muted:#8ba0ba;--line:#22364d;--brand:#5aa0ee;--brand2:#7cb6f5;--red:#f0837a;--shadow:0 18px 46px -22px rgba(0,0,0,.6)}}
:root[data-theme=dark]{--bg:#0e1621;--panel:#152232;--ink:#e7eefb;--muted:#8ba0ba;--line:#22364d;--brand:#5aa0ee;--brand2:#7cb6f5;--red:#f0837a}
:root[data-theme=light]{--bg:#eef3f9;--panel:#fff;--ink:#0c1b2e;--muted:#5a6b80;--line:#e2ecf7;--brand:#0b4a8b;--brand2:#1f6fd6;--red:#b3261e}
*{box-sizing:border-box}body{margin:0;font-family:"Segoe UI",Roboto,system-ui,-apple-system,sans-serif;color:var(--ink);background:var(--bg);line-height:1.55}
.ribbon{background:var(--amber);color:#3a2600;font-weight:700;font-size:12.5px;text-align:center;padding:7px 12px}
.ribbon a{color:#3a2600}
.wrap{max-width:1000px;margin:0 auto;padding:30px 20px 70px}
.eyebrow{font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:var(--brand2);font-weight:700}
h1{font-size:28px;margin:6px 0 8px;letter-spacing:-.02em}
.lede{font-size:15px;color:var(--muted);max-width:680px}
.section-h{margin:30px 0 4px;font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);font-weight:800;border-top:1px solid var(--line);padding-top:22px}
.agent{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:20px 22px;margin-top:14px;box-shadow:var(--shadow)}
.agent h2{margin:0 0 4px;font-size:17px}
.agent .desc{font-size:13px;color:var(--muted);margin-bottom:14px}
.row{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px}
.row label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--muted);flex:1;min-width:150px}
.row input,.row textarea,.row select{font:inherit;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--ink)}
.row textarea{min-height:56px;resize:vertical;width:100%}
button.run{background:var(--brand);color:#fff;border:none;border-radius:999px;padding:9px 20px;font-weight:700;font-size:13px;cursor:pointer}
button.run.sec{background:transparent;color:var(--brand);border:1px solid var(--brand2)}
button.run:hover{background:var(--brand2)}
button.run:disabled{opacity:.6;cursor:wait}
.out{margin-top:14px;background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:12px 14px;font-size:13.5px;display:none}
.out.show{display:block}
.badge{display:inline-block;font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;padding:2px 9px;border-radius:999px;margin-bottom:8px;margin-right:6px}
.badge.pass{background:rgba(28,139,80,.15);color:var(--green)}
.badge.review{background:rgba(229,161,58,.2);color:#8a5c00}
.badge.escalate,.badge.block{background:rgba(179,38,30,.15);color:var(--red)}
.method{font-size:11px;color:var(--muted);float:right}
pre{white-space:pre-wrap;word-break:break-word;margin:0;font-family:ui-monospace,Consolas,monospace;font-size:12.5px}
details summary{cursor:pointer;font-size:12px;color:var(--muted);margin-top:8px}
table.chk,table.cf{width:100%;border-collapse:collapse;font-size:13px}
table.chk td,table.cf td{padding:4px 6px;border-bottom:1px solid var(--line);vertical-align:top}
table.chk td:first-child{width:22px}
table.cf td:first-child{width:120px;color:var(--muted);font-size:11.5px;text-transform:uppercase;letter-spacing:.03em}
.pill{display:inline-block;font-size:10.5px;font-weight:700;padding:1px 7px;border-radius:999px;text-transform:uppercase}
.pill.verified{background:rgba(28,139,80,.15);color:var(--green)}
.pill.missing{background:rgba(90,107,128,.15);color:var(--muted)}
.pill.rejected,.pill.needs_human_review{background:rgba(229,161,58,.2);color:#8a5c00}
`;

export const AGENT_META = [
  { id: "triage", title: "Triage agent", grp: "Intake", desc: "The patient's own words → the structured case file a hospital reviews in three minutes (the unit we actually sell — BUSINESS_STATUS.md §3). Extracts only what was said; never infers a diagnosis." },
  { id: "family-update", title: "Family update — the routing layer", grp: "During treatment", desc: "The family member waiting at home is a DIFFERENT WhatsApp number that has never messaged us — so this needs its own consent and its own template-first-touch, exactly like the patient's own first touch. Add a contact (no consent) then run it, then opt them in and run it again — the routing itself is the demo." },
  { id: "document-kyc", title: "Document checklist — as a KYC workflow", grp: "Before travel", desc: "Not a static list: state persists per lead. One deterministic rule (passport expiry) runs automatically; everything else lands in needs_human_review and STAYS there until a person clears it — the agent never pretends to verify what it can't." },
  { id: "billing-reconciliation", title: "Billing reconciliation — DB-backed", grp: "After treatment", desc: "Reads a real quote and a real actual bill from the ledger (estimate_line), not typed text — the math is always plain arithmetic, and a variance past the threshold is written back as a pending review, not just displayed." },
  { id: "discharge-relay", title: "Discharge & medication relay", grp: "After treatment", desc: "The highest-stakes text in this journey. Relays the hospital's OWN discharge instructions — restructured, translated — and adds nothing. If no hospital text is given, it produces nothing. Always requires human sign-off, regardless of the automated scan." },
  { id: "ground-logistics", title: "Ground logistics", grp: "Arrival", desc: "Airport pickup timing and vehicle sizing from a flight number and arrival time — real buffer math for immigration and baggage, not a guess." },
  { id: "interpreter-scheduling", title: "Interpreter scheduling", grp: "During treatment", desc: "Matches a consult time to language coverage on the roster. No real vendor is wired yet — clearly labelled mock, same pattern as /plugins." },
  { id: "travel-readiness", title: "Return-travel readiness", grp: "After treatment", desc: "Tracks WHEN to raise return travel. Never itself clears a patient to fly — that's the hospital's call, always (mirrors the FITNESS_CALL guardrail in lib/safety.mjs)." },
  { id: "payment-routing", title: "Payment routing", grp: "Before travel", desc: "Self-pay, insured (GOP/pre-auth), or government-sponsored — each is a genuinely different document set and timeline. Encodes the real constraints found in this session's research (Kenya SHA's $3,900 cap and 3-hospital list)." },
  { id: "video-consult", title: "Patient–doctor video consult", grp: "Before travel", desc: "The step between 'quote finalized' and 'book travel': the patient meets their treating surgeon by video before anyone buys a ticket. GATED on a finalized quote (no quote, no consult). Deterministic timezone-overlap math between the surgeon's IST hours and the patient's waking hours; interpreter attached for non-English consults. CanopusCare schedules the call and is NOT a party to it — no joining, no recording, no storing of the clinical conversation; we keep scheduling metadata and a non-clinical outcome (proceed / revise quote / not suitable) only." },
  { id: "visa-documents", title: "Visa & travel documents", grp: "Before travel", desc: "Deliberately narrow: CanopusCare orchestrates the hospital's Medical Invitation Letter (mandatory since 1 Apr 2025) and hands over a country-correct checklist — the patient applies and books their own tickets, we don't touch the government portal or claim to. Idempotent per lead; re-running doesn't duplicate the visa/attendant-visa rows." },
  { id: "accommodation", title: "Accommodation", grp: "Before travel", desc: "Pre-op (1-2 nights, walkable to hospital) and post-op (a longer, category-sized recovery window — 12 nights for cardiac, 4 for fertility) are genuinely different stays. Curated near-hospital sample until a real inventory provider (Booking.com/Hotelbeds/RateHawk) is keyed; any 'request' is a dry-run — nothing books for real without a provider key and an explicit human confirm." },
  { id: "ticketing", title: "Ticketing — flexible-date flight search", grp: "Before travel", desc: "Arrival has a real constraint (the pre-op buffer before admission, reused from the accommodation agent's own stayPlan() so the two never disagree); departure doesn't. Sweeps a window around the patient's preferred date and ranks it cheapest-first. Curated fare estimate until a real provider (Amadeus/Duffel/Kiwi) is keyed; requesting a date is a human-gated dry-run, same posture as accommodation." },
];

function cardBody(id) {
  return ({
    triage: `<div class="row"><label style="flex:2">Patient message (their own words)
        <textarea data-f="text">I need a knee replacement, I'm 58, from Oman, no reports yet, my local doctor said it's not urgent</textarea></label></div>`,
    "family-update": `<div class="row">
        <label>Lead ID<input data-f="leadId" value="41"></label>
        <label>Contact name<input data-f="name" value="Amina"></label>
        <label>Phone<input data-f="phone" value="+968XXXXXXXX"></label>
        <label>Relationship<input data-f="relationship" value="spouse"></label>
      </div>
      <div class="row">
        <label>Journey stage<select data-f="stage">
          <option value="travel">travel</option><option value="pre_op">pre_op</option>
          <option value="in_treatment">in_treatment</option><option value="post_op" selected>post_op</option>
        </select></label>
        <label style="flex:2">Note (status only)<input data-f="note" value="first walk around the ward today"></label>
      </div>
      <div class="row" style="gap:8px">
        <button class="run sec" onclick="runAgent('family-update-add', this, 'family-update')">1. Add contact (no consent yet)</button>
        <button class="run sec" onclick="runAgent('family-update-optin', this, 'family-update')">2. Record opt-in</button>
        <button class="run" onclick="runAgent('family-update-send', this, 'family-update')">3. Queue today's update</button>
      </div>`,
    "document-kyc": `<div class="row">
        <label>Lead ID<input data-f="leadId" value="40"></label>
        <label>Country<select data-f="countryCode"><option value="OM" selected>Oman</option><option value="KE">Kenya</option><option value="NG">Nigeria</option></select></label>
        <label>Attendants<input data-f="attendants" type="number" value="1"></label>
      </div>
      <div class="row" style="gap:8px">
        <button class="run sec" onclick="runAgent('kyc-init', this, 'document-kyc')">1. Init / view status</button>
      </div>
      <div class="row">
        <label>Submit which item — <span style="color:var(--red)">run step 1 first, this fills in from the real item list</span>
          <select data-f="key"><option value="">— run step 1 —</option></select></label>
        <label style="flex:2">Value (a date, for the passport item)<input data-f="value" value="2028-01-01"></label>
      </div>
      <button class="run" onclick="runAgent('kyc-submit', this, 'document-kyc')">2. Submit that document</button>`,
    "billing-reconciliation": `<div class="row"><label>Lead ID (pre-seeded with a real quote + actual)<input data-f="leadId" value="42"></label></div>
      <button class="run" onclick="runAgent('billing-lead', this, 'billing-reconciliation')">Reconcile from the real ledger</button>
      <details><summary>Or type ad-hoc lines (standalone demo mode, no DB)</summary>
        <div class="row" style="margin-top:8px">
          <label style="flex:2">Quoted — label:amount, comma-separated<input data-f="quoted" value="Procedure:5500,Hospital stay:800,Coordination:300"></label></div>
        <div class="row"><label style="flex:2">Actual<input data-f="actual" value="Procedure:5500,Hospital stay:1400,Coordination:300,ICU night:900"></label></div>
        <button class="run sec" onclick="runAgent('billing-adhoc', this, 'billing-reconciliation')">Reconcile typed lines</button>
      </details>`,
    "discharge-relay": `<div class="row"><label style="flex:2">Hospital's discharge text, verbatim (paste as given — try leaving this empty to see the refusal)
        <textarea data-f="hospitalText">Continue amoxicillin 500mg three times daily for 5 days. Keep the incision dry for 48 hours. Return to clinic in 10 days for suture removal. Contact us immediately if fever exceeds 38.5C.</textarea></label></div>`,
    "ground-logistics": `<div class="row">
        <label>Flight no.<input data-f="flightNo" value="EK568"></label>
        <label>Arrival (local)<input data-f="arrivalTime" value="2026-08-04T14:30"></label>
        <label>Attendants<input data-f="attendants" type="number" value="1"></label>
        <label>Mobility<select data-f="patientMobility"><option value="walking" selected>walking</option><option value="wheelchair">wheelchair</option></select></label>
      </div>`,
    "interpreter-scheduling": `<div class="row">
        <label>Consult time<input data-f="consultTime" value="2026-08-05T11:00"></label>
        <label>Language<select data-f="language"><option value="ar" selected>Arabic</option><option value="sw">Swahili</option><option value="am">Amharic</option><option value="fr">French (unstaffed — try this)</option></select></label>
      </div>`,
    "travel-readiness": `<div class="row">
        <label>Category<select data-f="category"><option value="cardiac" selected>cardiac</option><option value="ortho">ortho</option><option value="dental">dental</option></select></label>
        <label>Discharge date<input data-f="dischargeDate" value="2026-07-25"></label>
        <label>Planned return<input data-f="plannedReturnDate" value=""></label>
      </div>`,
    "payment-routing": `<div class="row">
        <label>Method<select data-f="method"><option value="insured" selected>insured</option><option value="self_pay">self_pay</option><option value="sponsored">sponsored</option></select></label>
        <label>Country<select data-f="countryCode"><option value="KE" selected>Kenya</option><option value="OM">Oman</option></select></label>
        <label>Package estimate ($)<input data-f="packageEstimateLow" type="number" value="3200"></label>
        <label>Insurer<input data-f="insurer" value="Jubilee"></label>
      </div>`,
    "video-consult": `<div class="row">
        <label>Lead ID (needs a finalized quote on file — a lead without one shows the gate)<input data-f="leadId" value="42"></label>
        <label>Preferred slot (IST)<input data-f="preferredDateTimeIST" value="2026-08-10T11:00"></label>
        <label>Language<select data-f="language"><option value="en" selected>English</option><option value="ar">Arabic</option><option value="sw">Swahili</option><option value="am">Amharic</option><option value="ru">Russian</option></select></label>
      </div>
      <button class="run sec" onclick="runAgent('video-consult-schedule', this, 'video-consult')">1. Schedule the consult (dry-run)</button>
      <div class="row" style="margin-top:10px">
        <label>Outcome after the call (non-clinical only)<select data-f="outcome">
          <option value="proceed" selected>proceed — book travel</option><option value="revise_quote">revise quote</option>
          <option value="follow_up">follow-up needed</option><option value="not_suitable">not suitable</option></select></label>
        <label style="flex:2">Note (try typing something clinical to see the refusal)<input data-f="note" value="patient comfortable, wants to proceed"></label>
      </div>
      <button class="run" onclick="runAgent('video-consult-outcome', this, 'video-consult')">2. Record the outcome</button>`,
    "visa-documents": `<div class="row">
        <label>Lead ID<input data-f="leadId" value="40"></label>
        <label>Country<select data-f="countryCode"><option value="OM" selected>Oman</option><option value="KE">Kenya</option><option value="PK">Pakistan (1 attendant only)</option><option value="BD">Bangladesh</option><option value="NG">Nigeria</option></select></label>
        <label>Attendants<input data-f="attendants" type="number" value="1"></label>
      </div>
      <button class="run" onclick="runAgent('visa-start', this, 'visa-documents')">Start / view visa workflow</button>`,
    "accommodation": `<div class="row">
        <label>Lead ID<input data-f="leadId" value="42"></label>
        <label>Category<select data-f="categoryId"><option value="cardiac" selected>cardiac</option><option value="ortho">ortho</option><option value="oncology">oncology</option><option value="fertility">fertility</option><option value="dental">dental</option></select></label>
        <label>Admission date<input data-f="admissionDate" value="2026-08-15"></label>
        <label>Attendants<input data-f="attendants" type="number" value="1"></label>
      </div>
      <button class="run sec" onclick="runAgent('stay-plan', this, 'accommodation')">1. Compute stay windows</button>
      <div class="row" style="margin-top:10px">
        <label>City (hospital cluster)<select data-f="city"><option value="Bengaluru" selected>Bengaluru</option><option value="Chennai">Chennai</option><option value="Delhi NCR">Delhi NCR</option><option value="Mumbai">Mumbai</option><option value="Hyderabad">Hyderabad</option><option value="Gurugram">Gurugram</option></select></label>
        <label>Check-in<input data-f="checkIn" value="2026-08-13"></label>
        <label>Check-out<input data-f="checkOut" value="2026-08-27"></label>
        <label>Guests<input data-f="guests" type="number" value="2"></label>
      </div>
      <button class="run sec" onclick="runAgent('stay-search', this, 'accommodation')">2. Search near-hospital options</button>
      <div class="row">
        <label style="flex:2">Request which option — <span style="color:var(--red)">run step 2 first, this fills in from the real search results</span>
          <select data-f="optionName"><option value="">— run step 2 —</option></select></label>
      </div>
      <button class="run" onclick="runAgent('stay-request', this, 'accommodation')">3. Request this stay (dry-run)</button>`,
    "ticketing": `<div class="row">
        <label>Lead ID<input data-f="leadId" value="42"></label>
        <label>Category<select data-f="categoryId"><option value="cardiac" selected>cardiac</option><option value="ortho">ortho</option><option value="oncology">oncology</option><option value="fertility">fertility</option><option value="dental">dental</option></select></label>
        <label>Admission date<input data-f="admissionDate" value="2026-08-15"></label>
      </div>
      <div class="row">
        <label>Preferred departure<input data-f="targetDepartureDate" value="2026-08-12"></label>
        <label>Flex (± days)<input data-f="flexDays" type="number" value="4"></label>
        <label>Origin region<select data-f="region"><option value="middle_east" selected>Middle East</option><option value="central_asia">Central Asia</option><option value="africa">Africa</option><option value="se_asia">South-East Asia</option><option value="europe">Europe</option></select></label>
        <label>Hospital city<select data-f="city"><option value="Bengaluru" selected>Bengaluru</option><option value="Chennai">Chennai</option><option value="Delhi NCR">Delhi NCR</option><option value="Mumbai">Mumbai</option><option value="Hyderabad">Hyderabad</option><option value="Gurugram">Gurugram</option></select></label>
      </div>
      <button class="run sec" onclick="runAgent('flight-search', this, 'ticketing')">1. Search the flexible-date window</button>
      <div class="row">
        <label style="flex:2">Request which date — <span style="color:var(--red)">run step 1 first, this fills in from the real search results</span>
          <select data-f="departureDate"><option value="">— run step 1 —</option></select></label>
      </div>
      <button class="run" onclick="runAgent('flight-request', this, 'ticketing')">2. Request this date (dry-run)</button>`,
  })[id] || "";
}

function agentCard(a) {
  const runButton = ["family-update", "document-kyc", "billing-reconciliation", "visa-documents", "accommodation", "ticketing", "video-consult"].includes(a.id) ? "" :
    `<button class="run" onclick="runAgent('${a.id}', this)">Run — real output, not a transcript</button>`;
  return `<div class="agent" data-agent="${a.id}">
    <h2>${a.title}</h2><div class="desc">${a.desc}</div>
    ${cardBody(a.id)}
    ${runButton}
    <div class="out"></div>
  </div>`;
}

export function renderAgentsDemo() {
  const groups = [...new Set(AGENT_META.map((a) => a.grp))];
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CanopusCare — Concierge Agents</title><style>${CSS}</style></head><body>
<div class="ribbon">MEDYATRA · concierge agents — every run below is LIVE (real model call or its safety-checked deterministic fallback) — <a href="/demo">back to demo hub</a></div>
<div class="wrap">
  <div class="eyebrow">Post-booking journey · build-os/09</div>
  <h1>The agents that get a booked patient actually treated</h1>
  <p class="lede">Thirteen agents covering intake through aftercare, wired to the real failover chain and the real
  safety gate (<code>lib/safety.mjs</code>). Several are deliberately deterministic — never LLM-generated — because
  a wrong answer there (a visa document rule, a medication dose, a sum of money) is worse than no answer.</p>
  ${groups.map((g) => `<div class="section-h">${g}</div>${AGENT_META.filter((a) => a.grp === g).map(agentCard).join("")}`).join("")}
</div>
<script>
async function runAgent(action, btn, cardId) {
  const card = btn.closest('.agent') || document.querySelector('[data-agent="' + cardId + '"]');
  const out = card.querySelector('.out');
  const fields = {};
  card.querySelectorAll('[data-f]').forEach(el => fields[el.dataset.f] = el.value);
  const origLabel = btn.textContent;
  btn.disabled = true; btn.textContent = 'Running…';
  out.className = 'out show'; out.innerHTML = '<span style="color:var(--muted)">calling the agent…</span>';
  try {
    const r = await fetch('/api/agents/' + action, { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify(fields) });
    const data = await r.json();
    out.innerHTML = renderResult(action, data);
  } catch (e) { out.innerHTML = '<span style="color:var(--red)">Request failed: ' + String(e) + '</span>'; }
  btn.disabled = false; btn.textContent = origLabel;
}
${RESULT_JS}
</script>
</body></html>`;
}

// RESULT_JS — the per-action-type rendering logic, shared verbatim between /agents (click-driven, one card
// at a time) and /journey (the full orchestration timeline, server/orchestrate.mjs). Extracted once so a new
// agent's render branch only has to be written here, not duplicated across two pages.
export const RESULT_JS = `
function badge(v) { return v ? '<span class="badge ' + v + '">' + v + '</span>' : ''; }
function esc(s) { return String(s==null?'':s).replace(/</g,'&lt;'); }
function renderResult(action, data) {
  if (data.error) return '<span style="color:var(--red)">' + esc(data.error) + '</span>';
  const v = data.safety ? data.safety.verdict : null;
  const method = data.method ? '<span class="method">' + data.method + '</span>' : '';

  if (action === 'triage') {
    const facts = (data.key_facts||[]).map(f=>'<li>'+esc(f)+'</li>').join('');
    const missing = (data.missing||[]).map(f=>'<li>'+esc(f)+'</li>').join('');
    // Emergency path carries a calm, human reply for the frightened person — show it first, prominently.
    const pm = data.patient_message ? '<div style="background:rgba(179,38,30,.1);border:1px solid var(--red);border-radius:10px;padding:11px 13px;margin-bottom:10px"><div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--red);margin-bottom:4px">Reply sent to the patient</div>' + esc(data.patient_message) + '</div>' : '';
    return badge(v) + method + pm +
      '<table class="cf"><tr><td>Category guess</td><td>' + esc(data.category_guess||'—') + '</td></tr>' +
      '<tr><td>Urgency</td><td>' + esc(data.urgency||'—') + (data.action?' — <b>'+esc(data.action)+'</b>':'') + '</td></tr>' +
      '<tr><td>Key facts</td><td><ul style="margin:0;padding-left:18px">' + (facts||'<li style=\"color:var(--muted)\">none extracted</li>') + '</ul></td></tr>' +
      '<tr><td>Missing</td><td><ul style="margin:0;padding-left:18px">' + (missing||'<li style=\"color:var(--muted)\">nothing flagged</li>') + '</ul></td></tr></table>' +
      '<details><summary>raw JSON (what actually gets stored / handed to the hospital)</summary><pre>' + esc(JSON.stringify(data,null,2)) + '</pre></details>';
  }
  if (action === 'kyc-init' || action === 'kyc-submit') {
    // The dropdown is populated from THIS response's real keys — never from a typed guess. Fixes a bug
    // caught in testing: a stale example key (untruncated) silently matched nothing in the DB and the
    // submit no-op'd without any visible error.
    const sel = document.querySelector('[data-agent="document-kyc"] select[data-f="key"]');
    if (sel && data.items) {
      sel.innerHTML = data.items.map(i => '<option value="' + esc(i.key) + '">' + esc(i.label.slice(0,50)) + (i.label.length>50?'…':'') + ' [' + i.status + ']</option>').join('');
    }
    const rows = (data.items||[]).map(i => '<tr><td>' + esc(i.label) + '</td><td><span class="pill ' + i.status + '">' + i.status.replace(/_/g,' ') + '</span></td><td style="font-size:11.5px;color:var(--muted)">' + esc(i.note||i.value||'') + '</td></tr>').join('');
    return '<b>' + (data.percent??0) + '% verified</b> · ' + (data.complete ? '<span class="badge pass">complete</span>' : '<span class="badge review">' + (data.blocking||[]).length + ' item(s) still blocking</span>') +
      '<table class="chk" style="margin-top:8px">' + rows + '</table>';
  }
  if (action.startsWith('family-update')) {
    if (data.queued) {
      return (data.queued||[]).map(q => badge(q.safety?q.safety.verdict:(q.via==='blocked'?'block':'review')) +
        '<b>' + esc(q.via) + '</b> → ' + (q.text ? esc(q.text) : esc(q.reason||'')) ).join('<hr style="border:none;border-top:1px solid var(--line);margin:10px 0">')
        || '<span style="color:var(--muted)">' + esc(data.reason||'no contacts') + '</span>';
    }
    return badge(v) + '<p>' + esc(data.name||'') + ' added, consent=0 — nothing can send until step 2.</p>';
  }
  if (action === 'billing-lead' || action === 'billing-adhoc') {
    const rows = data.diff.rows.map(r => '<tr><td>' + esc(r.label) + '</td><td>$' + r.quoted + '</td><td>$' + r.actual +
      '</td><td style="color:' + (r.delta>0?'var(--red)':r.delta<0?'var(--green)':'inherit') + '">' + (r.delta>=0?'+':'') + '$' + r.delta + '</td></tr>').join('');
    return badge(v) + method + (data.needsReview ? '<span class="badge review">exceeds ' + data.thresholdPct + '% threshold — routed to pending review</span>' : '') +
      '<table class="chk"><tr><td><b>Line</b></td><td><b>Quoted</b></td><td><b>Actual</b></td><td><b>Δ</b></td></tr>' + rows +
      '</table><p style="margin-top:10px">' + esc(data.text) + '</p>';
  }
  if (action === 'discharge-relay') {
    return '<span class="badge review">' + esc(data.safety.verdict) + '</span><div style="font-size:11.5px;color:var(--muted);margin-bottom:8px">' + esc(data.safety.note||'') + '</div>' +
      '<pre>' + esc(data.text) + '</pre>';
  }
  if (action === 'ground-logistics') {
    return badge(v) + method + '<p>' + esc(data.confirmText) + '</p><details><summary>full plan</summary><pre>' + esc(JSON.stringify(data.plan,null,2)) + '</pre></details>';
  }
  if (action === 'interpreter-scheduling') {
    if (!data.matched) return '<span class="badge review">no match</span><p>' + esc(data.reason) + '</p><div style="font-size:11px;color:var(--muted)">roster: ' + esc(data.rosterSource) + '</div>';
    return badge(v) + method + '<p>' + esc(data.confirmText) + '</p><div style="font-size:11px;color:var(--muted)">roster: ' + esc(data.rosterSource) + '</div>';
  }
  if (action === 'travel-readiness') {
    return badge(v) + '<p>' + esc(data.text) + '</p><div style="font-size:11px;color:var(--muted)">' + esc(data.note) + '</div>';
  }
  if (action === 'payment-routing') {
    return '<p><b>' + esc(data.path) + '</b></p><p>' + esc(data.nextStep) + '</p>' +
      (data.docsNeeded ? '<ul>' + data.docsNeeded.map(d=>'<li>'+esc(d)+'</li>').join('') + '</ul>' : '') +
      (data.warning ? '<p style="color:var(--red)">' + esc(data.warning) + '</p>' : '');
  }
  if (action === 'visa-start') {
    const svc = (data.services||[]).map(s => '<tr><td>' + esc(s.kind) + '</td><td><span class="pill ' +
      (s.status==='awaiting_hospital_letter'?'missing':'verified') + '">' + esc(String(s.status).replace(/_/g,' ')) + '</span></td>' +
      '<td style="font-size:11.5px;color:var(--muted)">' + esc(s.provider||'') + '</td></tr>').join('');
    return '<table class="cf"><tr><td>Country</td><td>' + esc(data.country) + '</td></tr>' +
      '<tr><td>Attendants</td><td>' + data.attendantsRequested + ' of ' + data.attendantsAllowed + ' allowed</td></tr>' +
      '<tr><td>Provider</td><td>' + esc(data.provider) + '</td></tr>' +
      '<tr><td>Blocked on</td><td>' + esc(data.blocked_on) + '</td></tr></table>' +
      '<table class="chk" style="margin-top:8px">' + svc + '</table>' +
      '<details><summary>visa facts (portal, timing, FRRO)</summary><pre>' + esc(JSON.stringify(data.facts,null,2)) + '</pre></details>';
  }
  if (action === 'stay-plan') {
    return '<table class="cf"><tr><td>Guests</td><td>' + data.guests + '</td></tr>' +
      '<tr><td>Pre-op</td><td>' + data.preop.nights + ' nights, ' + esc(data.preop.when) + ' — ' + esc(data.preop.need) + '</td></tr>' +
      '<tr><td>Post-op</td><td>' + data.postop.nights + ' nights, ' + esc(data.postop.when) + ' — ' + esc(data.postop.need) + '</td></tr></table>';
  }
  if (action === 'stay-search') {
    const sel = document.querySelector('[data-agent="accommodation"] select[data-f="optionName"]');
    if (sel && data.options) sel.innerHTML = data.options.map(o => '<option value="' + esc(o.name) + '">' +
      esc(o.name) + ' — $' + o.nightlyUSD[0] + '-' + o.nightlyUSD[1] + '/night</option>').join('');
    const rows = (data.options||[]).map(o => '<tr><td>' + esc(o.name) + '</td><td>' + esc(o.type) + '</td><td>' +
      o.distanceKm + 'km</td><td>$' + o.nightlyUSD[0] + '-' + o.nightlyUSD[1] + '</td></tr>').join('');
    return (data.live ? '' : '<div style="font-size:11px;color:var(--muted);margin-bottom:6px">' + esc(data.note) + '</div>') +
      '<table class="chk"><tr><td><b>Name</b></td><td><b>Type</b></td><td><b>Dist.</b></td><td><b>$/night</b></td></tr>' + rows + '</table>';
  }
  if (action === 'stay-request') {
    return badge(data.status==='booked'?'pass':'review') + '<p>' + esc(data.note) + '</p>' +
      '<div style="font-size:11px;color:var(--muted)">service #' + data.serviceId + ' · provider: ' + esc(data.provider) + '</div>';
  }
  if (action === 'flight-search') {
    if (data.feasible === false) return '<span class="badge review">infeasible</span><p>' + esc((data.window && data.window.note) || 'No date in this window satisfies the pre-op arrival deadline.') + '</p>';
    const sel = document.querySelector('[data-agent="ticketing"] select[data-f="departureDate"]');
    if (sel && data.options) sel.innerHTML = data.options.map(o => '<option value="' + esc(o.departureDate) + '">' +
      esc(o.departureDate) + (o.weekend ? ' (weekend)' : ' (weekday)') + ' — est. $' + o.estUSD + '</option>').join('');
    const rows = (data.options||[]).map(o => '<tr><td>' + esc(o.departureDate) + '</td><td>' + (o.weekend?'weekend':'weekday') +
      '</td><td>$' + o.estUSD + '</td></tr>').join('');
    return (data.live ? '' : '<div style="font-size:11px;color:var(--muted);margin-bottom:6px">' + esc(data.note) + '</div>') +
      '<p style="font-size:12px;color:var(--muted)">Must arrive by <b>' + esc(data.window.latestArrivalRequired) + '</b> (' +
      data.window.preopBufferNights + '-night pre-op buffer) · hub ' + esc(data.hub) + '</p>' +
      '<table class="chk"><tr><td><b>Depart</b></td><td><b>Day</b></td><td><b>Est. fare</b></td></tr>' + rows + '</table>' +
      (data.cheapest ? '<p style="margin-top:8px"><b>Cheapest: ' + esc(data.cheapest.departureDate) + ' — $' + data.cheapest.estUSD + '</b></p>' : '');
  }
  if (action === 'flight-request') {
    return badge(data.status==='booked'?'pass':'review') + '<p>' + esc(data.note) + '</p>' +
      '<div style="font-size:11px;color:var(--muted)">service #' + data.serviceId + ' · provider: ' + esc(data.provider) + '</div>';
  }
  if (action === 'video-consult-schedule') {
    if (data.gated) return '<span class="badge review">gated</span><p>' + esc(data.reason) + '</p>';
    if (data.feasible === false) return '<span class="badge review">no workable window</span><p>' + esc(data.reason) + '</p>';
    return badge(v) + '<p>' + esc(data.confirmText) + '</p>' +
      (data.slotNote ? '<p style="color:var(--red);font-size:12px">' + esc(data.slotNote) + '</p>' : '') +
      (data.interpreter ? '<div style="font-size:12px;margin-top:6px">' + (data.interpreter.matched ? 'Interpreter attached: ' + esc(data.interpreter.interpreterId) : 'Interpreter: ' + esc(data.interpreter.reason)) + '</div>' : '') +
      '<div style="font-size:11px;color:var(--muted);margin-top:8px">' + esc(data.window.note) + ' · quote on file: $' + (data.quoteTotal||0).toLocaleString() +
      '<br>' + esc(data.dataScope) + '<br>platform: ' + esc(data.platformSource) + ' · ' + esc(data.humanGate) + '</div>';
  }
  if (action === 'video-consult-outcome') {
    if (data.refused) return '<span class="badge block">refused</span><p>' + esc(data.reason) + '</p>';
    return '<span class="badge pass">' + esc(data.outcome) + '</span><p><b>Next:</b> ' + esc(data.next) + '</p>';
  }
  return badge(v) + method + '<p>' + esc(data.text||'') + '</p>';
}
`;

// ── API handlers — thin, no framework. Each mirrors the exact function real code (CLI/comms_run) would
// call, so "clicked in the browser" and "run headlessly" are never two different code paths. ──────────
export async function runTriage(body) { return triage(body.text || "", {}); }

export function runFamilyUpdateAdd(db, body) {
  return addFamilyContact(db, Number(body.leadId), { name: body.name, phone: body.phone, relationship: body.relationship });
}
export function runFamilyUpdateOptin(db, body) {
  const c = db.prepare(`SELECT id FROM family_contact WHERE lead_id=? ORDER BY id DESC LIMIT 1`).get(Number(body.leadId));
  if (!c) return { error: "no contact on file for this lead yet — run step 1 first" };
  return recordOptIn(db, c.id, true);
}
export function runFamilyUpdateSend(db, body) {
  return queueFamilyUpdate(db, Number(body.leadId), { stage: body.stage, note: body.note });
}

export function runKycInit(db, body) {
  return initChecklist(db, Number(body.leadId), { countryCode: body.countryCode, attendants: Number(body.attendants) || 1 });
}
export function runKycSubmit(db, body) {
  // Propagate a bad key rather than silently returning the unchanged status — a submission that no-ops
  // without saying so is exactly the "check that doesn't check" failure this session already hit twice
  // (the safety-verdict bug, the E-E-A-T scoring bug). The UI never lets a person TYPE a key (see the
  // dropdown below) specifically so this path shouldn't be reachable outside a direct API call, but the
  // API itself must still refuse to pretend a bad key worked.
  const r = submitDocument(db, Number(body.leadId), body.key, body.value);
  if (r.error) return r;
  return kycStatus(db, Number(body.leadId));
}

export function runBillingLead(db, body) { return reconcileLead(db, Number(body.leadId), { logRun }); }
export async function runBillingAdhoc(body) {
  const parseLines = (s) => String(s || "").split(",").map((p) => p.trim()).filter(Boolean).map((p) => {
    const [label, amount] = p.split(":"); return { label: (label || "").trim(), amount: Number(amount) || 0 };
  });
  return explainVariance(reconcile(parseLines(body.quoted), parseLines(body.actual)));
}

export function runDocumentChecklist(body) {
  return documentChecklist({ countryCode: body.countryCode, attendants: Number(body.attendants) || 1, category: body.category });
}
export async function runDischargeRelay(body) { return relayDischarge(body.hospitalText, { language: body.language || "en" }); }
export function runGroundLogistics(body) {
  return planPickup({ flightNo: body.flightNo, arrivalTime: body.arrivalTime, attendants: Number(body.attendants) || 1, patientMobility: body.patientMobility });
}
export function runInterpreterScheduling(body) { return scheduleInterpreter({ consultTime: body.consultTime, language: body.language }); }
export function runTravelReadiness(body) {
  return returnReadiness({ category: body.category, dischargeDate: body.dischargeDate, plannedReturnDate: body.plannedReturnDate || null });
}
export function runPaymentRouting(body) {
  return routePayment({ method: body.method, countryCode: body.countryCode, packageEstimateLow: body.packageEstimateLow ? Number(body.packageEstimateLow) : null, insurer: body.insurer, hasGOP: !!body.hasGOP });
}

export function runVisaStart(db, body) {
  const leadId = Number(body.leadId);
  if (!db.prepare(`SELECT id FROM lead WHERE id=?`).get(leadId)) return { error: `no lead ${leadId} on file — seed leads first (npm run seed-leads)` };
  const started = startVisa(db, { id: leadId, market_code: body.countryCode }, { attendants: Number(body.attendants) || 1 });
  return { ...started, services: visaStatus(db, leadId) };
}

export function runStayPlan(body) {
  return stayPlan({ categoryId: body.categoryId, admissionDate: body.admissionDate, attendants: Number(body.attendants) || 1 });
}
export async function runStaySearch(body) {
  return searchStays({ city: body.city, checkIn: body.checkIn, checkOut: body.checkOut, guests: Number(body.guests) || 2 });
}
export async function runStayRequest(db, body) {
  const leadId = Number(body.leadId);
  const lead = db.prepare(`SELECT id FROM lead WHERE id=?`).get(leadId);
  if (!lead) return { error: `no lead ${leadId} on file — seed leads first (npm run seed-leads)` };
  const search = await searchStays({ city: body.city, guests: Number(body.guests) || 2 });
  const option = (search.options || []).find((o) => o.name === body.optionName);
  if (!option) return { error: "run step 2 and pick a real option first — none matched" };
  return bookStay(db, lead, option, { kind: "stay_postop" });
}

export function runVideoConsultSchedule(db, body) {
  return scheduleVideoConsult(db, { leadId: body.leadId, preferredDateTimeIST: body.preferredDateTimeIST, language: body.language || "en", logRun });
}
export function runVideoConsultOutcome(db, body) {
  return recordConsultOutcome(db, { leadId: body.leadId, outcome: body.outcome, note: body.note || "", logRun });
}
export async function runFlightSearch(body) {
  return searchFlights({
    categoryId: body.categoryId, admissionDate: body.admissionDate, targetDepartureDate: body.targetDepartureDate,
    flexDays: Number(body.flexDays) || 4, region: body.region, city: body.city,
  });
}
export async function runFlightRequest(db, body) {
  const leadId = Number(body.leadId);
  const lead = db.prepare(`SELECT id FROM lead WHERE id=?`).get(leadId);
  if (!lead) return { error: `no lead ${leadId} on file — seed leads first (npm run seed-leads)` };
  const search = await searchFlights({
    categoryId: body.categoryId, admissionDate: body.admissionDate, targetDepartureDate: body.targetDepartureDate,
    flexDays: Number(body.flexDays) || 4, region: body.region, city: body.city,
  });
  const option = (search.options || []).find((o) => o.departureDate === body.departureDate);
  if (!option) return { error: "run step 1 and pick a real date from the results first — none matched" };
  return requestFlight(db, lead, option, {});
}
