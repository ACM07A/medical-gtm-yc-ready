import { readinessReport } from "../data-core/os_core.mjs";

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const rows = (items, cols) => items.map((r) => `<tr>${cols.map(([k, f]) => `<td>${esc(f ? f(r) : r[k])}</td>`).join("")}</tr>`).join("");
const badge = (s) => `<span class="badge ${String(s || "").toLowerCase().replace(/[^a-z0-9]+/g,"-")}">${esc(s)}</span>`;

const CSS = `
:root{--bg:#f3f7fb;--panel:#fff;--ink:#102033;--muted:#62748a;--line:#dce7f2;--brand:#0b4a8b;--blue:#1f6fd6;--green:#1c8b50;--amber:#b7791f;--red:#b84a3d}
*{box-sizing:border-box}body{margin:0;font-family:"Segoe UI",Roboto,Arial,system-ui,sans-serif;background:var(--bg);color:var(--ink);line-height:1.45}
.demo{background:#e5a13a;color:#342100;text-align:center;font-weight:800;font-size:12px;padding:8px 12px}.nav{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:12px 18px;background:#fff;border-bottom:1px solid var(--line);position:sticky;top:0;z-index:2}
.nav b{color:var(--brand);margin-right:10px}.nav a{color:var(--muted);text-decoration:none;font-weight:650;font-size:13px;padding:6px 8px;border-radius:7px}.nav a:hover{background:#edf4fb;color:var(--brand)}
main{max-width:1180px;margin:0 auto;padding:22px 18px 70px}.head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:16px}.eyebrow{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--blue);font-weight:800}
h1{font-size:25px;margin:2px 0 4px;color:var(--brand)}.lede{color:var(--muted);max-width:760px;margin:0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(245px,1fr));gap:12px}.card,.panel{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:14px;box-shadow:0 12px 30px -24px rgba(11,74,139,.45)}
.k{font-size:24px;color:var(--brand);font-weight:800}.label{font-size:12px;color:var(--muted)}h2{font-size:16px;margin:22px 0 9px;color:var(--brand)}h3{font-size:14px;margin:0 0 8px;color:var(--ink)}
table{width:100%;border-collapse:collapse;background:var(--panel);border:1px solid var(--line);border-radius:8px;overflow:hidden}th,td{padding:9px 10px;border-bottom:1px solid var(--line);text-align:left;font-size:13px;vertical-align:top}th{background:#edf4fb;color:#40556d;font-size:11px;text-transform:uppercase;letter-spacing:.06em}
.badge{display:inline-block;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;border-radius:999px;padding:3px 8px;background:#e9eef5;color:#4d6075}.badge.completed,.badge.released,.badge.approved,.badge.ready,.badge.verified-demo-docs{background:#e3f5ea;color:var(--green)}.badge.blocked,.badge.missing,.badge.disabled{background:#fae5e1;color:var(--red)}.badge.waiting-for-input,.badge.needs-review,.badge.requested,.badge.mock{background:#faf0dd;color:var(--amber)}
.split{display:grid;grid-template-columns:1.35fr .9fr;gap:12px}.tabs{display:flex;gap:7px;flex-wrap:wrap;margin:10px 0}.tab{background:#fff;border:1px solid var(--line);border-radius:7px;padding:6px 9px;font-size:12px;font-weight:700;color:#51657b}.callout{border-left:4px solid var(--amber);background:#fff8ea;padding:10px 12px;border-radius:6px;color:#553600}.actions{display:flex;gap:8px;flex-wrap:wrap}.btn{border:1px solid var(--line);background:#fff;color:var(--brand);border-radius:7px;padding:7px 10px;font-weight:750;text-decoration:none;font-size:13px}.danger{color:var(--red)}
@media(max-width:800px){.split{grid-template-columns:1fr}.head{display:block}.nav{position:static}}
`;

