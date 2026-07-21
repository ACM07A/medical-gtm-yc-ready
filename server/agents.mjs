// /agents — the concierge agents, live and clickable. Where /sandbox shows the SALES journey (WhatsApp
// state machine, human-edited templates), this shows the CONCIERGE journey: the four Tier-A agents from
// PROJECT_CONTEXT.md §5.6 that turn "a patient booked" into "a patient actually gets treated and their
// family isn't left wondering." Every run is REAL — it calls the actual failover chain (or the deterministic
// fallback if no key is set) and shows the actual safety-gate verdict, not a canned transcript.
//
// This exists because a static description of "we built an agent that does X" is a claim; a button someone
// can click that produces real, safety-checked output in front of them is evidence.
import { triage } from "../lib/agents/triage.mjs";
import { familyUpdate } from "../lib/agents/family_update.mjs";
import { documentChecklist } from "../lib/agents/document_checklist.mjs";
import { reconcile, explainVariance } from "../lib/agents/billing_reconciliation.mjs";

const CSS = `
:root{--bg:#eef3f9;--panel:#fff;--ink:#0c1b2e;--muted:#5a6b80;--line:#e2ecf7;--brand:#0b4a8b;--brand2:#1f6fd6;--green:#1c8b50;--amber:#e5a13a;--red:#b3261e;--shadow:0 18px 46px -28px rgba(11,74,139,.5)}
@media(prefers-color-scheme:dark){:root{--bg:#0e1621;--panel:#152232;--ink:#e7eefb;--muted:#8ba0ba;--line:#22364d;--brand:#5aa0ee;--brand2:#7cb6f5;--red:#f0837a;--shadow:0 18px 46px -22px rgba(0,0,0,.6)}}
:root[data-theme=dark]{--bg:#0e1621;--panel:#152232;--ink:#e7eefb;--muted:#8ba0ba;--line:#22364d;--brand:#5aa0ee;--brand2:#7cb6f5;--red:#f0837a}
:root[data-theme=light]{--bg:#eef3f9;--panel:#fff;--ink:#0c1b2e;--muted:#5a6b80;--line:#e2ecf7;--brand:#0b4a8b;--brand2:#1f6fd6;--red:#b3261e}
*{box-sizing:border-box}body{margin:0;font-family:"Segoe UI",Roboto,system-ui,-apple-system,sans-serif;color:var(--ink);background:var(--bg);line-height:1.55}
.ribbon{background:var(--amber);color:#3a2600;font-weight:700;font-size:12.5px;text-align:center;padding:7px 12px}
.ribbon a{color:#3a2600}
.wrap{max-width:980px;margin:0 auto;padding:30px 20px 70px}
.eyebrow{font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:var(--brand2);font-weight:700}
h1{font-size:28px;margin:6px 0 8px;letter-spacing:-.02em}
.lede{font-size:15px;color:var(--muted);max-width:660px}
.agent{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:20px 22px;margin-top:20px;box-shadow:var(--shadow)}
.agent h2{margin:0 0 4px;font-size:18px}
.agent .desc{font-size:13px;color:var(--muted);margin-bottom:14px}
.row{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px}
.row label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--muted);flex:1;min-width:160px}
.row input,.row textarea,.row select{font:inherit;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--ink)}
.row textarea{min-height:60px;resize:vertical;width:100%}
button.run{background:var(--brand);color:#fff;border:none;border-radius:999px;padding:9px 20px;font-weight:700;font-size:13px;cursor:pointer}
button.run:hover{background:var(--brand2)}
button.run:disabled{opacity:.6;cursor:wait}
.out{margin-top:14px;background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:12px 14px;font-size:13.5px;display:none}
.out.show{display:block}
.badge{display:inline-block;font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;padding:2px 9px;border-radius:999px;margin-bottom:8px}
.badge.pass{background:rgba(28,139,80,.15);color:var(--green)}
.badge.review{background:rgba(229,161,58,.2);color:#8a5c00}
.badge.escalate,.badge.block{background:rgba(179,38,30,.15);color:var(--red)}
.method{font-size:11px;color:var(--muted);float:right}
pre{white-space:pre-wrap;word-break:break-word;margin:0;font-family:ui-monospace,Consolas,monospace;font-size:12.5px}
table.chk{width:100%;border-collapse:collapse;font-size:13px}
table.chk td{padding:4px 6px;border-bottom:1px solid var(--line)}
table.chk td:first-child{width:22px}
`;

