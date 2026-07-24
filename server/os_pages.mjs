import { readinessReport } from "../data-core/os_core.mjs";
import { appShell, icon } from "./canopus_ui.mjs";

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
class SafeHtml extends String {}
const rows = (items, cols) => items.map((r) => `<tr>${cols.map(([k, f]) => {
  const value = f ? f(r) : r[k];
  return `<td>${value instanceof SafeHtml ? value : esc(value)}</td>`;
}).join("")}</tr>`).join("");
const badge = (s) => new SafeHtml(`<span class="badge ${String(s || "").toLowerCase().replace(/[^a-z0-9]+/g,"-")}">${esc(s)}</span>`);

function shell(title, inner, options = {}) {
  return appShell(title, inner, options);
}

function viewOptions(active, session, metrics) {
  return {
    active,
    userName: session?.user?.name || "Asha Mehta",
    userRole: session?.role ? session.role.replace(/_/g, " ") : "Platform operations",
    metrics,
  };
}

export function getSession(db, req) {
  const email = req.headers["x-demo-user"] || "admin@canopuscare.demo";
  const user = db.prepare(`SELECT * FROM app_user WHERE email=? AND active=1`).get(email) || db.prepare(`SELECT * FROM app_user WHERE email='admin@canopuscare.demo'`).get();
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

export const SERVICE_REQUEST_TRANSITIONS = Object.freeze({
  Requested: ["Accepted", "Declined"],
  Accepted: ["Quoted", "Declined"],
  Quoted: ["Approved", "Declined"],
  Approved: ["Scheduled", "Cancelled"],
  Scheduled: ["Completed", "Cancelled"],
  Completed: [],
  Declined: [],
  Cancelled: [],
});

function serviceRequestError(code, message, details = {}) {
  return { ok: false, error: { code, message, details } };
}

function parseQuote(patch, request) {
  const currency = String(patch.quote_currency ?? request.quote_currency ?? "").trim().toUpperCase();
  const rawAmount = patch.quote_amount ?? request.quote_amount;
  const amount = rawAmount === "" || rawAmount == null ? null : Number(rawAmount);
  const expiresAt = String(patch.quote_expires_at ?? request.quote_expires_at ?? "").trim();
  if (!/^[A-Z]{3}$/.test(currency)) return serviceRequestError("INVALID_QUOTE", "Quote currency must be a three-letter ISO code.", { field: "quote_currency" });
  if (!Number.isFinite(amount) || amount <= 0) return serviceRequestError("INVALID_QUOTE", "Quote amount must be greater than zero.", { field: "quote_amount" });
  if (!expiresAt || Number.isNaN(Date.parse(expiresAt))) return serviceRequestError("INVALID_QUOTE", "Quote expiry must be a valid date and time.", { field: "quote_expires_at" });
  return { ok: true, currency, amount, expiresAt };
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
  <table><thead><tr><th>Case</th><th>Market</th><th>Treatment</th><th>Stage</th><th>Consent</th><th>Next action</th></tr></thead><tbody>${cases.map((c) => `<tr><td><a href="/cases/${c.id}">${esc(c.synthetic_name)}</a><br><span class="label">${esc(c.synthetic_identifier)}</span></td><td>${esc(c.source_market)}</td><td>${esc(c.treatment_request)}</td><td>${badge(c.current_stage)}</td><td>${badge(c.consent_status)}</td><td>${esc(c.next_best_action)}</td></tr>`).join("")}</tbody></table>`, viewOptions("cases", session, { cases: cases.length, agents: 16, actions: 0 }));
}

export function renderCase(db, session, id) {
  const c = apiCase(db, session, id);
  if (!c) return shell("Not found", `<h1>Case not found</h1><p class="lede">This role cannot access that case.</p>`, viewOptions("cases", session));
  return shell(c.synthetic_name, `<div class="head"><div><div class="eyebrow">${esc(c.synthetic_identifier)}</div><h1>${esc(c.synthetic_name)}</h1><p class="lede">${esc(c.treatment_request)}. ${esc(c.warnings)}</p></div><div>${badge(c.current_stage)} ${badge(c.consent_status)}</div></div>
  <div class="tabs">${["Overview","Documents","Hospital Matches","Estimates","Messages","Tasks","Travel Support","Vendors","Timeline","Compliance","Audit Log"].map((t)=>`<span class="tab">${t}</span>`).join("")}</div>
  <section class="split"><div class="panel"><h2>Overview</h2><table><tbody>${rows([c],[["source_market",(x)=>`Source market: ${x.source_market}`],["preferred_language",(x)=>`Language: ${x.preferred_language}`],["urgency",(x)=>`Urgency: ${x.urgency}`],["budget_band",(x)=>`Budget: ${x.budget_band}`],["travel_window",(x)=>`Travel window: ${x.travel_window}`],["assigned_coordinator",(x)=>`Coordinator: ${x.assigned_coordinator}`],["next_best_action",(x)=>`Next best operational action: ${x.next_best_action}`],["blockers",(x)=>`Blockers: ${x.blockers || "none"}`]] )}</tbody></table></div>
  <div class="panel"><h2>Compliance</h2><div class="callout">${esc(c.blockers || "No blocking compliance issue on this synthetic path.")}</div><p class="label">AI may classify documents and prepare operational checklists. It must not diagnose, interpret scans, choose treatment, promise outcomes, or declare fitness to fly.</p></div></section>
  <h2>Documents</h2><table><thead><tr><th>Type</th><th>Status</th><th>Watermark</th></tr></thead><tbody>${rows(c.documents,[["doc_type"],["status",(r)=>badge(r.status)],["demo_watermark"]])}</tbody></table>
  <h2>Hospital Matches</h2><table><thead><tr><th>Hospital</th><th>Operational Fit</th><th>Clinical Acceptance</th><th>Commercial Disclosure</th><th>Confidence</th></tr></thead><tbody>${rows(c.matches,[["hospital_name"],["operational_fit"],["clinical_acceptance"],["commercial_disclosure"],["confidence",(r)=>badge(r.confidence)]])}</tbody></table>
  <h2>Estimates</h2><table><thead><tr><th>Procedure</th><th>Status</th><th>Total</th><th>Caveats</th></tr></thead><tbody>${rows(c.estimates,[["procedure"],["status",(r)=>badge(r.status)],["indicative_total",(r)=>`${r.currency} ${r.indicative_total}`],["caveats"]])}</tbody></table>
  <h2>Vendors & Travel Support</h2><table><thead><tr><th>Category</th><th>Status</th><th>Mock quote</th><th>Owner</th></tr></thead><tbody>${rows(c.services,[["category"],["status",(r)=>badge(r.status)],["mock_quote"],["owner"]])}</tbody></table>
  <h2>Audit Log</h2><table><thead><tr><th>When</th><th>Action</th><th>Outcome</th><th>Detail</th></tr></thead><tbody>${rows(c.audit,[["created"],["action"],["outcome",(r)=>badge(r.outcome)],["detail"]])}</tbody></table>`, viewOptions("cases", session, { cases: 1, agents: 16, actions: 0 }));
}

export function renderHospital(db, session) {
  const h = apiHospital(db, session);
  const byStage = Object.entries(h.cases.reduce((a,c)=>(a[c.current_stage]=(a[c.current_stage]||0)+1,a),{}));
  return shell("Hospital Command Centre", `<div class="head"><div><div class="eyebrow">Hospital Command Centre</div><h1>International patient operations</h1><p class="lede">Inbox, SLA, estimates and synthetic revenue for routed demo cases. Hospital clinical reviewers own clinical status.</p></div></div>
  <div class="metric-row"><div class="metric-tile"><div class="k">${h.cases.length}</div><div class="label">routed cases</div></div><div class="metric-tile"><div class="k">${h.tasks.filter(t=>t.status!=="Completed").length}</div><div class="label">open tasks</div></div><div class="metric-tile"><div class="k">USD ${Math.round(h.pipeline_value).toLocaleString()}</div><div class="label">synthetic estimate value</div></div><div class="metric-tile"><div class="k">24h</div><div class="label">demo response SLA</div></div></div>
  <h2>International Patient Inbox</h2><table><thead><tr><th>Case</th><th>Stage</th><th>Missing / next</th><th>Agent</th></tr></thead><tbody>${h.cases.map(c=>`<tr><td><a href="/cases/${c.id}">${esc(c.synthetic_name)}</a></td><td>${badge(c.current_stage)}</td><td>${esc(c.next_best_action)}</td><td>${esc(c.source_agent_org_id)}</td></tr>`).join("")}</tbody></table>
  <h2>Pipeline</h2><div class="grid">${byStage.map(([s,n])=>`<div class="card"><h3>${esc(s)}</h3><div class="k">${n}</div></div>`).join("")}</div>
  <h2>Hospital Task Board</h2><table><thead><tr><th>Owner</th><th>Priority</th><th>Due</th><th>Case</th><th>Status</th><th>Next action</th></tr></thead><tbody>${rows(h.tasks,[["owner"],["priority",(r)=>badge(r.priority)],["due_date"],["case_id"],["status",(r)=>badge(r.status)],["next_action"]])}</tbody></table>`, viewOptions("hospital", session, { cases: h.cases.length, agents: 4, actions: 0 }));
}

export function renderAgent(db, session) {
  const cases = apiCases(db, session.role.startsWith("agent") ? session : { ...session, role: "platform_admin" });
  const commissions = db.prepare(`SELECT * FROM commission`).all();
  return shell("Agent Portal", `<div class="head"><div><div class="eyebrow">Agent and Facilitator Portal</div><h1>Lead intake and case tracking</h1><p class="lede">Add single leads, validate CSV imports, inspect API ingestion, track missing information, compare indicative estimates and commission status.</p></div><div class="actions"><a class="btn" href="/api/lead/ingest">${icon("Code2", 14)} API endpoint</a><span class="btn">${icon("KeyRound", 14)} Demo token</span></div></div>
  <section class="split"><div class="panel"><h2>CSV Lead Import</h2>
  <textarea id="csv-input" aria-label="CSV lead rows">country,treatment,phone,consent,urgency,budget
Nigeria,cardiac bypass,+2345550199,true,soon,USD 8000-15000
Neverland,unknown procedure,+1000,false,planning,unknown</textarea>
  <div class="field-grid">
    <div class="field"><label for="map-country">Country column</label><input id="map-country" value="country"></div>
    <div class="field"><label for="map-treatment">Treatment column</label><input id="map-treatment" value="treatment"></div>
    <div class="field"><label for="map-contact">Contact column</label><input id="map-contact" value="phone"></div>
    <div class="field"><label for="map-consent">Consent column</label><input id="map-consent" value="consent"></div>
    <div class="field"><label for="map-urgency">Urgency column</label><input id="map-urgency" value="urgency"></div>
    <div class="field"><label for="map-budget">Budget column</label><input id="map-budget" value="budget"></div>
  </div>
  <div class="actions"><button class="btn primary" id="preview-csv">${icon("ScanSearch", 14)} Preview</button><button class="btn" id="import-csv" disabled>${icon("FileUp", 14)} Import accepted rows</button></div>
  <div class="result" id="csv-result" aria-live="polite"></div></div>
  <div class="panel"><h2>API Ingestion</h2><pre>POST /api/lead/ingest
X-Ingest-Token: demo-ingest-trudoc
{"source":"trudoc-demo","leads":[{"country":"NG","treatment":"cardiac bypass","consent":true}]}</pre></div></section>
  <h2>Lead Status</h2><table><thead><tr><th>Case</th><th>Country</th><th>Category</th><th>Stage</th><th>Consent</th><th>Next</th></tr></thead><tbody>${cases.map(c=>`<tr><td><a href="/cases/${c.id}">${esc(c.synthetic_name)}</a></td><td>${esc(c.source_market)}</td><td>${esc(c.treatment_category)}</td><td>${badge(c.current_stage)}</td><td>${badge(c.consent_status)}</td><td>${esc(c.next_best_action)}</td></tr>`).join("")}</tbody></table>
  <h2>Commission Forecast</h2><table><thead><tr><th>Case</th><th>Expected</th><th>Status</th><th>Payout</th><th>Disclosure</th></tr></thead><tbody>${rows(commissions,[["case_id"],["expected_amount",(r)=>`${r.currency} ${r.expected_amount}`],["status",(r)=>badge(r.status)],["payout_status"],["commercial_disclosure"]])}</tbody></table>
  <script>
  const csvButton = document.querySelector("#preview-csv");
  const importButton = document.querySelector("#import-csv");
  const result = document.querySelector("#csv-result");
  const payload = () => ({
    source: "trudoc-demo",
    csv: document.querySelector("#csv-input").value,
    mapping: {
      country: document.querySelector("#map-country").value,
      treatment: document.querySelector("#map-treatment").value,
      contact: document.querySelector("#map-contact").value,
      consent: document.querySelector("#map-consent").value,
      urgency: document.querySelector("#map-urgency").value,
      budget_band: document.querySelector("#map-budget").value
    }
  });
  const request = async (path) => {
    const response = await fetch(path, { method: "POST", headers: { "content-type": "application/json", "x-ingest-token": "demo-ingest-trudoc" }, body: JSON.stringify(payload()) });
    return response.json();
  };
  const showPreview = (data) => {
    if (!data.ok) { result.textContent = data.error || "Preview failed"; importButton.disabled = true; return; }
    const summary = document.createElement("p");
    summary.className = "callout";
    summary.textContent = data.summary.received + " rows: " + data.summary.ready + " ready, " + data.summary.held_no_consent + " held for consent, " + data.summary.duplicates + " duplicates, " + data.summary.rejected + " rejected.";
    const table = document.createElement("table");
    table.innerHTML = "<thead><tr><th>Row</th><th>Masked contact</th><th>Market</th><th>Category</th><th>Consent</th><th>Status</th><th>Reason</th></tr></thead>";
    const body = document.createElement("tbody");
    for (const row of data.rows) {
      const tr = document.createElement("tr");
      for (const value of [row.row, row.ref, row.market, row.category, row.consent, row.status, row.reasons.join("; ")]) {
        const td = document.createElement("td"); td.textContent = value || "-"; tr.appendChild(td);
      }
      body.appendChild(tr);
    }
    table.appendChild(body); result.replaceChildren(summary, table); importButton.disabled = false;
  };
  csvButton.addEventListener("click", async () => { csvButton.disabled = true; showPreview(await request("/api/lead/preview-csv")); csvButton.disabled = false; });
  importButton.addEventListener("click", async () => {
    importButton.disabled = true;
    const data = await request("/api/lead/import-csv");
    result.textContent = data.ok ? data.accepted + " accepted, " + data.deduped + " duplicates, " + data.rejected.length + " rejected." : data.error;
  });
  </script>`, viewOptions("agent", session, { cases: cases.length, agents: 3, actions: 0 }));
}

export function renderVendors(db, session) {
  const vendors = db.prepare(`SELECT * FROM vendor ORDER BY service_categories`).all();
  const reqs = apiServiceRequests(db, session || { role: "read_only", organization_id: "org_platform" });
  const active = reqs.filter((r) => !["Completed", "Declined", "Cancelled"].includes(r.status)).length;
  const canEdit = session && (session.role === "platform_admin" || session.role.startsWith("vendor"));
  const requestRows = reqs.map((r) => {
    const allowed = [r.status, ...(SERVICE_REQUEST_TRANSITIONS[r.status] || [])];
    const controls = canEdit ? `<div class="request-editor">
      <select aria-label="Status for ${esc(r.id)}" data-status="${esc(r.id)}">${allowed.map((status) => `<option${status === r.status ? " selected" : ""}>${status}</option>`).join("")}</select>
      <input aria-label="Currency for ${esc(r.id)}" data-currency="${esc(r.id)}" value="${esc(r.quote_currency || "")}" placeholder="USD" maxlength="3">
      <input aria-label="Amount for ${esc(r.id)}" data-amount="${esc(r.id)}" value="${esc(r.quote_amount || "")}" placeholder="Amount" type="number" min="0" step="0.01">
      <input aria-label="Quote expiry for ${esc(r.id)}" data-expiry="${esc(r.id)}" value="${esc(String(r.quote_expires_at || "").replace(" ", "T").slice(0, 16))}" type="datetime-local">
      <input aria-label="Cancellation reason for ${esc(r.id)}" data-cancel="${esc(r.id)}" value="${esc(r.cancellation_reason || "")}" placeholder="Reason if cancelling">
      <button class="icon-btn" data-save="${esc(r.id)}" title="Save request" aria-label="Save request">${icon("Save", 15)}</button>
    </div>` : esc(r.audit_note);
    return `<tr><td>${esc(r.case_id)}</td><td>${esc(r.category)}</td><td>${badge(r.status)}</td><td><b>${esc(r.quote_currency || "-")} ${esc(r.quote_amount || "")}</b><br><span class="label">Expires ${esc(r.quote_expires_at || "-")}</span></td><td>${esc(r.service_date || "-")}<br><span class="label">${esc(r.service_location || "-")}</span></td><td>${esc(r.owner)}</td><td>${controls}</td></tr>`;
  }).join("");
  return shell("Vendor Coordination", `<div class="head"><div><div class="eyebrow">Vendor Coordination Network</div><h1>Non-clinical service operations</h1><p class="lede">Manage assigned interpreter, airport transfer and accommodation requests. Demo mode records workflow changes without performing real bookings.</p></div><div class="actions">${badge("Demo only")}<a class="btn" href="/docs/VENDOR_DEPLOYMENT_READINESS.md">${icon("ClipboardCheck", 14)} Go-live checklist</a></div></div>
  <div class="metric-row"><div class="metric-tile"><div class="k">${vendors.length}</div><div class="label">verified demo vendors</div></div><div class="metric-tile"><div class="k">${reqs.length}</div><div class="label">assigned requests</div></div><div class="metric-tile"><div class="k">${active}</div><div class="label">active coordination items</div></div><div class="metric-tile"><div class="k">0</div><div class="label">live bookings</div></div></div>
  <h2>Vendors</h2><table><thead><tr><th>Service</th><th>Cities</th><th>Languages</th><th>Availability</th><th>Indicative price</th><th>SLA</th><th>Status</th><th>Rating</th></tr></thead><tbody>${rows(vendors,[["service_categories"],["cities"],["languages"],["availability"],["indicative_price"],["sla"],["verification_status",(r)=>badge(r.verification_status)],["rating"]])}</tbody></table>
  <h2>Service Requests</h2><table><thead><tr><th>Case</th><th>Category</th><th>Status</th><th>Structured quote</th><th>Service</th><th>Owner</th><th>${canEdit ? "Update" : "Audit"}</th></tr></thead><tbody>${requestRows}</tbody></table>
  ${canEdit ? `<script>
  for (const button of document.querySelectorAll("[data-save]")) button.addEventListener("click", async () => {
    const id = button.dataset.save;
    button.disabled = true;
    const response = await fetch("/api/service-requests/" + encodeURIComponent(id), {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-demo-user": "${esc(session.user?.email || "vendor@canopuscare.demo")}" },
      body: JSON.stringify({
        status: document.querySelector("[data-status='" + id + "']").value,
        quote_currency: document.querySelector("[data-currency='" + id + "']").value,
        quote_amount: document.querySelector("[data-amount='" + id + "']").value,
        quote_expires_at: document.querySelector("[data-expiry='" + id + "']").value,
        cancellation_reason: document.querySelector("[data-cancel='" + id + "']").value
      })
    });
    const result = await response.json();
    if (result.ok) location.reload();
    else { button.disabled = false; alert(result.error?.message || "Update failed"); }
  });
  </script>` : ""}`, viewOptions("vendors", session, { cases: new Set(reqs.map((r) => r.case_id)).size, agents: vendors.length, actions: 0 }));
}

export function renderOsAgents(db, session) {
  const runs = db.prepare(`SELECT ar.*, ad.name agent_name, o.name org_name FROM agent_run ar JOIN agent_definition ad ON ad.id=ar.agent_id LEFT JOIN organization o ON o.id=ar.organization_id ORDER BY ar.created DESC`).all();
  return shell("AI Agent Activity Centre", `<div class="head"><div><div class="eyebrow">AI Agent Activity Centre</div><h1>Operational software workers</h1><p class="lede">Deterministic demo agents require no LLM key. Human approval is required for consequential actions.</p></div></div>
  <table><thead><tr><th>Agent</th><th>Organization</th><th>Trigger</th><th>Output</th><th>Provider</th><th>Cost</th><th>Confidence</th><th>Status</th><th>Correlation</th></tr></thead><tbody>${rows(runs,[["agent_name"],["org_name"],["trigger"],["output_summary"],["provider"],["estimated_cost"],["confidence"],["status",(r)=>badge(r.status)],["correlation_id"]])}</tbody></table>`, viewOptions("ai", session, { cases: 2, agents: runs.length, actions: 0 }));
}

export function renderTasks(db, session) {
  const tasks = db.prepare(`SELECT * FROM ops_task ORDER BY due_date, priority`).all();
  return shell("Tasks", `<div class="head"><div><div class="eyebrow">Operations</div><h1>Task board</h1><p class="lede">Every task has owner, priority, due date, case, status, next action and audit history.</p></div></div>
  <table><thead><tr><th>Owner</th><th>Priority</th><th>Due</th><th>Case</th><th>Status</th><th>Title</th><th>Next action</th><th>Audit</th></tr></thead><tbody>${rows(tasks,[["owner"],["priority",(r)=>badge(r.priority)],["due_date"],["case_id"],["status",(r)=>badge(r.status)],["title"],["next_action"],["audit_history"]])}</tbody></table>`, viewOptions("tasks", session, { cases: new Set(tasks.map((t) => t.case_id)).size, agents: tasks.length, actions: 0 }));
}

export function renderIntegrations(db, session) {
  const r = readinessReport(db);
  return shell("Integrations", `<div class="head"><div><div class="eyebrow">Readiness</div><h1>Integration readiness</h1><p class="lede">External adapters are mocked, disabled or configured explicitly. Outbound actions are not armed in demo mode.</p></div><div>${badge(r.status)}</div></div>
  <div class="metric-row"><div class="metric-tile"><div class="k">${esc(r.app_mode)}</div><div class="label">APP_MODE</div></div><div class="metric-tile"><div class="k">${esc(r.external_actions)}</div><div class="label">external actions</div></div><div class="metric-tile"><div class="k">${r.missing.length}</div><div class="label">missing production vars</div></div><div class="metric-tile"><div class="k">${r.integrations.length}</div><div class="label">tracked adapters</div></div></div>
  <h2>Adapters</h2><table><thead><tr><th>Provider</th><th>Status</th><th>Required variables</th><th>Outbound armed</th><th>Human approval</th><th>Last error</th></tr></thead><tbody>${rows(r.integrations,[["provider"],["status",(x)=>badge(x.status)],["required_variables"],["outbound_armed",(x)=>x.outbound_armed?"yes":"no"],["human_approval_required",(x)=>x.human_approval_required?"yes":"no"],["last_error"]])}</tbody></table>`, viewOptions("integrations", session, { cases: 2, agents: r.integrations.length, actions: 0 }));
}

export function renderAudit(db, session) {
  const audit = db.prepare(`SELECT * FROM audit_event ORDER BY created DESC LIMIT 100`).all();
  return shell("Audit", `<div class="head"><div><div class="eyebrow">Append-only audit view</div><h1>Audit log</h1><p class="lede">Material demo actions: login, case access, case routing, estimate release, vendor assignment, blocked communications and integration changes.</p></div></div>
  <table><thead><tr><th>When</th><th>Actor</th><th>Org</th><th>Action</th><th>Subject</th><th>Outcome</th><th>Request</th><th>Detail</th></tr></thead><tbody>${rows(audit,[["created"],["actor_user_id"],["organization_id"],["action"],["subject_id"],["outcome",(r)=>badge(r.outcome)],["request_id"],["detail"]])}</tbody></table>`, viewOptions("audit", session, { cases: 2, agents: audit.length, actions: 0 }));
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
  db.prepare(`INSERT INTO service_request
    (id,case_id,vendor_id,category,status,requested_for,mock_quote,service_date,service_location,capacity_note,owner,due_date,audit_note)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,date('now','+2 days'),?)`).run(
      id, c.id, vendor.id, String(body.category || vendor.service_categories).slice(0, 80), "Requested",
      String(body.requested_for || "Demo coordination").slice(0, 300), "Quote pending",
      String(body.service_date || "").slice(0, 40), String(body.service_location || "").slice(0, 160),
      String(body.capacity_note || "").slice(0, 300), session.user?.name || "Demo user",
      "Created via API in demo mode; no real booking"
    );
  return { ok: true, service_request: db.prepare(`SELECT * FROM service_request WHERE id=?`).get(id) };
}

export function updateServiceRequest(db, session, id, patch = {}) {
  if (session.role === "read_only") return { ok: false, error: { code: "READ_ONLY", message: "Read-only users cannot update service requests.", details: {} } };
  const request = db.prepare(`SELECT sr.*,v.organization_id vendor_organization_id
    FROM service_request sr JOIN vendor v ON v.id=sr.vendor_id WHERE sr.id=?`).get(id);
  if (!request) return { ok: false, error: { code: "NOT_FOUND", message: "Service request not found.", details: {} } };
  const canUpdate = session.role === "platform_admin"
    || (session.role.startsWith("vendor") && request.vendor_organization_id === session.organization_id);
  if (!canUpdate) return { ok: false, error: { code: "FORBIDDEN", message: "This request is assigned to another vendor organization.", details: {} } };
  const statuses = new Set(Object.keys(SERVICE_REQUEST_TRANSITIONS));
  const status = String(patch.status || request.status);
  if (!statuses.has(status)) return serviceRequestError("INVALID_STATUS", "Unsupported service request status.", { allowed: [...statuses] });
  if (status !== request.status && !SERVICE_REQUEST_TRANSITIONS[request.status]?.includes(status))
    return serviceRequestError("INVALID_TRANSITION", `Cannot move a service request from ${request.status} to ${status}.`, { allowed: SERVICE_REQUEST_TRANSITIONS[request.status] || [] });

  let quote = {
    ok: true,
    currency: request.quote_currency,
    amount: request.quote_amount,
    expiresAt: request.quote_expires_at,
  };
  if (status === "Quoted" || ["Approved", "Scheduled", "Completed"].includes(status) || patch.quote_amount != null)
    quote = parseQuote(patch, request);
  if (!quote.ok) return quote;
  if (status === "Approved" && Date.parse(quote.expiresAt) <= Date.now())
    return serviceRequestError("QUOTE_EXPIRED", "Expired quotes cannot be approved. Ask the vendor for a refreshed quote.", { quote_expires_at: quote.expiresAt });

  const cancellationReason = String(patch.cancellation_reason ?? request.cancellation_reason ?? "").trim().slice(0, 300);
  if (status === "Cancelled" && !cancellationReason)
    return serviceRequestError("CANCELLATION_REASON_REQUIRED", "A cancellation reason is required.", { field: "cancellation_reason" });
  const serviceDate = String(patch.service_date ?? request.service_date ?? "").trim().slice(0, 40);
  const serviceLocation = String(patch.service_location ?? request.service_location ?? "").trim().slice(0, 160);
  const capacityNote = String(patch.capacity_note ?? request.capacity_note ?? "").trim().slice(0, 300);
  const cancellationPolicy = String(patch.cancellation_policy ?? request.cancellation_policy ?? "").trim().slice(0, 500);
  const quoteLabel = quote.amount ? `${quote.currency} ${Number(quote.amount).toFixed(2)}` : "Quote pending";
  db.prepare(`UPDATE service_request SET
      status=?,mock_quote=?,quote_currency=?,quote_amount=?,quote_expires_at=?,service_date=?,service_location=?,
      capacity_note=?,cancellation_policy=?,cancellation_reason=?,cancelled_at=CASE WHEN ?='Cancelled' THEN datetime('now') ELSE cancelled_at END,
      updated=datetime('now'),audit_note=?
    WHERE id=?`).run(
      status, quoteLabel, quote.currency || null, quote.amount, quote.expiresAt || null, serviceDate || null,
      serviceLocation || null, capacityNote || null, cancellationPolicy || null, cancellationReason || null, status,
      `${request.audit_note || ""}; ${status} by ${session.user?.email || "demo-user"}`.slice(-600), id
    );
  db.prepare(`INSERT INTO audit_event (id,actor_user_id,organization_id,action,subject_type,subject_id,outcome,request_id,detail)
    VALUES (lower(hex(randomblob(8))),?,?,?,?,?,?,?,?)`)
    .run(session.user?.id || null, session.organization_id, "service_request_update", "service_request", id, "ok", "api-service-request", `${request.status} -> ${status}; ${quoteLabel}`);
  return { ok: true, service_request: db.prepare(`SELECT * FROM service_request WHERE id=?`).get(id) };
}
