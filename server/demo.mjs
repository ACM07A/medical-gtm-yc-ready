import { readinessReport } from "../data-core/os_core.mjs";

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function stat(db, sql, ...p) { try { return db.prepare(sql).get(...p).c; } catch { return 0; } }
function one(db, sql, ...p) { try { return db.prepare(sql).get(...p); } catch { return null; } }

export function demoStats(db) {
  return {
    cases: stat(db, `SELECT count(*) c FROM patient_case`),
    blockedCases: stat(db, `SELECT count(*) c FROM patient_case WHERE blockers<>''`),
    agents: stat(db, `SELECT count(*) c FROM agent_definition`),
    agentRuns: stat(db, `SELECT count(*) c FROM agent_run`),
    approvals: stat(db, `SELECT count(*) c FROM approval`),
    vendors: stat(db, `SELECT count(*) c FROM vendor`),
    serviceRequests: stat(db, `SELECT count(*) c FROM service_request`),
    tasks: stat(db, `SELECT count(*) c FROM ops_task`),
    integrations: stat(db, `SELECT count(*) c FROM integration_connection`),
    partners: stat(db, `SELECT count(*) c FROM partner`),
    guides: stat(db, `SELECT count(*) c FROM content_asset WHERE status='published' AND language='en'`),
    tenants: stat(db, `SELECT count(*) c FROM tenant WHERE active=1`),
    leads: stat(db, `SELECT count(*) c FROM lead`),
  };
}

const CSS = `
:root{--bg:#f3f7fb;--panel:#fff;--ink:#102033;--muted:#62748a;--line:#dce7f2;--brand:#0b4a8b;--blue:#1f6fd6;--green:#1c8b50;--amber:#b7791f;--red:#b84a3d}
*{box-sizing:border-box}body{margin:0;font-family:"Segoe UI",Roboto,Arial,system-ui,sans-serif;background:var(--bg);color:var(--ink);line-height:1.48}.demo{background:#e5a13a;color:#342100;text-align:center;font-weight:850;font-size:12px;padding:8px 12px}
main{max-width:1180px;margin:0 auto;padding:24px 18px 72px}.hero{display:grid;grid-template-columns:1.05fr .95fr;gap:18px;align-items:stretch}.panel,.card{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:16px;box-shadow:0 12px 30px -24px rgba(11,74,139,.42)}
.eyebrow{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--blue);font-weight:850}h1{font-size:31px;line-height:1.08;margin:4px 0 10px;color:var(--brand)}h2{font-size:17px;margin:22px 0 10px;color:var(--brand)}h3{font-size:14px;margin:0 0 7px}.lede{color:var(--muted);max-width:760px;margin:0}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-top:16px}.k{font-size:24px;color:var(--brand);font-weight:850}.label{font-size:12px;color:var(--muted)}
.network{display:grid;grid-template-columns:1fr 1fr;gap:10px}.node{border:1px solid var(--line);border-radius:8px;padding:12px;background:#fbfdff}.node b{color:var(--brand)}.center{grid-column:1/3;background:#edf6ff;border-color:#bdd8f5;text-align:center}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px}.card{text-decoration:none;color:inherit;display:block}.card:hover{border-color:var(--blue)}.badge{display:inline-block;font-size:10px;font-weight:850;text-transform:uppercase;letter-spacing:.04em;border-radius:999px;padding:3px 8px;background:#e9eef5;color:#4d6075}.ready,.completed,.approved,.mock{background:#e3f5ea;color:var(--green)}.blocked,.disabled{background:#fae5e1;color:var(--red)}.warn{background:#faf0dd;color:var(--amber)}
ol{padding-left:20px}.path li{margin:5px 0}.split{display:grid;grid-template-columns:1fr 1fr;gap:12px}.cmd{background:#0d1b2a;color:#f0f6ff;border-radius:8px;padding:12px;overflow:auto;font-size:12px}.links{display:flex;flex-wrap:wrap;gap:8px}.btn{border:1px solid var(--line);background:#fff;color:var(--brand);border-radius:7px;padding:7px 10px;font-weight:750;text-decoration:none;font-size:13px}.btn.primary{background:var(--brand);color:#fff;border-color:var(--brand)}button.btn{cursor:pointer}.foot{font-size:12px;color:var(--muted);border-top:1px solid var(--line);padding-top:14px;margin-top:22px}
@media(max-width:850px){.hero,.split{grid-template-columns:1fr}.kpis{grid-template-columns:repeat(2,1fr)}}
`;

