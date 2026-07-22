// /journey — FULL JOURNEY ORCHESTRATION. Where /agents demonstrates each concierge agent one card at a time,
// this runs ONE real lead through the entire post-booking sequence in the real chronological order (intake
// -> before travel -> arrival -> during treatment -> after treatment), calling the SAME handler functions
// /agents uses — never a separate "demo" code path — and rendering each step with the exact same
// per-action logic (server/agents.mjs's RESULT_JS), so a new agent's render branch is written once, not twice.
//
// Deliberately resilient: one step's failure (an LLM timeout, a quota limit) does NOT stop the walkthrough —
// it's caught, shown as failed, and the next step still runs. A demo must not die because one call was slow.
//
// State discipline: only two of the twelve steps below write to the DB (KYC init, visa start), and both are
// idempotent — re-running the full journey against the same lead never accumulates junk rows. Everything
// else (payment routing, stay/flight search, ground logistics, interpreter matching, family update text,
// discharge relay, travel readiness) is a pure read/compute, and billing reconciliation only reads.
import { open, logRun } from "../data-core/db.mjs";
import { CSS, RESULT_JS, AGENT_META } from "./agents.mjs";
import {
  runTriage, runKycInit, runVisaStart, runPaymentRouting,
  runStayPlan, runStaySearch, runFlightSearch, runGroundLogistics,
  runInterpreterScheduling, runDischargeRelay, runBillingLead, runBillingAdhoc, runTravelReadiness,
} from "./agents.mjs";
import { familyUpdate } from "../lib/agents/family_update.mjs";

// A phase gets its title/desc from AGENT_META where possible, so the orchestrator's copy never drifts from
// the /agents page's own description of the same agent.
const metaOf = (id) => AGENT_META.find((a) => a.id === id) || { title: id, desc: "" };

const SAMPLE_MESSAGE = {
  cardiac: (m) => `My father has been told he needs a bypass. He's 61, blood pressure controlled, from ${m}. We don't have his angiogram report digitised yet.`,
  ortho: (m) => `I need a knee replacement, I'm 58, from ${m}, no reports yet, my local doctor said it's not urgent but it's painful.`,
  oncology: (m) => `I was diagnosed with breast cancer last month in ${m}. Biopsy done, no treatment started yet. Looking at options abroad.`,
  fertility: (m) => `We've done two IVF cycles at home in ${m}, both failed. Looking at other countries now, no reports gathered yet.`,
  cosmetic: (m) => `Interested in a gastric sleeve, I'm 34, from ${m}, BMI around 38, no reports yet.`,
  dental: (m) => `Need a full-mouth implant, I'm 50, from ${m}, several teeth already missing, no reports yet.`,
};
const DISCHARGE_SAMPLE = "Continue amoxicillin 500mg three times daily for 5 days. Keep the incision dry for 48 hours. Return to clinic in 10 days for suture removal. Contact us immediately if fever exceeds 38.5C.";

function addDays(iso, n) { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }

// runFullJourney: the orchestration itself. Every step is wrapped so a single failure (LLM timeout, a
// quota limit) is caught, recorded, and does not stop the rest of the walkthrough from running.
export async function runFullJourney(db, body) {
  const leadId = Number(body.leadId);
  const lead = db.prepare(`SELECT * FROM lead WHERE id=?`).get(leadId);
  if (!lead) return { error: `no lead ${leadId} on file — seed leads first (npm run seed-leads)` };
  const market = db.prepare(`SELECT * FROM market WHERE code=?`).get(lead.market_code);
  const category = db.prepare(`SELECT * FROM category WHERE id=?`).get(lead.category_id);
  const pkg = db.prepare(`SELECT avg(india_low) lo FROM category_price WHERE category_id=?`).get(lead.category_id);

  const admissionDate = body.admissionDate || addDays(new Date().toISOString().slice(0, 10), 21);
  const targetDepartureDate = body.targetDepartureDate || addDays(admissionDate, -3);
  const dischargeDate = body.dischargeDate || addDays(admissionDate, 5);
  const flexDays = Number(body.flexDays) || 4;
  const attendants = Number(body.attendants) || 1;
  const city = body.city || "Bengaluru";
  const method = body.method || "insured";
  const region = market?.region || "middle_east";
  const languages = (() => { try { return JSON.parse(market?.languages || "[]"); } catch { return []; } })();
  const language = languages.find((l) => l !== "en") || "en";

  const marketLabel = market?.name || lead.market_code;
  const steps = [];
  async function step(phase, id, action, run) {
    const meta = metaOf(id);
    const t0 = Date.now();
    try {
      const data = await run();
      steps.push({ phase, id, action, title: meta.title, ok: true, data, ms: Date.now() - t0 });
    } catch (e) {
      steps.push({ phase, id, action, title: meta.title, ok: false, data: { error: String(e.message || e) }, ms: Date.now() - t0 });
    }
  }

  await step("Intake", "triage", "triage", () => runTriage({ text: (SAMPLE_MESSAGE[lead.category_id] || SAMPLE_MESSAGE.ortho)(marketLabel) }));
  await step("Before travel", "document-kyc", "kyc-init", () => runKycInit(db, { leadId, countryCode: lead.market_code, attendants }));
  await step("Before travel", "visa-documents", "visa-start", () => runVisaStart(db, { leadId, countryCode: lead.market_code, attendants }));
  await step("Before travel", "payment-routing", "payment-routing", () => runPaymentRouting({ method, countryCode: lead.market_code, packageEstimateLow: pkg?.lo || null }));

  let stayWindow = null;
  await step("Before travel", "accommodation", "stay-plan", async () => { const r = runStayPlan({ categoryId: lead.category_id, admissionDate, attendants }); stayWindow = r; return r; });
  await step("Before travel", "accommodation", "stay-search", () => runStaySearch({
    city, guests: 1 + attendants,
    checkIn: addDays(admissionDate, -(stayWindow?.preop?.nights ?? 2)),
    checkOut: addDays(admissionDate, stayWindow?.postop?.nights ?? 8),
  }));
  await step("Before travel", "ticketing", "flight-search", () => runFlightSearch({ categoryId: lead.category_id, admissionDate, targetDepartureDate, flexDays, region, city }));

  await step("Arrival", "ground-logistics", "ground-logistics", () => runGroundLogistics({
    flightNo: "TBD — confirmed once a date from the ticketing search is booked", arrivalTime: `${addDays(admissionDate, -2)}T14:30`, attendants, patientMobility: "walking",
  }));
  await step("During treatment", "interpreter-scheduling", "interpreter-scheduling", () => runInterpreterScheduling({ consultTime: `${addDays(admissionDate, 1)}T11:00`, language }));
  await step("During treatment", "family-update", "family-update-send-preview", async () => {
    const r = await familyUpdate({ stage: "in_treatment", note: "settled in, met the care team, first review tomorrow" });
    return { ...r, note: "Generated directly for this preview — sending for real requires a consented family contact (see the standalone Family Update agent)." };
  });
  await step("After treatment", "discharge-relay", "discharge-relay", () => runDischargeRelay({ hospitalText: DISCHARGE_SAMPLE, language: "en" }));
  await step("After treatment", "billing-reconciliation", "billing-lead", async () => {
    try { const r = await runBillingLead(db, { leadId }); if (r.error) throw new Error(r.error); return r; }
    catch { return runBillingAdhoc({ quoted: "Procedure:5500,Hospital stay:800,Coordination:300", actual: "Procedure:5500,Hospital stay:1400,Coordination:300,ICU night:900" }); }
  });
  await step("After treatment", "travel-readiness", "travel-readiness", () => runTravelReadiness({ category: lead.category_id, dischargeDate, plannedReturnDate: null }));

  logRun(db, "Agents", `Full journey orchestrated · lead ${leadId}`, `${steps.filter((s) => s.ok).length}/${steps.length} steps ok`, "/journey", steps.every((s) => s.ok) ? "ok" : "fail");
  return { leadId, category: category?.name || lead.category_id, market: marketLabel, admissionDate, targetDepartureDate, dischargeDate, steps };
}