const AGENT_META = [
  { id: "triage", title: "Triage agent", desc: "Turns the patient's own words into the structured case file a hospital reviews in three minutes — the unit we actually sell (see BUSINESS_STATUS.md §3). Extracts only what was said; never infers a diagnosis." },
  { id: "family-update", title: "Family update agent", desc: "A daily, plain-language update to whoever is waiting at home — the highest-trust, lowest-cost thing in the journey, and the reason it doesn't exist elsewhere: a human coordinator model can't afford to write it every day, in six languages, for every patient." },
  { id: "document-checklist", title: "Document checklist agent", desc: "Deterministic, not generated — visa document requirements are exactly where a model's fluent confidence is a liability. Built from lib/visa.mjs, per country and attendant count." },
  { id: "billing-reconciliation", title: "Billing reconciliation agent", desc: "Explains a quote-vs-actual variance line by line. The math is always plain arithmetic; only the phrasing is generated — a model must never compute money." },
];

function agentCard(a) {
  const body = ({
    triage: `<div class="row">
        <label>Patient message (their own words)
          <textarea data-f="text">I need a knee replacement, I'm 58, from Oman, no reports yet, my local doctor said it's not urgent</textarea>
        </label></div>`,
    "family-update": `<div class="row">
        <label>Patient first name<input data-f="patientFirstName" value="Fatima"></label>
        <label>Journey stage<select data-f="stage">
          <option value="travel">travel — just arrived</option>
          <option value="pre_op">pre_op — pre-procedure checks</option>
          <option value="in_treatment">in_treatment — at the hospital</option>
          <option value="post_op" selected>post_op — in recovery</option>
          <option value="complication">complication — being actively managed</option>
        </select></label>
      </div>
      <div class="row"><label style="flex:2">Logistics note (status only, not clinical)
        <input data-f="note" value="first walk around the ward today"></label></div>`,
    "document-checklist": `<div class="row">
        <label>Patient country<select data-f="countryCode">
          <option value="OM" selected>Oman</option><option value="KE">Kenya</option>
          <option value="NG">Nigeria</option><option value="PK">Pakistan</option><option value="BD">Bangladesh</option>
        </select></label>
        <label>Attendants<input data-f="attendants" type="number" value="1" min="0" max="3"></label>
        <label>Category<input data-f="category" value="cardiac"></label>
      </div>`,
    "billing-reconciliation": `<div class="row">
        <label style="flex:2">Quoted lines — label:amount, comma-separated
          <input data-f="quoted" value="Procedure:5500,Hospital stay:800,Coordination:300"></label>
      </div>
      <div class="row">
        <label style="flex:2">Actual lines — label:amount, comma-separated
          <input data-f="actual" value="Procedure:5500,Hospital stay:1400,Coordination:300,ICU night:900"></label>
      </div>`,
  })[a.id];
  return `<div class="agent" data-agent="${a.id}">
    <h2>${a.title}</h2><div class="desc">${a.desc}</div>
    ${body}
    <button class="run" onclick="runAgent('${a.id}', this)">Run — real output, not a transcript</button>
    <div class="out"></div>
  </div>`;
}