const surfaces = [
  ["/agent", "Agent Portal", "Lead intake, API instructions, case status, commission forecast and malformed-row guardrails.", "core"],
  ["/cases/case_ibrahim_musa", "Ibrahim Musa Case", "Synthetic Nigerian cardiac golden path with documents, matches, estimate, vendors and audit.", "core"],
  ["/hospital", "Hospital Command Centre", "Inbox, pipeline, SLA board, task board and synthetic revenue view.", "core"],
  ["/vendors", "Vendor Coordination", "Interpreter, transfer and accommodation mock quotes without real bookings.", "core"],
  ["/agents", "AI Agent Activity Centre", "Deterministic operational agents with evidence, cost, confidence and approval flags.", "core"],
  ["/studio", "Human Approval Studio", "Server-side compliance gates before publishing, outreach, messages or releases.", "gate"],
  ["/integrations", "Integration Readiness", "Mocked, disabled and configured adapter states with outbound arming status.", "gate"],
  ["/audit", "Audit Log", "Material actions and blocked compliance decisions.", "gate"],
  ["/cases/case_amina_okoro", "Blocked Exception Case", "No-consent case visibly blocked before communication or routing.", "blocked"],
  ["/console", "Legacy GTM Console", "Partner sourcing, content and distribution engine from the original prototype.", "legacy"],
  ["/sandbox", "WhatsApp Sandbox", "Legacy editable patient-journey simulator.", "legacy"],
  ["/benchmarks", "Benchmarks", "De-identified aggregate learning with k-anonymity suppression.", "legacy"],
];

