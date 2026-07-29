import { DEMO_USERNAME, readinessReport } from "../data-core/os_core.mjs";
import { appShell, icon } from "./canopus_ui.mjs";

const esc = (value) => String(value ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const stat = (db, sql, ...params) => { try { return db.prepare(sql).get(...params).c; } catch { return 0; } };
const one = (db, sql, ...params) => { try { return db.prepare(sql).get(...params); } catch { return null; } };

export function demoStats(db) {
  return {
    cases: stat(db, `SELECT count(*) c FROM patient_case`),
    blockedCases: stat(db, `SELECT count(*) c FROM patient_case WHERE blockers<>''`),
    agents: stat(db, `SELECT count(*) c FROM agent_definition`),
    approvals: stat(db, `SELECT count(*) c FROM approval`),
    vendors: stat(db, `SELECT count(*) c FROM vendor`),
    serviceRequests: stat(db, `SELECT count(*) c FROM service_request`),
    integrations: stat(db, `SELECT count(*) c FROM integration_connection`),
  };
}

const surfaces = [
  ["/agent", "Agent portal", "Lead intake, case status, commission forecast and input guardrails.", "core", "Users"],
  ["/cases/CASE-DEMO-001", "Golden case workspace", "Synthetic cardiac case with records, hospital responses, estimates and audit.", "core", "HeartPulse"],
  ["/hospital", "Hospital command centre", "Assigned-case inbox, response workflow, SLA and task board.", "core", "Building2"],
  ["/vendors", "Travel coordination", "Interpreter, transfer and accommodation requests without real bookings.", "core", "Plane"],
  ["/agents", "AI-assisted activity", "Deterministic operational outputs with evidence and approval state.", "core", "Activity"],
  ["/workflows", "13 agent and WhatsApp workflows", "Reviewer-safe concierge agents and the human-gated communications lifecycle.", "core", "Bot"],
  ["/integrations", "Integration readiness", "Operational, simulated and disabled adapter states.", "gate", "Plug"],
  ["/audit", "Audit history", "Material actions, actors, timestamps and blocked decisions.", "gate", "ScrollText"],
  ["/cases/CASE-DEMO-002", "Consent-blocked case", "Progression is refused until consent and records are complete.", "blocked", "TriangleAlert"],
];

export function renderDemo(db, session) {
  const stats = demoStats(db);
  const ready = readinessReport(db);
  const golden = one(db, `SELECT * FROM patient_case WHERE id='case_ibrahim_musa'`) || {};
  const blocked = one(db, `SELECT * FROM patient_case WHERE blockers<>'' LIMIT 1`) || {};
  const compliance = one(db, `SELECT count(*) c FROM approval WHERE status='Blocked'`)?.c || 0;
  const agentSummary = one(db, `SELECT count(*) total, sum(CASE WHEN status='Completed' THEN 1 ELSE 0 END) completed FROM agent_run`) || { total: 0, completed: 0 };
  const cards = surfaces.map(([href, title, desc, kind, iconName]) => `
    <a class="card surface-link surface-card ${kind === "blocked" ? "blocked-card" : kind === "gate" ? "gate-card" : ""}" href="${href}">
      <span class="surface-icon">${icon(iconName, 20)}</span>
      <span><h3>${esc(title)}</h3><p class="label">${esc(desc)}</p><span class="badge ${kind === "blocked" ? "blocked" : kind === "gate" ? "waiting-for-input" : kind === "core" ? "ready" : ""}">${kind}</span></span>
      <span class="arrow">${icon("ArrowRight", 17)}</span>
    </a>`).join("");

  return appShell("Executive demo", `
    <section class="panel hero-panel"><div class="hero-copy">
      <div class="eyebrow">International patient coordination</div>
      <h1>One clear workflow from patient intake to hospital response and travel readiness.</h1>
      <p class="lede">Canopus Care helps care coordinators and hospital teams organize records, approvals, quotations and next steps. Clinicians retain every medical decision.</p>
      <div class="actions hero-actions"><a class="btn primary" href="/cases/CASE-DEMO-001">${icon("HeartPulse",16)} Open golden case</a><a class="btn" href="/login">${icon("KeyRound",16)} Sign in by role</a></div>
      <div class="trust-row"><span>${icon("LockKeyhole",14)} Synthetic data</span><span>${icon("CircleCheckBig",14)} Human approved</span><span>${icon("Building2",14)} Hospital-led care</span></div>
    </div><figure class="hero-media"><img src="/site/assets/care-coordination.png" alt="A patient and care coordinator reviewing a travel care plan"></figure></section>

    <div class="metric-row">
      <div class="metric-tile"><span class="metric-icon">${icon("BriefcaseMedical",18)}</span><div class="k">${stats.cases}</div><div class="label">Synthetic cases</div></div>
      <div class="metric-tile"><span class="metric-icon">${icon("Bot",18)}</span><div class="k">${stats.agents}</div><div class="label">Operational agents</div></div>
      <div class="metric-tile"><span class="metric-icon">${icon("FileCheck2",18)}</span><div class="k">${stats.approvals}</div><div class="label">Approval records</div></div>
      <div class="metric-tile"><span class="metric-icon">${icon("Plane",18)}</span><div class="k">${stats.serviceRequests}</div><div class="label">Travel requests</div></div>
    </div>

    <div class="section-head"><div><div class="eyebrow">Current case</div><h2>Golden demonstration workflow</h2></div><span class="label">Synthetic demo case. No real patient data.</span></div>
    <section class="split">
      <div class="panel case-summary">
        <span class="case-symbol">${icon("HeartPulse",28)}</span>
        <span><h2>${esc(golden.synthetic_name)}</h2><p class="lede">${esc(golden.treatment_request)} from ${esc(golden.source_market)}</p>
          <span class="case-meta"><span class="badge ready">${esc(golden.synthetic_identifier)}</span><span class="badge ready">${esc(golden.consent_status)}</span><span class="badge waiting-for-input">${esc(golden.current_stage).replace(/_/g, " ")}</span></span>
        </span>
        <a class="btn primary" href="/cases/CASE-DEMO-001">Continue case ${icon("ArrowRight",15)}</a>
      </div>
      <div class="panel attention-panel"><div class="status-list"><div class="status-row">
        <span class="status-icon">${icon("TriangleAlert",17)}</span>
        <span><b>${esc(blocked.synthetic_name)} needs attention</b><span class="label">${esc(blocked.blockers)} prevents external sharing.</span></span>
        <a class="icon-btn" href="/cases/CASE-DEMO-002" aria-label="Open blocked case">${icon("ArrowRight",16)}</a>
      </div></div></div>
    </section>

    <div class="panel journey-panel">
      <div class="section-head"><div><span class="eyebrow">Patient journey</span><h2>Case progress</h2></div><span class="badge info">4 of 7 stages</span></div>
      <div class="journey-track" aria-label="Case progress">
      <div class="journey-step done"><span class="journey-dot">${icon("CircleCheckBig",15)}</span><span>Intake</span></div>
      <div class="journey-step done"><span class="journey-dot">${icon("CircleCheckBig",15)}</span><span>Records</span></div>
      <div class="journey-step done"><span class="journey-dot">${icon("CircleCheckBig",15)}</span><span>Matching</span></div>
      <div class="journey-step active"><span class="journey-dot">${icon("Building2",15)}</span><span>Hospital review</span></div>
      <div class="journey-step"><span class="journey-dot">${icon("WalletCards",15)}</span><span>Estimate</span></div>
      <div class="journey-step"><span class="journey-dot">${icon("Plane",15)}</span><span>Travel</span></div>
      <div class="journey-step"><span class="journey-dot">${icon("HeartPulse",15)}</span><span>Follow-up</span></div>
    </div></div>

    <section class="split">
      <div class="panel"><h2>System readiness</h2><div class="status-list">
        <div class="status-row"><span class="status-icon">${icon("Activity",17)}</span><span><b>Application status</b><span class="label">${esc(ready.app_mode)} mode with synthetic seed loaded</span></span>${ready.status === "READY" ? '<span class="badge ready">Ready</span>' : `<span class="badge blocked">${esc(ready.status)}</span>`}</div>
        <div class="status-row"><span class="status-icon">${icon("Bot",17)}</span><span><b>AI-assisted operations</b><span class="label">${agentSummary.completed || 0}/${agentSummary.total || 0} deterministic runs completed</span></span><span class="badge high">Assisted</span></div>
        <div class="status-row"><span class="status-icon">${icon("LockKeyhole",17)}</span><span><b>External actions</b><span class="label">Human approval and provider credentials required</span></span><span class="badge blocked">${esc(ready.external_actions)}</span></div>
      </div></div>
      <div class="panel"><h2>Human oversight</h2><div class="status-list">
        <div class="status-row"><span class="status-icon">${icon("Users",17)}</span><span><b>Maya Rao, care coordinator</b><span class="label">Owns administrative next steps for the golden case</span></span><span class="badge ready">Assigned</span></div>
        <div class="status-row"><span class="status-icon">${icon("CircleCheckBig",17)}</span><span><b>Approval controls</b><span class="label">${stats.approvals} recorded decisions; ${compliance} compliance refusal</span></span><a class="icon-btn" href="/cases/CASE-DEMO-001" aria-label="Review case approvals">${icon("ArrowRight",16)}</a></div>
      </div></div>
    </section>

    <div class="section-head"><div><div class="eyebrow">Explore</div><h2>Product workspaces</h2></div><span class="label">Core workflow first; gated and legacy operator surfaces are labelled.</span></div>
    <div class="grid">${cards}</div>

    <section class="split">
      <div class="panel"><h2>Local setup</h2><pre class="cmd">cp .env.example .env
npm ci
npm run yc-demo</pre><p class="label">Docker alternative: <code>docker compose up --build</code>.</p></div>
      <div class="panel"><h2>Reviewer access</h2><pre class="cmd">${esc(process.env.DEMO_USERNAME || DEMO_USERNAME)}
Password configured by the deployment owner</pre><p class="label">Sign-in is required. Reviewer access is read-only; hospital, agent and vendor accounts receive server-scoped views.</p>
        <div class="actions"><a class="btn primary" href="/login">${icon("KeyRound",14)} Reviewer login</a>${session?.authenticated && session.role === "platform_admin" ? `<button class="btn" onclick="resetDemo()">${icon("RotateCcw",14)} Reset demo</button>` : ""}<a class="btn" href="/docs/YC_REVIEWER_GUIDE.md">${icon("BookOpenText",14)} Reviewer guide</a></div>
      </div>
    </section>

    <div class="foot"><b>Safety posture:</b> synthetic data only. AI does not diagnose, interpret scans, choose treatment, promise outcomes, declare fitness to fly, send messages, post publicly or book vendors.</div>
    <script>
    async function resetDemo(){
      if(!confirm("Reset the synthetic demo data?")) return;
      const response = await fetch("/api/demo/reset",{method:"POST",headers:{"content-type":"application/json"},body:"{}"});
      const data = await response.json();
      alert(data.ok ? "Demo reset complete" : data.error?.message || "Reset blocked");
      if(data.ok) location.reload();
    }
    </script>
  `, {
    active: "demo",
    userName: session?.user?.name,
    userRole: session?.role?.replace(/_/g, " "),
    metrics: { cases: stats.cases, agents: stats.agents, actions: 0 },
  });
}