function shell(title, inner) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>${CSS}</style></head><body>
<div class="demo">DEMO ENVIRONMENT - Synthetic patient and transaction data. Do not enter real medical records.</div>
<nav class="nav"><b>MedYatra OS</b><a href="/demo">Demo</a><a href="/cases">Cases</a><a href="/hospital">Hospital</a><a href="/agent">Agent Portal</a><a href="/vendors">Vendors</a><a href="/tasks">Tasks</a><a href="/studio">Approvals</a><a href="/agents">AI Agents</a><a href="/integrations">Integrations</a><a href="/audit">Audit</a></nav>
<main>${inner}</main></body></html>`;
}

export function getSession(db, req) {
  const email = req.headers["x-demo-user"] || "admin@medyatra.demo";
  const user = db.prepare(`SELECT * FROM app_user WHERE email=? AND active=1`).get(email) || db.prepare(`SELECT * FROM app_user WHERE email='admin@medyatra.demo'`).get();
  const memberships = user ? db.prepare(`SELECT m.role,o.* FROM membership m JOIN organization o ON o.id=m.organization_id WHERE m.user_id=?`).all(user.id) : [];
  return { user, memberships, role: memberships[0]?.role || "read_only", organization_id: memberships[0]?.id || "org_platform" };
}

function scopedCaseWhere(session) {
  if (session.role === "platform_admin" || session.role === "read_only") return ["1=1", []];
  if (session.role.startsWith("hospital")) return ["assigned_hospital_org_id=?", [session.organization_id]];
  if (session.role.startsWith("agent") || session.role.startsWith("facilitator")) return ["source_agent_org_id=?", [session.organization_id]];
  if (session.role.startsWith("vendor")) return ["assigned_vendor_org_id=?", [session.organization_id]];
  return ["0=1", []];
}

export function apiCases(db, session) {
  const [where, p] = scopedCaseWhere(session);
  return db.prepare(`SELECT * FROM patient_case WHERE ${where} ORDER BY created`).all(...p);
}

export function apiCase(db, session, id) {
  const c = apiCases(db, session).find((x) => x.id === id);
  if (!c) return null;
  return {
    ...c,
    documents: db.prepare(`SELECT * FROM case_document WHERE case_id=? ORDER BY doc_type`).all(id),
    matches: db.prepare(`SELECT * FROM hospital_match WHERE case_id=? ORDER BY confidence`).all(id),
    reviews: db.prepare(`SELECT * FROM hospital_review WHERE case_id=?`).all(id),
    estimates: db.prepare(`SELECT * FROM estimate WHERE case_id=?`).all(id).map((e) => ({ ...e, items: db.prepare(`SELECT * FROM estimate_item WHERE estimate_id=?`).all(e.id) })),
    services: db.prepare(`SELECT sr.*,v.service_categories,v.indicative_price FROM service_request sr LEFT JOIN vendor v ON v.id=sr.vendor_id WHERE sr.case_id=?`).all(id),
    tasks: db.prepare(`SELECT * FROM ops_task WHERE case_id=?`).all(id),
    approvals: db.prepare(`SELECT * FROM approval WHERE subject_ref=? OR subject_ref IN (SELECT id FROM estimate WHERE case_id=?)`).all(id, id),
    audit: db.prepare(`SELECT * FROM audit_event WHERE subject_id=? ORDER BY created DESC`).all(id),
  };
}

export function apiCaseResource(db, session, id, resource) {
  const c = apiCase(db, session, id);
  if (!c) return null;
  const resources = {
    documents: c.documents,
    matches: c.matches,
    reviews: c.reviews,
    estimates: c.estimates,
    services: c.services,
    tasks: c.tasks,
    approvals: c.approvals,
    audit: c.audit,
    messages: db.prepare(`SELECT * FROM message WHERE case_id=? ORDER BY created DESC`).all(id),
  };
  return Object.hasOwn(resources, resource) ? resources[resource] : undefined;
}

export function apiAgentRuns(db, session) {
  const sql = `SELECT ar.*,ad.name agent_name,o.name organization_name
    FROM agent_run ar JOIN agent_definition ad ON ad.id=ar.agent_id
    LEFT JOIN organization o ON o.id=ar.organization_id`;
  if (session.role === "platform_admin" || session.role === "read_only")
    return db.prepare(`${sql} ORDER BY ar.created DESC`).all();
  return db.prepare(`${sql} WHERE ar.organization_id=? ORDER BY ar.created DESC`).all(session.organization_id);
}

export function apiAudit(db, session) {
  if (session.role === "platform_admin" || session.role === "read_only")
    return db.prepare(`SELECT * FROM audit_event ORDER BY created DESC LIMIT 250`).all();
  return db.prepare(`SELECT * FROM audit_event WHERE organization_id=? ORDER BY created DESC LIMIT 250`).all(session.organization_id);
}

export function apiIntegrations(db) {
  return readinessReport(db).integrations;
}

export function apiServiceRequests(db, session) {
  const requests = db.prepare(`SELECT sr.*,v.organization_id vendor_organization_id,v.service_categories
    FROM service_request sr LEFT JOIN vendor v ON v.id=sr.vendor_id ORDER BY sr.created DESC`).all();
  if (session.role === "platform_admin" || session.role === "read_only") return requests;
  if (session.role.startsWith("vendor"))
    return requests.filter((r) => r.vendor_organization_id === session.organization_id);
  const caseIds = new Set(apiCases(db, session).map((c) => c.id));
  return requests.filter((r) => caseIds.has(r.case_id));
}

export function apiHospital(db, session) {
  const cases = apiCases(db, session);
  const tasks = db.prepare(`SELECT * FROM ops_task WHERE organization_id=? OR ?='platform_admin' ORDER BY due_date`).all(session.organization_id, session.role);
  const est = db.prepare(`SELECT count(*) c, COALESCE(sum(indicative_total),0) v FROM estimate`).get();
  return { cases, tasks, pipeline_value: est.v, estimates: est.c };
}

export function renderCases(db, session) {
  const cases = apiCases(db, session);
  return shell("Cases", `<div class="head"><div><div class="eyebrow">Patient case workspace</div><h1>Cases</h1><p class="lede">Synthetic demo patients only. Clinical suitability remains owned by hospital reviewers.</p></div></div>
  <table><thead><tr><th>Case</th><th>Market</th><th>Treatment</th><th>Stage</th><th>Consent</th><th>Next action</th></tr></thead><tbody>${cases.map((c) => `<tr><td><a href="/cases/${c.id}">${esc(c.synthetic_name)}</a><br><span class="label">${esc(c.synthetic_identifier)}</span></td><td>${esc(c.source_market)}</td><td>${esc(c.treatment_request)}</td><td>${badge(c.current_stage)}</td><td>${badge(c.consent_status)}</td><td>${esc(c.next_best_action)}</td></tr>`).join("")}</tbody></table>`);
}

export function renderCase(db, session, id) {
  const c = apiCase(db, session, id);
  if (!c) return shell("Not found", `<h1>Case not found</h1><p class="lede">This role cannot access that case.</p>`);
  return shell(c.synthetic_name, `<div class="head"><div><div class="eyebrow">${esc(c.synthetic_identifier)}</div><h1>${esc(c.synthetic_name)}</h1><p class="lede">${esc(c.treatment_request)}. ${esc(c.warnings)}</p></div><div>${badge(c.current_stage)} ${badge(c.consent_status)}</div></div>
  <div class="tabs">${["Overview","Documents","Hospital Matches","Estimates","Messages","Tasks","Travel Support","Vendors","Timeline","Compliance","Audit Log"].map((t)=>`<span class="tab">${t}</span>`).join("")}</div>
  <section class="split"><div class="panel"><h2>Overview</h2><table><tbody>${rows([c],[["source_market",(x)=>`Source market: ${x.source_market}`],["preferred_language",(x)=>`Language: ${x.preferred_language}`],["urgency",(x)=>`Urgency: ${x.urgency}`],["budget_band",(x)=>`Budget: ${x.budget_band}`],["travel_window",(x)=>`Travel window: ${x.travel_window}`],["assigned_coordinator",(x)=>`Coordinator: ${x.assigned_coordinator}`],["next_best_action",(x)=>`Next best operational action: ${x.next_best_action}`],["blockers",(x)=>`Blockers: ${x.blockers || "none"}`]] )}</tbody></table></div>
  <div class="panel"><h2>Compliance</h2><div class="callout">${esc(c.blockers || "No blocking compliance issue on this synthetic path.")}</div><p class="label">AI may classify documents and prepare operational checklists. It must not diagnose, interpret scans, choose treatment, promise outcomes, or declare fitness to fly.</p></div></section>
  <h2>Documents</h2><table><thead><tr><th>Type</th><th>Status</th><th>Watermark</th></tr></thead><tbody>${rows(c.documents,[["doc_type"],["status",(r)=>badge(r.status)],["demo_watermark"]])}</tbody></table>
  <h2>Hospital Matches</h2><table><thead><tr><th>Hospital</th><th>Operational Fit</th><th>Clinical Acceptance</th><th>Commercial Disclosure</th><th>Confidence</th></tr></thead><tbody>${rows(c.matches,[["hospital_name"],["operational_fit"],["clinical_acceptance"],["commercial_disclosure"],["confidence",(r)=>badge(r.confidence)]])}</tbody></table>
  <h2>Estimates</h2><table><thead><tr><th>Procedure</th><th>Status</th><th>Total</th><th>Caveats</th></tr></thead><tbody>${rows(c.estimates,[["procedure"],["status",(r)=>badge(r.status)],["indicative_total",(r)=>`${r.currency} ${r.indicative_total}`],["caveats"]])}</tbody></table>
  <h2>Vendors & Travel Support</h2><table><thead><tr><th>Category</th><th>Status</th><th>Mock quote</th><th>Owner</th></tr></thead><tbody>${rows(c.services,[["category"],["status",(r)=>badge(r.status)],["mock_quote"],["owner"]])}</tbody></table>
  <h2>Audit Log</h2><table><thead><tr><th>When</th><th>Action</th><th>Outcome</th><th>Detail</th></tr></thead><tbody>${rows(c.audit,[["created"],["action"],["outcome",(r)=>badge(r.outcome)],["detail"]])}</tbody></table>`);
}

export function renderHospital(db, session) {
  const h = apiHospital(db, session);
  const byStage = Object.entries(h.cases.reduce((a,c)=>(a[c.current_stage]=(a[c.current_stage]||0)+1,a),{}));
  return shell("Hospital Command Centre", `<div class="head"><div><div class="eyebrow">Hospital Command Centre</div><h1>International patient operations</h1><p class="lede">Inbox, SLA, estimates and synthetic revenue for routed demo cases. Hospital clinical reviewers own clinical status.</p></div></div>
  <div class="grid"><div class="card"><div class="k">${h.cases.length}</div><div class="label">routed cases</div></div><div class="card"><div class="k">${h.tasks.filter(t=>t.status!=="Completed").length}</div><div class="label">open tasks</div></div><div class="card"><div class="k">USD ${Math.round(h.pipeline_value).toLocaleString()}</div><div class="label">synthetic estimate value</div></div><div class="card"><div class="k">24h</div><div class="label">demo response SLA</div></div></div>
  <h2>International Patient Inbox</h2><table><thead><tr><th>Case</th><th>Stage</th><th>Missing / next</th><th>Agent</th></tr></thead><tbody>${h.cases.map(c=>`<tr><td><a href="/cases/${c.id}">${esc(c.synthetic_name)}</a></td><td>${badge(c.current_stage)}</td><td>${esc(c.next_best_action)}</td><td>${esc(c.source_agent_org_id)}</td></tr>`).join("")}</tbody></table>
  <h2>Pipeline</h2><div class="grid">${byStage.map(([s,n])=>`<div class="card"><h3>${esc(s)}</h3><div class="k">${n}</div></div>`).join("")}</div>
  <h2>Hospital Task Board</h2><table><thead><tr><th>Owner</th><th>Priority</th><th>Due</th><th>Case</th><th>Status</th><th>Next action</th></tr></thead><tbody>${rows(h.tasks,[["owner"],["priority",(r)=>badge(r.priority)],["due_date"],["case_id"],["status",(r)=>badge(r.status)],["next_action"]])}</tbody></table>`);
}

export function renderAgent(db, session) {
  const cases = apiCases(db, session.role.startsWith("agent") ? session : { ...session, role: "platform_admin" });
  const commissions = db.prepare(`SELECT * FROM commission`).all();
  return shell("Agent Portal", `<div class="head"><div><div class="eyebrow">Agent and Facilitator Portal</div><h1>Lead intake and case tracking</h1><p class="lede">Add single leads, validate CSV imports, inspect API ingestion, track missing information, compare indicative estimates and commission status.</p></div><div class="actions"><a class="btn" href="/api/lead/ingest">API endpoint</a><span class="btn">Demo token: demo-ingest-trudoc</span></div></div>
  <section class="split"><div class="panel"><h2>Add a Lead</h2><p class="label">Demo form is intentionally dry-run. Server ingestion uses <code>POST /api/lead/ingest</code> and rejects malformed rows instead of silently accepting them.</p><div class="callout">CSV import requirements: preview, column mapping, consent status, category/market mapping, duplicate detection and rejected-row report.</div></div>
  <div class="panel"><h2>API Ingestion</h2><pre>POST /api/lead/ingest