export function renderAgentsDemo() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>MedYatra — Concierge Agents</title><style>${CSS}</style></head><body>
<div class="ribbon">MEDYATRA · concierge agents — every run below is LIVE (real model call or its safety-checked deterministic fallback) — <a href="/demo">back to demo hub</a></div>
<div class="wrap">
  <div class="eyebrow">Post-booking journey · build-os/09</div>
  <h1>The agents that get a booked patient actually treated</h1>
  <p class="lede">Four of the concierge agents from the full journey map, wired to the real failover chain and the
  real safety gate (<code>lib/safety.mjs</code>) — the same one that blocks diagnosis, dosage, prognosis and
  fitness-to-fly claims on every outbound message. Click Run on any card; nothing here is scripted.</p>
  ${AGENT_META.map(agentCard).join("")}
</div>
<script>
async function runAgent(id, btn) {
  const card = btn.closest('.agent');
  const out = card.querySelector('.out');
  const fields = {};
  card.querySelectorAll('[data-f]').forEach(el => fields[el.dataset.f] = el.value);
  btn.disabled = true; btn.textContent = 'Running…';
  out.className = 'out show'; out.innerHTML = '<span style="color:var(--muted)">calling the agent…</span>';
  try {
    const r = await fetch('/api/agents/' + id, { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify(fields) });
    const data = await r.json();
    out.innerHTML = renderResult(id, data);
  } catch (e) {
    out.innerHTML = '<span style="color:var(--red)">Request failed: ' + String(e) + '</span>';
  }
  btn.disabled = false; btn.textContent = 'Run — real output, not a transcript';
}
function badge(v) { return '<span class="badge ' + (v||'pass') + '">' + (v||'pass') + '</span>'; }
function renderResult(id, data) {
  if (data.error) return '<span style="color:var(--red)">' + data.error + '</span>';
  const v = data.safety ? data.safety.verdict : null;
  const method = data.method ? '<span class="method">' + data.method + '</span>' : '';
  if (id === 'document-checklist') {
    const rows = (data.items||[]).map(i => '<tr><td>' + (i.done?'✓':'○') + '</td><td>' + i.item + '</td></tr>').join('');
    return method + '<b>' + data.attendants + '/' + data.attendantsAllowed + ' attendants allowed for ' + data.countryCode + '</b>' +
      '<table class="chk">' + rows + '</table>';
  }
  if (id === 'billing-reconciliation') {
    const rows = data.diff.rows.map(r => '<tr><td>' + r.label + '</td><td>$' + r.quoted + '</td><td>$' + r.actual +
      '</td><td style="color:' + (r.delta>0?'var(--red)':r.delta<0?'var(--green)':'inherit') + '">' + (r.delta>=0?'+':'') + '$' + r.delta + '</td></tr>').join('');
    return badge(v) + method + '<table class="chk"><tr><td><b>Line</b></td><td><b>Quoted</b></td><td><b>Actual</b></td><td><b>Δ</b></td></tr>' + rows +
      '</table><p style="margin-top:10px">' + data.text + '</p>';
  }
  if (id === 'triage') {
    return badge(v) + method + '<pre>' + JSON.stringify(data, null, 2).replace(/</g,'&lt;') + '</pre>';
  }
  return badge(v) + method + '<p>' + (data.text||'').replace(/</g,'&lt;') + '</p>';
}
</script>
</body></html>`;
}

// API handlers — thin, no framework. Return plain JSON. Every handler runs the SAME agent function the
// npm-run CLI scripts use, so "clicked in the browser" and "run headlessly" are never two code paths.
export async function runTriage(body) {
  return triage(body.text || "", {});
}
export async function runFamilyUpdate(body) {
  return familyUpdate({ stage: body.stage, patientFirstName: body.patientFirstName, note: body.note, language: body.language || "en" });
}
export function runDocumentChecklist(body) {
  return documentChecklist({ countryCode: body.countryCode, attendants: Number(body.attendants) || 1, category: body.category });
}
export async function runBillingReconciliation(body) {
  const parseLines = (s) => String(s || "").split(",").map((p) => p.trim()).filter(Boolean).map((p) => {
    const [label, amount] = p.split(":"); return { label: (label || "").trim(), amount: Number(amount) || 0 };
  });
  const diff = reconcile(parseLines(body.quoted), parseLines(body.actual));
  return explainVariance(diff);
}