export function renderDemo(db) {
  const s = demoStats(db);
  const ready = readinessReport(db);
  const golden = one(db, `SELECT * FROM patient_case WHERE id='case_ibrahim_musa'`) || {};
  const blocked = one(db, `SELECT * FROM patient_case WHERE blockers<>'' LIMIT 1`) || {};
  const compliance = one(db, `SELECT count(*) c FROM approval WHERE status='Blocked'`)?.c || 0;
  const agentSummary = one(db, `SELECT count(*) total, sum(CASE WHEN status='Completed' THEN 1 ELSE 0 END) completed FROM agent_run`) || { total: 0, completed: 0 };
  const cards = surfaces.map(([href, title, desc, kind]) => `<a class="card" href="${href}"><h3>${esc(title)} <span class="badge ${kind === "blocked" ? "blocked" : kind === "gate" ? "warn" : kind === "legacy" ? "" : "ready"}">${kind}</span></h3><p class="label">${esc(desc)}</p></a>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MedYatra Executive Demo</title><style>${CSS}</style></head><body>
<div class="demo">DEMO ENVIRONMENT - Synthetic patient and transaction data. Do not enter real medical records.</div>
<main>
  <section class="hero">
    <div class="panel">
      <div class="eyebrow">Autonomous medical-tourism operating system</div>
      <h1>MedYatra coordinates agents, hospitals, patients and vendors without crossing clinical lines.</h1>
      <p class="lede">AI prepares, organizes, follows up and recommends operational next actions. Humans and hospitals authorize clinical, regulatory, commercial and outbound decisions.</p>
      <div class="kpis">
        <div><div class="k">${s.cases}</div><div class="label">synthetic cases</div></div>
        <div><div class="k">${s.agents}</div><div class="label">operational agents</div></div>
        <div><div class="k">${s.vendors}</div><div class="label">mock vendors</div></div>
        <div><div class="k">${s.approvals}</div><div class="label">approval records</div></div>
      </div>
    </div>
    <div class="panel">
      <h2>Four-Sided Network</h2>
      <div class="network">
        <div class="node"><b>Patients</b><br><span class="label">Synthetic case data, consent, documents, travel support.</span></div>
        <div class="node"><b>Agents</b><br><span class="label">Lead intake, status, hospital options, commission.</span></div>
        <div class="node center"><b>MedYatra OS</b><br><span class="label">Compliance gates, agents, approvals, audit and orchestration.</span></div>
        <div class="node"><b>Hospitals</b><br><span class="label">Clinical review status, estimates, SLA, tasks.</span></div>
        <div class="node"><b>Vendors</b><br><span class="label">Interpreter, transfers, accommodation and non-clinical logistics.</span></div>
      </div>
    </div>
  </section>

  <section class="split">
    <div class="panel">
      <h2>Current Demo Scenario</h2>
      <p><b>${esc(golden.synthetic_name)}</b> from ${esc(golden.source_market)} needs ${esc(golden.treatment_request)}. Consent is ${esc(golden.consent_status)}; current stage is ${esc(golden.current_stage)}.</p>
      <p class="label">Exception path: ${esc(blocked.synthetic_name)} is blocked with <b>${esc(blocked.blockers)}</b>.</p>
    </div>
    <div class="panel">
      <h2>Live System Status</h2>
      <p>${esc(ready.app_mode)} mode ${ready.status === "READY" ? '<span class="badge ready">READY</span>' : `<span class="badge blocked">${esc(ready.status)}</span>`} · external actions <span class="badge blocked">${esc(ready.external_actions)}</span></p>
      <p class="label">${agentSummary.completed || 0}/${agentSummary.total || 0} deterministic agent runs completed · ${compliance} blocked approval(s) seeded · ${s.integrations} integration adapters tracked.</p>
    </div>
  </section>

  <h2>Golden Path Walkthrough</h2>
  <div class="panel"><ol class="path">
    <li>Agent imports the Lagos cardiac lead and consent is captured.</li>
    <li>Document Checklist Agent identifies missing reports; synthetic placeholders are attached.</li>
    <li>Hospital Matching Agent creates three operational matches without claiming clinical suitability.</li>
    <li>Apollo marks the case eligible for a synthetic estimate; Fortis requests an additional investigation.</li>
    <li>Hospital admin approves estimate release; the agent sees an indicative comparison.</li>
    <li>Patient selects a hospital; invitation-letter, visa checklist, interpreter, transfer and accommodation requests are prepared.</li>
    <li>Mock vendors provide quotes; coordinator approves the package; arrival and follow-up tasks are scheduled.</li>
  </ol></div>

  <h2>Demo Surfaces</h2>
  <div class="grid">${cards}</div>

  <section class="split">
    <div class="panel">
      <h2>Run Locally</h2>
      <pre class="cmd">cp .env.example .env
npm ci
npm run demo
npm run dev
# open http://localhost:5173/demo</pre>
      <p class="label">One command: <code>npm run yc-demo</code>. Docker: <code>docker compose up --build</code>.</p>
    </div>
    <div class="panel">
      <h2>Demo Credentials</h2>
      <pre class="cmd">admin@medyatra.demo / medyatra-demo
hospital@medyatra.demo / medyatra-demo
agent@medyatra.demo / medyatra-demo
vendor@medyatra.demo / medyatra-demo
viewer@medyatra.demo / medyatra-demo</pre>
      <div class="links"><button class="btn primary" onclick="resetDemo()">Reset OS Demo</button><a class="btn" href="/docs/YC_REVIEWER_GUIDE.md">Reviewer guide</a></div>
    </div>
  </section>

  <div class="foot"><b>Safety posture:</b> demo data is synthetic; regulatory clearances and pricing are illustrative; AI does not diagnose, interpret records, choose treatment, promise outcomes, declare fitness to fly, send real messages, post to social platforms or book vendors.</div>
</main>
<script>
async function resetDemo(){
  if(!confirm("Reset the synthetic OS demo data?")) return;
  const r = await fetch("/api/demo/reset", { method:"POST", headers:{"content-type":"application/json","x-demo-user":"admin@medyatra.demo"}, body:"{}" });
  const j = await r.json();
  alert(j.ok ? "Demo reset complete" : (j.error && j.error.message) || j.error || "Reset blocked");
  if(j.ok) location.reload();
}
</script>
</body></html>`;
}
