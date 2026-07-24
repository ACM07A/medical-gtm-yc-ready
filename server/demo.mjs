import { readinessReport } from "../data-core/os_core.mjs";
import { appShell, icon } from "./canopus_ui.mjs";

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
  const cards = surfaces.map(([href, title, desc, kind]) => `<a class="card surface-link" href="${href}"><h3>${esc(title)} <span class="badge ${kind === "blocked" ? "blocked" : kind === "gate" ? "waiting-for-input" : kind === "legacy" ? "" : "ready"}">${kind}</span></h3><p class="label">${esc(desc)}</p></a>`).join("");
  return appShell("Executive Demo", `
  <section class="split">
    <div class="panel">
      <div class="eyebrow">Autonomous medical-tourism operating system</div>
      <h1>CanopusCare coordinates agents, hospitals, patients and vendors without crossing clinical lines.</h1>
      <p class="lede">AI prepares, organizes, follows up and recommends operational next actions. Humans and hospitals authorize clinical, regulatory, commercial and outbound decisions.</p>
      <div class="metric-row">
        <div class="metric-tile"><div class="k">${s.cases}</div><div class="label">synthetic cases</div></div>
        <div class="metric-tile"><div class="k">${s.agents}</div><div class="label">operational agents</div></div>
        <div class="metric-tile"><div class="k">${s.vendors}</div><div class="label">mock vendors</div></div>
        <div class="metric-tile"><div class="k">${s.approvals}</div><div class="label">approval records</div></div>
      </div>
    </div>
    <div class="panel">
      <h2>Four-Sided Network</h2>
      <div class="network">
        <div class="node"><b>Patients</b><br><span class="label">Synthetic case data, consent, documents, travel support.</span></div>
        <div class="node"><b>Agents</b><br><span class="label">Lead intake, status, hospital options, commission.</span></div>
        <div class="node center"><b>CanopusCare OS</b><br><span class="label">Compliance gates, agents, approvals, audit and orchestration.</span></div>
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
      <pre class="cmd">admin@canopuscare.demo / canopuscare-demo
hospital@canopuscare.demo / canopuscare-demo
agent@canopuscare.demo / canopuscare-demo
vendor@canopuscare.demo / canopuscare-demo
viewer@canopuscare.demo / canopuscare-demo</pre>
      <div class="actions"><button class="btn primary" onclick="resetDemo()">${icon("RotateCcw", 14)} Reset OS Demo</button><a class="btn" href="/docs/YC_REVIEWER_GUIDE.md">${icon("BookOpenText", 14)} Reviewer guide</a></div>
    </div>
  </section>

  <div class="foot"><b>Safety posture:</b> demo data is synthetic; regulatory clearances and pricing are illustrative; AI does not diagnose, interpret records, choose treatment, promise outcomes, declare fitness to fly, send real messages, post to social platforms or book vendors.</div>
<script>
async function resetDemo(){
  if(!confirm("Reset the synthetic OS demo data?")) return;
  const r = await fetch("/api/demo/reset", { method:"POST", headers:{"content-type":"application/json","x-demo-user":"admin@canopuscare.demo"}, body:"{}" });
  const j = await r.json();
  alert(j.ok ? "Demo reset complete" : (j.error && j.error.message) || j.error || "Reset blocked");
  if(j.ok) location.reload();
}
</script>
`, { active: "demo", metrics: { cases: s.cases, agents: s.agents, actions: 0 } });
}