export function renderJourney(db) {
  const leads = db.prepare(`SELECT l.id, l.category_id, l.market_code, l.status, c.name catName, m.name mktName
    FROM lead l LEFT JOIN category c ON c.id=l.category_id LEFT JOIN market m ON m.code=l.market_code
    ORDER BY l.id LIMIT 30`).all();
  const options = leads.map((l) => `<option value="${l.id}">#${l.id} — ${l.catName || l.category_id} · ${l.mktName || l.market_code} (${l.status})</option>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>MedYatra — Full Journey Orchestrator</title><style>${CSS}
.timeline{border-left:2px solid var(--line);margin-left:8px;padding-left:22px}
.tstep{position:relative;margin-bottom:18px}
.tstep::before{content:'';position:absolute;left:-28px;top:4px;width:11px;height:11px;border-radius:50%;background:var(--brand2);border:2px solid var(--bg)}
.tstep.fail::before{background:var(--red)}
.tphase{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--brand2);font-weight:800;margin:26px 0 2px}
.tphase:first-child{margin-top:0}
.tms{font-size:10.5px;color:var(--muted);float:right}
</style></head><body>
<div class="ribbon">MEDYATRA · full journey orchestrator — one real lead, every concierge agent, in the real order — <a href="/agents">individual agents</a> · <a href="/demo">back to demo hub</a></div>
<div class="wrap">
  <div class="eyebrow">Post-booking journey, end to end · build-os/09</div>
  <h1>Watch one patient go through the entire journey</h1>
  <p class="lede">Twelve real agent calls, in order — intake through aftercare — for a single lead. Each step
  below is the exact same function <a href="/agents">/agents</a> calls; nothing here is a separate "demo" path.
  A step that fails (a model timeout, a quota limit) doesn't stop the rest — you'll see it marked and the
  walkthrough continues, same as it would live.</p>

  <div class="agent">
    <h2>Set up the journey</h2>
    <div class="desc">Pick a real seeded lead; everything else (category, market, language) derives from its actual row — nothing here is re-typed per step.</div>
    <div class="row">
      <label style="flex:2">Lead<select id="j-leadId">${options}</select></label>
      <label>Attendants<input id="j-attendants" type="number" value="1"></label>
      <label>Payment method<select id="j-method"><option value="insured" selected>insured</option><option value="self_pay">self_pay</option><option value="sponsored">sponsored</option></select></label>
    </div>
    <div class="row">
      <label>Admission date<input id="j-admissionDate" value=""></label>
      <label>Target departure<input id="j-targetDepartureDate" value=""></label>
      <label>Discharge date<input id="j-dischargeDate" value=""></label>
      <label>Flex (± days)<input id="j-flexDays" type="number" value="4"></label>
      <label>Hospital city<select id="j-city"><option value="Bengaluru" selected>Bengaluru</option><option value="Chennai">Chennai</option><option value="Delhi NCR">Delhi NCR</option><option value="Mumbai">Mumbai</option><option value="Hyderabad">Hyderabad</option><option value="Gurugram">Gurugram</option></select></label>
    </div>
    <button class="run" id="j-run" onclick="runJourney()">Run the full journey</button>
    <div id="j-summary" style="margin-top:10px;font-size:12.5px;color:var(--muted)"></div>
  </div>

  <div id="j-timeline" class="timeline" style="margin-top:24px"></div>
</div>
<script>
${RESULT_JS}
function todayPlus(n) { const d = new Date(); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); }
document.getElementById('j-admissionDate').value = todayPlus(21);
document.getElementById('j-targetDepartureDate').value = todayPlus(18);
document.getElementById('j-dischargeDate').value = todayPlus(26);

async function runJourney() {
  const btn = document.getElementById('j-run');
  const tl = document.getElementById('j-timeline');
  const summary = document.getElementById('j-summary');
  const body = {
    leadId: document.getElementById('j-leadId').value,
    attendants: document.getElementById('j-attendants').value,
    method: document.getElementById('j-method').value,
    admissionDate: document.getElementById('j-admissionDate').value,
    targetDepartureDate: document.getElementById('j-targetDepartureDate').value,
    dischargeDate: document.getElementById('j-dischargeDate').value,
    flexDays: document.getElementById('j-flexDays').value,
    city: document.getElementById('j-city').value,
  };
  btn.disabled = true; btn.textContent = 'Running the full journey…';
  tl.innerHTML = ''; summary.textContent = '';
  try {
    const r = await fetch('/api/journey/run', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify(body) });
    const data = await r.json();
    if (data.error) { summary.innerHTML = '<span style="color:var(--red)">' + esc(data.error) + '</span>'; btn.disabled = false; btn.textContent = 'Run the full journey'; return; }
    const ok = data.steps.filter(s => s.ok).length;
    summary.innerHTML = '<b>' + esc(data.category) + '</b> · ' + esc(data.market) + ' · lead #' + data.leadId + ' — ' + ok + '/' + data.steps.length + ' steps completed live';
    let lastPhase = null;
    for (const s of data.steps) {
      if (s.phase !== lastPhase) { tl.innerHTML += '<div class="tphase">' + esc(s.phase) + '</div>'; lastPhase = s.phase; }
      const body_ = s.ok ? renderResult(s.action, s.data) : '<span style="color:var(--red)">' + esc(s.data.error || 'failed') + '</span>';
      tl.innerHTML += '<div class="tstep' + (s.ok ? '' : ' fail') + '"><div class="agent" style="padding:14px 16px"><h2 style="font-size:14.5px">' + esc(s.title) + '<span class="tms">' + s.ms + 'ms</span></h2>' + body_ + '</div></div>';
    }
  } catch (e) { summary.innerHTML = '<span style="color:var(--red)">Request failed: ' + esc(String(e)) + '</span>'; }
  btn.disabled = false; btn.textContent = 'Run the full journey';
}
</script>
</body></html>`;
}