X-Ingest-Token: demo-ingest-trudoc
{"source":"trudoc-demo","leads":[{"country":"NG","treatment":"cardiac bypass","consent":true}]}</pre></div></section>
  <h2>Lead Status</h2><table><thead><tr><th>Case</th><th>Country</th><th>Category</th><th>Stage</th><th>Consent</th><th>Next</th></tr></thead><tbody>${cases.map(c=>`<tr><td><a href="/cases/${c.id}">${esc(c.synthetic_name)}</a></td><td>${esc(c.source_market)}</td><td>${esc(c.treatment_category)}</td><td>${badge(c.current_stage)}</td><td>${badge(c.consent_status)}</td><td>${esc(c.next_best_action)}</td></tr>`).join("")}</tbody></table>
  <h2>Commission Forecast</h2><table><thead><tr><th>Case</th><th>Expected</th><th>Status</th><th>Payout</th><th>Disclosure</th></tr></thead><tbody>${rows(commissions,[["case_id"],["expected_amount",(r)=>`${r.currency} ${r.expected_amount}`],["status",(r)=>badge(r.status)],["payout_status"],["commercial_disclosure"]])}</tbody></table>`);
}

export function renderVendors(db) {
  const vendors = db.prepare(`SELECT * FROM vendor ORDER BY service_categories`).all();
  const reqs = db.prepare(`SELECT sr.*, v.service_categories FROM service_request sr LEFT JOIN vendor v ON v.id=sr.vendor_id ORDER BY sr.created`).all();
  return shell("Vendor Coordination", `<div class="head"><div><div class="eyebrow">Vendor Coordination Network</div><h1>Mock non-clinical service network</h1><p class="lede">Interpreter, airport transfer, accommodation and other coordination partners. Demo mode never performs real bookings.</p></div></div>
  <h2>Vendors</h2><table><thead><tr><th>Service</th><th>Cities</th><th>Languages</th><th>Availability</th><th>Indicative price</th><th>SLA</th><th>Status</th><th>Rating</th></tr></thead><tbody>${rows(vendors,[["service_categories"],["cities"],["languages"],["availability"],["indicative_price"],["sla"],["verification_status",(r)=>badge(r.verification_status)],["rating"]])}</tbody></table>
  <h2>Service Requests</h2><table><thead><tr><th>Case</th><th>Category</th><th>Status</th><th>Mock quote</th><th>Owner</th><th>Audit</th></tr></thead><tbody>${rows(reqs,[["case_id"],["category"],["status",(r)=>badge(r.status)],["mock_quote"],["owner"],["audit_note"]])}</tbody></table>`);
}

export function renderOsAgents(db) {
  const runs = db.prepare(`SELECT ar.*, ad.name agent_name, o.name org_name FROM agent_run ar JOIN agent_definition ad ON ad.id=ar.agent_id LEFT JOIN organization o ON o.id=ar.organization_id ORDER BY ar.created DESC`).all();
  return shell("AI Agent Activity Centre", `<div class="head"><div><div class="eyebrow">AI Agent Activity Centre</div><h1>Operational software workers</h1><p class="lede">Deterministic demo agents require no LLM key. Human approval is required for consequential actions.</p></div></div>
  <table><thead><tr><th>Agent</th><th>Organization</th><th>Trigger</th><th>Output</th><th>Provider</th><th>Cost</th><th>Confidence</th><th>Status</th><th>Correlation</th></tr></thead><tbody>${rows(runs,[["agent_name"],["org_name"],["trigger"],["output_summary"],["provider"],["estimated_cost"],["confidence"],["status",(r)=>badge(r.status)],["correlation_id"]])}</tbody></table>`);
}

export function renderTasks(db) {
  const tasks = db.prepare(`SELECT * FROM ops_task ORDER BY due_date, priority`).all();
  return shell("Tasks", `<div class="head"><div><div class="eyebrow">Operations</div><h1>Task board</h1><p class="lede">Every task has owner, priority, due date, case, status, next action and audit history.</p></div></div>
  <table><thead><tr><th>Owner</th><th>Priority</th><th>Due</th><th>Case</th><th>Status</th><th>Title</th><th>Next action</th><th>Audit</th></tr></thead><tbody>${rows(tasks,[["owner"],["priority",(r)=>badge(r.priority)],["due_date"],["case_id"],["status",(r)=>badge(r.status)],["title"],["next_action"],["audit_history"]])}</tbody></table>`);
}

export function renderIntegrations(db) {
  const r = readinessReport(db);
  return shell("Integrations", `<div class="head"><div><div class="eyebrow">Readiness</div><h1>Integration readiness</h1><p class="lede">External adapters are mocked, disabled or configured explicitly. Outbound actions are not armed in demo mode.</p></div><div>${badge(r.status)}</div></div>
  <div class="grid"><div class="card"><div class="k">${esc(r.app_mode)}</div><div class="label">APP_MODE</div></div><div class="card"><div class="k">${esc(r.external_actions)}</div><div class="label">external actions</div></div><div class="card"><div class="k">${r.missing.length}</div><div class="label">missing production vars</div></div></div>
  <h2>Adapters</h2><table><thead><tr><th>Provider</th><th>Status</th><th>Required variables</th><th>Outbound armed</th><th>Human approval</th><th>Last error</th></tr></thead><tbody>${rows(r.integrations,[["provider"],["status",(x)=>badge(x.status)],["required_variables"],["outbound_armed",(x)=>x.outbound_armed?"yes":"no"],["human_approval_required",(x)=>x.human_approval_required?"yes":"no"],["last_error"]])}</tbody></table>`);
}

export function renderAudit(db) {
  const audit = db.prepare(`SELECT * FROM audit_event ORDER BY created DESC LIMIT 100`).all();
  return shell("Audit", `<div class="head"><div><div class="eyebrow">Append-only audit view</div><h1>Audit log</h1><p class="lede">Material demo actions: login, case access, case routing, estimate release, vendor assignment, blocked communications and integration changes.</p></div></div>
  <table><thead><tr><th>When</th><th>Actor</th><th>Org</th><th>Action</th><th>Subject</th><th>Outcome</th><th>Request</th><th>Detail</th></tr></thead><tbody>${rows(audit,[["created"],["actor_user_id"],["organization_id"],["action"],["subject_id"],["outcome",(r)=>badge(r.outcome)],["request_id"],["detail"]])}</tbody></table>`);
}

export function metrics(db) {
  const byStage = db.prepare(`SELECT current_stage stage,count(*) n FROM patient_case GROUP BY current_stage`).all();
  return {
    requests: Number(db.prepare(`SELECT count(*) c FROM audit_event`).get().c),
    errors: Number(db.prepare(`SELECT count(*) c FROM audit_event WHERE outcome='error'`).get().c),
    agent_runs: Number(db.prepare(`SELECT count(*) c FROM agent_run`).get().c),
    agent_failures: Number(db.prepare(`SELECT count(*) c FROM agent_run WHERE status='Failed'`).get().c),
    pending_approvals: Number(db.prepare(`SELECT count(*) c FROM approval WHERE status NOT IN ('Approved','Blocked')`).get().c),
    cases_by_stage: byStage,
    overdue_tasks: Number(db.prepare(`SELECT count(*) c FROM ops_task WHERE due_date < date('now') AND status NOT IN ('Completed','Cancelled')`).get().c),
    database_health: "READY",
    integration_status: db.prepare(`SELECT provider,status FROM integration_connection ORDER BY provider`).all(),
  };
}

export function apiApprovals(db, session) {
  const rows = session.role === "platform_admin" || session.role === "read_only"
    ? db.prepare(`SELECT * FROM approval ORDER BY created DESC`).all()
    : db.prepare(`SELECT * FROM approval WHERE organization_id=? ORDER BY created DESC`).all(session.organization_id);
  return rows;
}

export function decideApproval(db, session, id, decision) {
  if (session.role === "read_only") return { ok: false, error: { code: "READ_ONLY", message: "Read-only users cannot change approvals.", details: {} } };
  const row = db.prepare(`SELECT * FROM approval WHERE id=?`).get(id);
  if (!row) return { ok: false, error: { code: "NOT_FOUND", message: "Approval not found.", details: {} } };
  if (row.status === "Blocked") return { ok: false, error: { code: "COMPLIANCE_BLOCKED", message: row.blocking_reasons || "Approval is blocked by compliance.", details: {} } };
  if (row.organization_id !== session.organization_id && session.role !== "platform_admin") {
    return { ok: false, error: { code: "FORBIDDEN", message: "Approval belongs to another organization.", details: {} } };
  }
  const status = decision === "reject" ? "Rejected" : "Approved";
  db.prepare(`UPDATE approval SET status=?, reviewer=?, decided_at=datetime('now'), after_state=? WHERE id=?`)
    .run(status, session.user?.email || "demo-user", status, id);
  db.prepare(`INSERT INTO audit_event (id,actor_user_id,organization_id,action,subject_type,subject_id,outcome,request_id,detail)
    VALUES (lower(hex(randomblob(8))),?,?,?,?,?,?,?,?)`)
    .run(session.user?.id || null, session.organization_id, `approval_${decision}`, row.type, row.subject_ref, status.toLowerCase(), "api-approval", `${status} via API`);
  return { ok: true, approval: db.prepare(`SELECT * FROM approval WHERE id=?`).get(id) };
}

export function apiTasks(db, session) {
  if (session.role === "platform_admin" || session.role === "read_only") return db.prepare(`SELECT * FROM ops_task ORDER BY due_date, priority`).all();
  return db.prepare(`SELECT * FROM ops_task WHERE organization_id=? ORDER BY due_date, priority`).all(session.organization_id);
}

export function updateTask(db, session, id, patch = {}) {
  if (session.role === "read_only") return { ok: false, error: { code: "READ_ONLY", message: "Read-only users cannot update tasks.", details: {} } };
  const task = db.prepare(`SELECT * FROM ops_task WHERE id=?`).get(id);
  if (!task) return { ok: false, error: { code: "NOT_FOUND", message: "Task not found.", details: {} } };
  if (session.role !== "platform_admin" && task.organization_id !== session.organization_id) return { ok: false, error: { code: "FORBIDDEN", message: "Task belongs to another organization.", details: {} } };
  const status = String(patch.status || task.status).slice(0, 60);
  const next = String(patch.next_action || task.next_action || "").slice(0, 300);
  db.prepare(`UPDATE ops_task SET status=?, next_action=?, audit_history=? WHERE id=?`).run(status, next, `${task.audit_history || ""}; updated by ${session.user?.email || "demo-user"}`, id);
  return { ok: true, task: db.prepare(`SELECT * FROM ops_task WHERE id=?`).get(id) };
}

export function apiVendors(db) {
  return {
    vendors: db.prepare(`SELECT * FROM vendor ORDER BY service_categories`).all(),
    service_requests: db.prepare(`SELECT sr.*, v.service_categories FROM service_request sr LEFT JOIN vendor v ON v.id=sr.vendor_id ORDER BY sr.created DESC`).all(),
  };
}

export function createServiceRequest(db, session, body = {}) {
  if (session.role === "read_only") return { ok: false, error: { code: "READ_ONLY", message: "Read-only users cannot create service requests.", details: {} } };
  const c = apiCase(db, { ...session, role: session.role === "platform_admin" ? "platform_admin" : session.role }, body.case_id || "case_ibrahim_musa");
  if (!c) return { ok: false, error: { code: "FORBIDDEN", message: "Case not found or not authorized.", details: {} } };
  const vendor = db.prepare(`SELECT * FROM vendor WHERE id=?`).get(body.vendor_id || "vendor_interpreter");
  if (!vendor) return { ok: false, error: { code: "NOT_FOUND", message: "Vendor not found.", details: {} } };
  const id = `sr_${Date.now().toString(36)}`;
  db.prepare(`INSERT INTO service_request (id,case_id,vendor_id,category,status,requested_for,mock_quote,owner,due_date,audit_note)
    VALUES (?,?,?,?,?,?,?,?,date('now','+2 days'),?)`).run(id, c.id, vendor.id, body.category || vendor.service_categories, "Requested", body.requested_for || "Demo coordination", "Mock quote pending", session.user?.name || "Demo user", "Created via API in demo mode; no real booking");
  return { ok: true, service_request: db.prepare(`SELECT * FROM service_request WHERE id=?`).get(id) };
}
