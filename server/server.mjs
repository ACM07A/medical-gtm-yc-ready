// CanopusCare local backend — zero external deps. Serves a LIVE operator console that reads the
// data core, a runs/activity feed, and renders content drafts as patient landing pages.
//   node --experimental-sqlite server/server.mjs   ->   http://localhost:5173
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadEnv } from "../lib/env.mjs";
loadEnv();   // so /plugins reflects configured keys
import { open, getState, readiness, marketCleared, logRun,
  COMMISSION_TIERS, INCUMBENT_COMMISSION, USD_INR, commissionModel } from "../data-core/db.mjs";
import { mdToHtml } from "./md.mjs";
import { plugins as pluginList } from "../lib/plugins.mjs";
import { nextAction } from "../lib/comms_machine.mjs";
import { vaultBackend, openVault, accessLog } from "../lib/vault.mjs";
import { renderStudio, studioQueue, studioApprove } from "./studio.mjs";
import { renderSandbox, saveTemplate } from "./sandbox.mjs";
import { renderDemo } from "./demo.mjs";
import { appMode, authenticateDemoUser, ensureOsSchema, readinessReport, seedDemoOs } from "../data-core/os_core.mjs";
import { clearSessionCookie, loginRateLimit, sessionCookie, sessionMutationOriginAllowed } from "./session.mjs";
import { requiresAppSession, requiresConsoleToken } from "./access.mjs";
import { renderLogin } from "./login.mjs";
import { errorPage } from "./canopus_ui.mjs";
import { structuredLog } from "./logger.mjs";
import {
  getSession, apiCases, apiCase, renderCases, renderCase, renderHospital, renderAgent,
  renderVendors, renderOsAgents, renderWorkflows, renderTasks, renderIntegrations, renderAudit, metrics,
  apiApprovals, decideApproval, apiTasks, updateTask, apiVendors, createServiceRequest,
  apiCaseResource, apiAgentRuns, apiAudit, apiIntegrations, apiServiceRequests, updateServiceRequest,
} from "./os_pages.mjs";
import { renderConciergePage, answerConcierge } from "./concierge_bot.mjs";
import { transitionCase } from "../data-core/case_workflow.mjs";
import {
  renderAgentsDemo, runTriage, runDocumentChecklist,
  runFamilyUpdateAdd, runFamilyUpdateOptin, runFamilyUpdateSend,
  runKycInit, runKycSubmit, runBillingLead, runBillingAdhoc,
  runDischargeRelay, runGroundLogistics, runInterpreterScheduling, runTravelReadiness, runPaymentRouting,
  runVisaStart, runStayPlan, runStaySearch, runStayRequest, runFlightSearch, runFlightRequest,
  runVideoConsultSchedule, runVideoConsultOutcome,
} from "./agents.mjs";
import { renderJourney, runFullJourney } from "./orchestrate.mjs";
import { ingestLeads, parseLeadCsv, previewLeadCsv } from "../data-core/ingest.mjs";
import { benchmarks } from "../data-core/benchmarks.mjs";
import { range } from "../lib/money.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const LANDING = join(ROOT, "site", "landing");
const PORT = Number(process.env.PORT) || (process.env.NODE_ENV === "production" ? 3000 : 5173);
const HOST = process.env.HOST || "0.0.0.0";

function buildState(db) {
  const A = (s, ...p) => db.prepare(s).all(...p);
  const O = (s, ...p) => db.prepare(s).get(...p);
  const cats = A(`SELECT * FROM category WHERE status='launch' ORDER BY rank`);
  const markets = A(`SELECT * FROM market ORDER BY CASE tier WHEN 'A' THEN 0 WHEN 'B' THEN 1 WHEN 'C' THEN 2 ELSE 3 END, name`);
  const target = A(`SELECT category_id, market_code FROM category_market`);
  const assets = A(`SELECT id, category_id, market_code, language, status FROM content_asset`);
  const partners = A(`SELECT * FROM partner`);
  const candidates = A(`SELECT * FROM partner WHERE mvt_presence IN ('latent','emerging') AND opportunity IN ('High','Med') ORDER BY CASE opportunity WHEN 'High' THEN 0 ELSE 1 END, name`)
    .map((p) => ({ ...p, cats: A(`SELECT category_id FROM partner_category WHERE partner_id=?`, p.id).map((r) => r.category_id).join(", ") }));
  const named = A(`SELECT p.person_name, p.channel_public, pt.name partner FROM poc p JOIN partner pt ON pt.id=p.partner_id WHERE p.person_name IS NOT NULL`);
  const isT = (c, m) => target.some((t) => t.category_id === c && t.market_code === m);
  const asset = (c, m) => assets.find((a) => a.category_id === c && a.market_code === m);
  const portfolio = cats.map((c) => {
    const pr = O(`SELECT min(india_low) lo, max(india_high) hi FROM category_price WHERE category_id=?`, c.id);
    const cp = O(`SELECT low, high FROM competitor_price WHERE category_id=? ORDER BY samples DESC LIMIT 1`, c.id);
    return { ...c, band: pr.lo ? range(pr.lo, pr.hi) : "—",
      mkt: cp && cp.low ? range(cp.low, cp.high) : "" };
  });
  const grid = cats.map((c) => ({
    id: c.id, name: c.name,
    cells: markets.map((m) => {
      if (!isT(c.id, m.code)) return { m: m.code, s: "none" };
      const a = asset(c.id, m.code);
      return a ? { m: m.code, s: a.status, lang: a.language, aid: a.id } : { m: m.code, s: "gap" };
    }),
  }));
  return {
    now: new Date().toISOString(),
    kpi: {
      markets: markets.length, cats: cats.length, partners: partners.length,
      latent: partners.filter((p) => ["latent", "emerging"].includes(p.mvt_presence)).length,
      highOpp: candidates.filter((c) => c.opportunity === "High").length,
      cellsTotal: target.length, cellsDrafted: new Set(assets.map((a) => a.category_id + a.market_code)).size,
      published: assets.filter((a) => a.status === "published").length,
      pocResolved: named.length, pocTotal: O(`SELECT count(*) c FROM poc`).c,
      proposals: O(`SELECT count(*) c FROM proposal WHERE status IN ('review','draft')`).c,
      outbox: (() => { try { return readdirSync(join(ROOT, "outputs", "outbox")).filter((f) => f.endsWith(".eml")).length; } catch { return 0; } })(),
      sitePages: assets.filter((a) => a.status === "published" && a.language === "en").length,
      tenants: O(`SELECT count(*) c FROM tenant WHERE active=1`).c,
      extLeads: O(`SELECT count(*) c FROM lead WHERE source_type='external'`).c,
    },
    tenants: A(`SELECT id, name, mode, rev_share, (SELECT count(*) FROM lead WHERE source_ref=tenant.id) leads FROM tenant WHERE active=1 ORDER BY mode DESC, id`),
    markets: markets.map((m) => ({ code: m.code, tier: m.tier })),
    portfolio, grid,
    pipeline: A(`SELECT stage, count(*) n FROM partner GROUP BY stage`),
    candidates, named,
    // Account Board — the partner layer as a working CRM: fit-ranked, why-this-account, best POC + how
    // sure we are of the contact path, and the concrete next action. This is the GTM engine's spine.
    accounts: A(`SELECT * FROM partner ORDER BY pursuit_score DESC, fit_score DESC, name`).map((p) => {
      const poc = O(`SELECT person_name, role, title_target, contact_type, contact_value, confidence FROM poc
        WHERE partner_id=? ORDER BY CASE contact_type WHEN 'named-verified' THEN 0 WHEN 'named-public' THEN 1
        WHEN 'inferred' THEN 2 ELSE 3 END, confidence DESC LIMIT 1`, p.id);
      return {
        id: p.id, name: p.name, city: p.city, presence: p.mvt_presence, opp: p.opportunity,
        fit: p.fit_score, reason: p.fit_reason, stage: p.stage, next: p.next_action, owner: p.owner,
        // the three-axis ranking: pursuit is the board order (who first), fit/access/speed are the why.
        pursuit: p.pursuit_score, access: p.access_score, speed: p.speed_score,
        connection: p.connection, commission: p.commission_status, valueAsk: p.value_ask,
        outcome: p.outcome && p.outcome !== "none" ? p.outcome : null,
        readiness: readiness(p),   // execution risk, kept SEPARATE from fit (opportunity)
        poc: poc && poc.person_name ? poc.person_name : null,
        pocRole: poc ? (poc.role || poc.title_target) : null,
        pocType: poc ? poc.contact_type : "open", pocConf: poc ? poc.confidence : 0,
        pocContact: poc ? poc.contact_value : null,
      };
    }),
    contactMix: A(`SELECT COALESCE(contact_type,'open') t, count(*) n FROM poc GROUP BY COALESCE(contact_type,'open')`),
    outreach: A(`SELECT o.id, o.status, o.angle, o.channel, pt.name partner FROM outreach o JOIN partner pt ON pt.id=o.partner_id ORDER BY o.id DESC`),
  };
}

function docPage(title, ribbon, inner) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{margin:0;font-family:"Segoe UI",Roboto,Arial,system-ui,sans-serif;color:#0c1b2e;background:linear-gradient(180deg,#eaf1f8,#f6f9fd);line-height:1.6}
.ribbon{background:#e5a13a;color:#3a2600;font-weight:700;font-size:13px;text-align:center;padding:7px}.ribbon a{color:#3a2600}
main{max-width:720px;margin:0 auto;padding:26px 22px 60px}h1{color:#0b4a8b;font-size:26px}h2{color:#0b4a8b}
a{color:#1f6fd6}hr{border:none;border-top:1px solid #dbe4ef;margin:20px 0}code{background:#e7eef7;padding:1px 5px;border-radius:4px}
table{border-collapse:collapse;width:100%;margin:12px 0}th,td{padding:8px 10px;border-bottom:1px solid #dbe4ef;text-align:left}</style></head>
<body><div class="ribbon">${ribbon} — <a href="/console">back to console</a></div><main>${inner}</main></body></html>`;
}

function landingPage(a, inner) {
  const rtl = a.language === "ar";
  return `<!doctype html><html lang="${a.language}"${rtl ? ' dir="rtl"' : ""}><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${a.cat} — ${a.mname} (draft)</title>
<style>body{margin:0;font-family:"Segoe UI",Roboto,Arial,system-ui,sans-serif;color:#0c1b2e;background:linear-gradient(180deg,#eaf1f8,#f6f9fd);line-height:1.6}
.ribbon{background:#e5a13a;color:#3a2600;font-weight:700;font-size:13px;text-align:center;padding:7px}
.ribbon a{color:#3a2600}main{max-width:760px;margin:0 auto;padding:26px 22px 60px}
h1{color:#0b4a8b;font-size:30px;letter-spacing:-.02em;line-height:1.15}h2{color:#0b4a8b;margin-top:28px}
table{border-collapse:collapse;width:100%;margin:14px 0;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 8px 24px -16px rgba(11,74,139,.4)}
th,td{padding:10px 12px;border-bottom:1px solid #dbe4ef;text-align:${rtl ? "right" : "left"}}th{background:#0b4a8b;color:#fff}
a{color:#1f6fd6}hr{border:none;border-top:1px solid #dbe4ef;margin:22px 0}
.cta{display:inline-block;margin-top:8px;background:#25a862;color:#fff;padding:12px 20px;border-radius:999px;font-weight:700;text-decoration:none}
code{background:#e7eef7;padding:1px 5px;border-radius:4px}</style></head>
<body><div class="ribbon">DRAFT preview · ${a.language.toUpperCase()} · Tier-2 draft · ${a.language !== "en" ? "pending native QA · " : ""}not published — <a href="/console">back to console</a></div>
<main>${inner}<p style="margin-top:30px"><a class="cta" href="#">Message us on WhatsApp →</a></p></main></body></html>`;
}

const readBody = (req) => new Promise((resolve) => {
  let s = ""; req.on("data", (d) => { s += d; if (s.length > 1e6) req.destroy(); });
  req.on("end", () => { try { resolve(JSON.parse(s || "{}")); } catch { resolve({}); } });
  req.on("error", () => resolve({}));
});
const resultStatus = (result) => result?.ok ? 200
  : result?.error?.code === "NOT_FOUND" ? 404
    : result?.error?.code === "AUTH_REQUIRED" ? 401
    : ["FORBIDDEN", "READ_ONLY", "COMPLIANCE_BLOCKED"].includes(result?.error?.code) ? 403
      : 400;

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const requestId = req.headers["x-request-id"] || randomUUID();
  const db = open();
  ensureOsSchema(db);
  const session = getSession(db, req);
  const send = (code, type, body, extraHeaders = {}) => {
    res.writeHead(code, {
      "content-type": type,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "referrer-policy": "no-referrer",
      "permissions-policy": "camera=(), microphone=(), geolocation=()",
      "content-security-policy": "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'",
      "x-request-id": requestId,
      ...extraHeaders,
    });
    res.end(body);
  };
  // The marketing page, health/readiness and login remain public. Product workspaces require a
  // signed app session; operator/GTM surfaces remain separately fenced by CONSOLE_TOKEN.
  const OPERATOR_PROTECTED = requiresConsoleToken(url.pathname);
  if (process.env.CONSOLE_TOKEN && OPERATOR_PROTECTED) {
    const auth = req.headers.authorization || "";
    const pass = auth.startsWith("Basic ") ? Buffer.from(auth.slice(6), "base64").toString().split(":").slice(1).join(":") : "";
    if (pass !== process.env.CONSOLE_TOKEN) {
      db.close();
      res.writeHead(401, { "WWW-Authenticate": 'Basic realm="CanopusCare console"', "content-type": "text/plain" });
      return res.end("authentication required");
    }
  }
  if (requiresAppSession(url.pathname) && !session.authenticated) {
    db.close();
    if (req.method === "GET" && !url.pathname.startsWith("/api/")) {
      const next = encodeURIComponent(url.pathname + url.search);
      res.writeHead(302, { location: `/login?next=${next}`, "cache-control": "no-store" });
      return res.end("sign in required");
    }
    return send(401, "application/json", JSON.stringify({
      ok: false,
      error: { code: "AUTH_REQUIRED", message: "Sign in is required to access the demo workspace.", details: {} },
      request_id: requestId,
    }));
  }
  try {
    if (!sessionMutationOriginAllowed(req)) {
      structuredLog("csrf_rejected", { request_id: requestId, method: req.method, path: url.pathname }, "error");
      return send(403, "application/json", JSON.stringify({
        ok: false,
        error: { code: "ORIGIN_REJECTED", message: "The request origin is not allowed.", details: {} },
        request_id: requestId,
      }));
    }
    if (req.method === "GET" && url.pathname === "/app")
      return send(302, "text/plain; charset=utf-8", "Open dashboard", { location: "/demo" });
    const appCaseMatch = url.pathname.match(/^\/app\/cases\/([^/]+)$/);
    if (req.method === "GET" && appCaseMatch)
      return send(302, "text/plain; charset=utf-8", "Open case", { location: `/cases/${encodeURIComponent(appCaseMatch[1])}` });
    if (req.method === "GET" && url.pathname === "/login")
      return send(200, "text/html; charset=utf-8", renderLogin(url.searchParams.get("next")));
    if (req.method === "POST" && url.pathname === "/api/auth/login") {
      const rateKey = req.socket.remoteAddress || "unknown";
      const limit = loginRateLimit(rateKey);
      if (!limit.allowed)
        return send(429, "application/json", JSON.stringify({ ok: false, error: { code: "RATE_LIMITED", message: "Too many login attempts. Try again later.", details: {} } }), { "retry-after": String(limit.retryAfter) });
      const body = await readBody(req);
      const user = authenticateDemoUser(db, body.email, body.password);
      const ok = !!user;
      if (ok) {
        loginRateLimit(rateKey, true);
        const organization = db.prepare(`SELECT organization_id FROM membership WHERE user_id=? ORDER BY role LIMIT 1`).get(user.id);
        db.prepare(`INSERT INTO audit_event (id,actor_user_id,organization_id,action,subject_type,subject_id,outcome,request_id,detail)
          VALUES (lower(hex(randomblob(8))),?,?,?,?,?,?,?,?)`).run(user.id, organization?.organization_id || null, "login", "user", user.id, "ok", requestId, "Demo login");
      }
      return send(ok ? 200 : 401, "application/json",
        JSON.stringify(ok ? { ok: true, user: { email: user.email, name: user.name } } : { ok: false, error: { code: "AUTH_FAILED", message: "Invalid demo credentials.", details: {} }, request_id: requestId }),
        ok ? { "set-cookie": sessionCookie(user.id) } : {});
    }
    if (req.method === "POST" && url.pathname === "/api/auth/logout")
      return send(200, "application/json", JSON.stringify({ ok: true }), { "set-cookie": clearSessionCookie() });
    if (url.pathname === "/api/session")
      return send(200, "application/json", JSON.stringify({
        ok: true,
        authenticated: session.authenticated,
        role: session.role,
        user: session.user && { email: session.user.email, name: session.user.name },
        memberships: session.memberships,
      }));
    if (url.pathname === "/api/readiness")
      return send(200, "application/json", JSON.stringify(readinessReport(db)));
    if (url.pathname === "/api/metrics")
      return send(200, "application/json", JSON.stringify(metrics(db)));
    if (url.pathname === "/api/cases")
      return send(200, "application/json", JSON.stringify({ ok: true, cases: apiCases(db, session) }));
    const apiCaseMatch = url.pathname.match(/^\/api\/cases\/([^/]+)$/);
    if (apiCaseMatch) {
      const c = apiCase(db, session, apiCaseMatch[1]);
      return send(c ? 200 : 404, "application/json", JSON.stringify(c ? { ok: true, case: c } : { ok: false, error: { code: "NOT_FOUND", message: "Case not found or not authorized", details: {} }, request_id: "local" }));
    }
    const caseTransitionMatch = url.pathname.match(/^\/api\/cases\/([^/]+)\/transition$/);
    if (req.method === "POST" && caseTransitionMatch) {
      const body = await readBody(req);
      const result = transitionCase(db, session, caseTransitionMatch[1], String(body.state || ""));
      return send(resultStatus(result), "application/json", JSON.stringify(result));
    }
    const apiCaseResourceMatch = url.pathname.match(/^\/api\/cases\/([^/]+)\/(documents|matches|reviews|estimates|messages|tasks|services|approvals|audit)$/);
    if (apiCaseResourceMatch) {
      const [, caseId, resource] = apiCaseResourceMatch;
      const value = apiCaseResource(db, session, caseId, resource);
      return send(value ? 200 : 404, "application/json", JSON.stringify(value
        ? { ok: true, case_id: caseId, [resource]: value }
        : { ok: false, error: { code: "NOT_FOUND", message: "Case not found or not authorized", details: {} }, request_id: requestId }));
    }
    if (url.pathname === "/api/agent-runs")
      return send(200, "application/json", JSON.stringify({ ok: true, agent_runs: apiAgentRuns(db, session) }));
    if (url.pathname === "/api/audit")
      return send(200, "application/json", JSON.stringify({ ok: true, audit_events: apiAudit(db, session) }));
    if (url.pathname === "/api/integrations")
      return send(200, "application/json", JSON.stringify({ ok: true, integrations: apiIntegrations(db) }));
    if (url.pathname === "/api/approvals")
      return send(200, "application/json", JSON.stringify({ ok: true, approvals: apiApprovals(db, session) }));
    const approvalAction = url.pathname.match(/^\/api\/approvals\/([^/]+)\/(approve|reject)$/);
    if (req.method === "POST" && approvalAction) {
      const result = decideApproval(db, session, approvalAction[1], approvalAction[2]);
      return send(resultStatus(result), "application/json", JSON.stringify(result));
    }
    if (url.pathname === "/api/tasks")
      return send(200, "application/json", JSON.stringify({ ok: true, tasks: apiTasks(db, session) }));
    const taskPatch = url.pathname.match(/^\/api\/tasks\/([^/]+)$/);
    if (req.method === "PATCH" && taskPatch) {
      const body = await readBody(req);
      const result = updateTask(db, session, taskPatch[1], body);
      return send(resultStatus(result), "application/json", JSON.stringify(result));
    }
    if (url.pathname === "/api/vendors")
      return send(200, "application/json", JSON.stringify({ ok: true, ...apiVendors(db) }));
    if (req.method === "GET" && url.pathname === "/api/service-requests")
      return send(200, "application/json", JSON.stringify({ ok: true, service_requests: apiServiceRequests(db, session) }));
    const serviceRequestPatch = url.pathname.match(/^\/api\/service-requests\/([^/]+)$/);
    if (req.method === "PATCH" && serviceRequestPatch) {
      const body = await readBody(req);
      const result = updateServiceRequest(db, session, serviceRequestPatch[1], body);
      const status = result.ok ? 200 : result.error?.code === "NOT_FOUND" ? 404 : result.error?.code === "FORBIDDEN" || result.error?.code === "READ_ONLY" ? 403 : 400;
      return send(status, "application/json", JSON.stringify(result));
    }
    if (req.method === "POST" && url.pathname === "/api/service-requests") {
      const body = await readBody(req);
      const result = createServiceRequest(db, session, body);
      return send(resultStatus(result), "application/json", JSON.stringify(result));
    }
    if (req.method === "POST" && url.pathname === "/api/demo/reset") {
      if (appMode() !== "demo") return send(403, "application/json", JSON.stringify({ ok: false, error: { code: "NOT_DEMO", message: "Demo reset is only allowed in APP_MODE=demo.", details: {} } }));
      if (session.role !== "platform_admin") return send(403, "application/json", JSON.stringify({ ok: false, error: { code: "FORBIDDEN", message: "Only platform admins can reset demo data.", details: {} } }));
      seedDemoOs(db);
      return send(200, "application/json", JSON.stringify({ ok: true, reset: "medyatra_os_demo" }));
    }
    if (url.pathname === "/hospital")
      return send(200, "text/html; charset=utf-8", renderHospital(db, session));
    if (url.pathname === "/agent")
      return send(200, "text/html; charset=utf-8", renderAgent(db, session));
    // CONCIERGE BOT — the patient/family's single conversational point of contact for the whole journey
    // (server/concierge_bot.mjs). Deterministic, key-free, reads the same case record the OS pages read.
    if (url.pathname === "/concierge")
      return send(200, "text/html; charset=utf-8", renderConciergePage(db));
    if (req.method === "POST" && url.pathname === "/api/concierge/ask") {
      const body = await readBody(req);
      return send(200, "application/json", JSON.stringify(answerConcierge(db, body)));
    }
    if (url.pathname === "/cases")
      return send(200, "text/html; charset=utf-8", renderCases(db, session));
    const caseMatch = url.pathname.match(/^\/cases\/([^/]+)$/);
    if (caseMatch)
      return send(200, "text/html; charset=utf-8", renderCase(db, session, caseMatch[1]));
    if (url.pathname === "/vendors" || url.pathname === "/vendor" || url.pathname === "/service-requests")
      return send(200, "text/html; charset=utf-8", renderVendors(db, session));
    if (url.pathname === "/tasks")
      return send(200, "text/html; charset=utf-8", renderTasks(db, session));
    if (url.pathname === "/integrations")
      return send(200, "text/html; charset=utf-8", renderIntegrations(db, session));
    if (url.pathname === "/readiness")
      return send(200, "text/html; charset=utf-8", renderIntegrations(db, session));
    if (url.pathname === "/audit")
      return send(200, "text/html; charset=utf-8", renderAudit(db, session));
    // STUDIO — the live approve-and-deploy console (real data + write-back actions).
    if (req.method === "POST" && url.pathname === "/api/studio/approve") {
      const body = await readBody(req);
      return send(200, "application/json", JSON.stringify(studioApprove(db, body)));
    }
    if (url.pathname === "/studio")
      return send(200, "text/html; charset=utf-8", renderStudio(db, { tenant: url.searchParams.get("tenant") || undefined }));
    if (url.pathname === "/api/studio")
      return send(200, "application/json", JSON.stringify(studioQueue(db, { tenant: url.searchParams.get("tenant") || undefined })));
    // SANDBOX — the deployment-ready patient-journey walk-through: simulate every branch + edit templates
    // live. Editing a template routes it back to `review` (human-gated before it can ever send).
    if (url.pathname === "/demo")
      return send(200, "text/html; charset=utf-8", renderDemo(db, session));
    // CONCIERGE AGENTS — post-booking journey, live and clickable (server/agents.mjs). Real model calls
    // through the same failover chain and safety gate as everything else; deterministic fallback if no key.
    if (url.pathname === "/agents")
      return send(200, "text/html; charset=utf-8", url.searchParams.get("legacy") === "1" && session.role === "platform_admin" ? renderAgentsDemo() : renderOsAgents(db, session));
    if (url.pathname === "/workflows")
      return send(200, "text/html; charset=utf-8", renderWorkflows(db, session));
    if (req.method === "POST" && url.pathname.startsWith("/api/agents/")) {
      const body = await readBody(req);
      const kind = url.pathname.slice("/api/agents/".length);
      // Handlers that need the live DB connection are wrapped inline; pure/generation-only ones pass straight
      // through. Same functions a CLI script or comms_run.mjs would call — no separate "web" code path.
      const handler = {
        triage: () => runTriage(body),
        "document-checklist": () => runDocumentChecklist(body),
        "family-update-add": () => runFamilyUpdateAdd(db, body),
        "family-update-optin": () => runFamilyUpdateOptin(db, body),
        "family-update-send": () => runFamilyUpdateSend(db, body),
        "kyc-init": () => runKycInit(db, body),
        "kyc-submit": () => runKycSubmit(db, body),
        "billing-lead": () => runBillingLead(db, body),
        "billing-adhoc": () => runBillingAdhoc(body),
        "discharge-relay": () => runDischargeRelay(body),
        "ground-logistics": () => runGroundLogistics(body),
        "interpreter-scheduling": () => runInterpreterScheduling(body),
        "travel-readiness": () => runTravelReadiness(body),
        "payment-routing": () => runPaymentRouting(body),
        "visa-start": () => runVisaStart(db, body),
        "stay-plan": () => runStayPlan(body),
        "stay-search": () => runStaySearch(body),
        "stay-request": () => runStayRequest(db, body),
        "flight-search": () => runFlightSearch(body),
        "flight-request": () => runFlightRequest(db, body),
        "video-consult-schedule": () => runVideoConsultSchedule(db, body),
        "video-consult-outcome": () => runVideoConsultOutcome(db, body),
      }[kind];
      if (!handler) return send(404, "application/json", JSON.stringify({ error: "unknown agent action: " + kind }));
      try {
        const result = await handler();
        logRun(db, "Agents", `${kind} run`, JSON.stringify(result).slice(0, 140), "/agents", result?.safety?.verdict === "block" ? "fail" : "ok");
        return send(200, "application/json", JSON.stringify(result));
      } catch (e) { return send(500, "application/json", JSON.stringify({ error: String(e.message || e) })); }
    }
    // FULL JOURNEY ORCHESTRATION — one real lead through every concierge agent in chronological order
    // (server/orchestrate.mjs). Calls the exact same handlers /agents does; no separate demo code path.
    if (url.pathname === "/journey")
      return send(200, "text/html; charset=utf-8", renderJourney(db));
    if (req.method === "POST" && url.pathname === "/api/journey/run") {
      const body = await readBody(req);
      try {
        const result = await runFullJourney(db, body);
        return send(200, "application/json", JSON.stringify(result));
      } catch (e) { return send(500, "application/json", JSON.stringify({ error: String(e.message || e) })); }
    }
    if (url.pathname === "/sandbox")
      return send(200, "text/html; charset=utf-8", renderSandbox(db));
    if (req.method === "POST" && url.pathname === "/api/comms/save") {
      const body = await readBody(req);
      return send(200, "application/json", JSON.stringify(saveTemplate(db, body)));
    }
    // CROSS-TENANT BENCHMARKS — de-identified aggregate learning (k-anonymised; no tenant/patient identifiers).
    if (url.pathname === "/api/benchmarks")
      return send(200, "application/json", JSON.stringify(benchmarks(db, { k: Number(url.searchParams.get("k")) || 5 })));
    if (url.pathname === "/benchmarks") {
      const b = benchmarks(db, { k: Number(url.searchParams.get("k")) || 5 });
      const cm = b.category_market.map((c) => `| ${c.category} | ${c.market} | ${c.suppressed ? `_suppressed (${c.suppressed})_` : c.leads} | ${c.suppressed ? "—" : c.reached_booking_pct + "%"} |`).join("\n");
      const sm = b.stage_mix.map((s) => `| ${s.stage} | ${s.n == null ? `_suppressed (${s.suppressed})_` : s.n} |`).join("\n");
      const md = `# Cross-tenant benchmarks (de-identified)\n\n> ${b.note}\n\n**${b.tenants} tenants · ${b.total_leads} leads · k=${b.k} · ${b.cells_shown} cells shown, ${b.cells_suppressed} suppressed.**\n\n## Funnel (all tenants)\n\n| Stage | Leads |\n|---|---|\n${sm}\n\n## Category × Market\n\n| Category | Market | Leads | Reached booking+ |\n|---|---|---|---|\n${cm}\n\n_This is aggregate learning, **not** patient-data reuse. Every tenant + patient identifier is stripped before aggregation; any group below k is suppressed._`;
      return send(200, "text/html; charset=utf-8", docPage("Cross-tenant benchmarks", "De-identified aggregate learning — the legally-clean moat (build-os/11)", mdToHtml(md)));
    }
    // DUAL-MODE — an external operator plugs in their lead DB. Authenticated PER TENANT (build-os/11):
    // the body's `source` must be a known active tenant, and X-Ingest-Token must match that tenant's token.
    if (req.method === "POST" && url.pathname === "/api/lead/ingest") {
      const body = await readBody(req);
      const result = ingestLeads(db, { ...body, token: req.headers["x-ingest-token"] });
      return send(result.ok ? 200 : 401, "application/json", JSON.stringify(result));
    }
    if (req.method === "POST" && url.pathname === "/api/lead/preview-csv") {
      const body = await readBody(req);
      const result = previewLeadCsv(db, { ...body, token: req.headers["x-ingest-token"] });
      return send(result.ok ? 200 : /token/.test(result.error || "") ? 401 : 400, "application/json", JSON.stringify(result));
    }
    if (req.method === "POST" && url.pathname === "/api/lead/import-csv") {
      const body = await readBody(req);
      const parsed = parseLeadCsv(body.csv, body.mapping);
      if (!parsed.ok) return send(400, "application/json", JSON.stringify(parsed));
      const result = ingestLeads(db, {
        source: body.source,
        token: req.headers["x-ingest-token"],
        leads: parsed.leads,
      });
      return send(result.ok ? 200 : /token/.test(result.error || "") ? 401 : 400, "application/json", JSON.stringify({ ...result, mapping: parsed.mapping }));
    }
    if (url.pathname === "/") {
      return send(200, "text/html; charset=utf-8", readFileSync(join(LANDING, "index.html")));
    }
    if (/^\/landing-assets\/[A-Za-z0-9._-]+$/.test(url.pathname)) {
      const file = url.pathname.slice("/landing-assets/".length);
      const fp = join(LANDING, file);
      try {
        const ext = file.split(".").pop().toLowerCase();
        const ct = {
          css: "text/css; charset=utf-8",
          js: "text/javascript; charset=utf-8",
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          png: "image/png",
          webp: "image/webp",
          mp4: "video/mp4",
        }[ext] || "application/octet-stream";
        return send(200, ct, readFileSync(fp), { "cache-control": "public, max-age=3600" });
      } catch {
        return send(404, "text/plain; charset=utf-8", "asset not found");
      }
    }
    if (url.pathname === "/console")
      return send(200, "text/html; charset=utf-8", readFileSync(join(HERE, "console.html")));
    if (url.pathname.startsWith("/docs/") && url.pathname.endsWith(".md")) {
      const fp = join(ROOT, url.pathname.replace(/^\//, ""));
      if (!fp.startsWith(join(ROOT, "docs"))) return send(403, "text/plain", "forbidden");
      try {
        return send(200, "text/html; charset=utf-8", docPage(url.pathname, "Documentation", mdToHtml(readFileSync(fp, "utf8"))));
      } catch { return send(404, "text/plain", "doc not found"); }
    }
    if (url.pathname === "/worklist") {
      try {
        const md = readFileSync(join(ROOT, "outputs", "partner-research-worklist.md"), "utf8");
        return send(200, "text/html; charset=utf-8",
          docPage("Partner Research Worklist", "HUMAN research worklist · named decision-makers (manual search — no automated circumvention)", mdToHtml(md)));
      } catch { return send(404, "text/html", "not built — run research_worklist.mjs"); }
    }
    if (url.pathname === "/plugins") {
      const ps = pluginList();
      const rows = ps.map((p) => `| ${p.ready ? "🟢 ready" : "⚪ needs key"} | **${p.name}** | ${p.purpose} | \`${p.envKeys.join("`, `")}\` | ${p.requirements} |`).join("\n");
      const body = `# Content Plugins — readiness\n\n> Every integration is wired to the correct API shape. **${ps.filter((p) => p.ready).length}/${ps.length} ready**; the rest are one API key away. Delivery is double-gated (needs \`POST_LIVE=1\` **and** per-post approval) — nothing auto-posts.\n\n| Status | Plugin | What it does | Env key(s) | Needs |\n|---|---|---|---|---|\n${rows}\n\nAdd keys to \`integrations/.env\`, restart, and the status flips to 🟢.`;
      return send(200, "text/html; charset=utf-8", docPage("Content Plugins", "Integration readiness — what's live vs one key away", mdToHtml(body)));
    }
    if (url.pathname === "/vault") {
      // Medical-data architecture status: backend, per-market law register, access-log tail. Read-only.
      const backend = vaultBackend();
      const laws = db.prepare(`SELECT * FROM health_data_law ORDER BY CASE transfer_rule
        WHEN 'in_country_only' THEN 0 WHEN 'localization_copy' THEN 1 WHEN 'adequacy_or_sccs' THEN 2
        WHEN 'consent_based' THEN 3 ELSE 4 END, market_code`).all();
      const RULE_TXT = { in_country_only: "⛔ in-country hosting required", localization_copy: "⚠ in-country replica required",
        adequacy_or_sccs: "SCCs / adequacy + assessment", consent_based: "consent-based", no_comprehensive_law: "no law — GDPR floor applies" };
      // Which markets are SKIPPED (regulatory_status='blocked') — the founder decision not to serve them yet.
      const blocked = new Set(db.prepare(`SELECT code FROM market WHERE regulatory_status='blocked'`).all().map((r) => r.code));
      const skipRows = db.prepare(`SELECT code, name, regulatory_note FROM market WHERE regulatory_status='blocked' ORDER BY code`).all();
      const lawRows = laws.map((l) => `| ${l.market_code}${blocked.has(l.market_code) ? " 🚫" : ""} | ${RULE_TXT[l.transfer_rule] || l.transfer_rule} | ${l.law_name} | ${blocked.has(l.market_code) ? "**SKIPPED**" : l.status} |`).join("\n");
      const skipBlock = skipRows.length ? `\n## 🚫 Skipped markets — not served at this juncture\n\nWe do **not** collect or process medical data for these markets until the required data-residency infrastructure exists; the vault hard-refuses any clinical write for them and the marketing gate blocks outreach.\n\n${skipRows.map((s) => `- **${s.name} (${s.code})** — ${s.regulatory_note}`).join("\n")}\n` : "";
      let logRows = "_vault not initialised yet — first record creates it_";
      try {
        const v = openVault();
        logRows = accessLog(v, { limit: 15 }).map((l) => `| ${l.ts} | ${l.action} | ${l.purpose || "—"} | ${l.note} |`).join("\n") || "_no access events yet_";
        if (logRows.startsWith("|")) logRows = `| When | Action | Purpose | Note |\n|---|---|---|---|\n${logRows}`;
        v.close();
      } catch {}
      const body = `# Medical Data Vault — architecture status

> **Backend: \`${backend.kind}\`** — ${backend.note || backend.where}. Clinical payloads (prescriptions, treatment
> methodologies, recommended tests, medical history) are **AES-256-GCM encrypted at rest** in a separate database,
> never mingled with the GTM core. CanopusCare's own read surface is the **facilitator envelope only**: treatment
> name/protocol, treatment timelines, cost structure, surgeon details. Decryption exists solely for named relay
> purposes (hospital→patient, patient→hospital, patient's own copy), every access — including refusals — is logged,
> and erasure leaves an audit tombstone. GDPR is the backbone in every market, including those with no law of their own.
> Verify with \`npm run smoke-vault\` (12 mechanical checks).
${skipBlock}
## Per-market health-data law register (${laws.length} jurisdictions — 🚫 = skipped; the rest unverified until counsel signs off)

| Market | Transfer rule | Law | Status |
|---|---|---|---|
${lawRows}

## Access log (latest)

${logRows}`;
      return send(200, "text/html; charset=utf-8", docPage("Medical Data Vault", "GDPR-backbone clinical data architecture — encrypted, purpose-limited, audited", mdToHtml(body)));
    }
    if (url.pathname === "/comms") {
      const rows = db.prepare(`SELECT * FROM comms_template ORDER BY seq`).all();
      const card = (t) => {
        const btns = (() => { try { return JSON.parse(t.buttons || "[]"); } catch { return []; } })();
        const img = t.header_asset ? `/${t.header_asset.replace(/^\//, "")}` : "";
        return `<div class="wa">
          <div class="stg"><span class="n">${t.seq}</span> ${t.stage.replace(/_/g, " ")}
            <span class="tag ${t.category}">${t.category}</span><span class="tag ${t.msg_type}">${t.msg_type}</span></div>
          <div class="bub">
            ${img ? `<img src="${img}" alt="header">` : ""}
            <div class="bd">${(t.body || "").replace(/\{\{(\d)\}\}/g, '<b>{{$1}}</b>')}</div>
            <div class="btns">${btns.map((b) => `<span>${b.text}</span>`).join("")}</div>
          </div></div>`;
      };
      const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sales Comms — WhatsApp sequence</title>
<style>body{margin:0;font-family:"Segoe UI",Roboto,Arial,system-ui,sans-serif;color:#0c1b2e;background:linear-gradient(180deg,#e9f1f8,#eef4fb);line-height:1.5}
.ribbon{background:#e5a13a;color:#3a2600;font-weight:700;font-size:13px;text-align:center;padding:8px}.ribbon a{color:#3a2600}
main{max-width:820px;margin:0 auto;padding:24px 20px 70px}h1{color:#0b4a8b;font-size:24px;margin:0 0 4px}.sub{color:#5a6b80;font-size:14px;margin-bottom:20px}
.wa{margin:26px 0}.stg{font-weight:700;text-transform:capitalize;color:#0b4a8b;margin-bottom:8px;display:flex;align-items:center;gap:8px}
.stg .n{background:#0b4a8b;color:#fff;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-size:13px}
.tag{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:2px 8px;border-radius:6px;background:#dbe4ef;color:#5a6b80}
.tag.utility{background:rgba(37,168,98,.15);color:#1c8b50}.tag.marketing{background:rgba(229,161,58,.2);color:#9a6a12}.tag.session{background:rgba(31,111,214,.12);color:#1f6fd6}
.bub{background:#fff;border-radius:4px 18px 18px 18px;box-shadow:0 10px 30px -18px rgba(11,74,139,.5);overflow:hidden;max-width:420px;border:1px solid #e2ecf7}
.bub img{width:100%;display:block}.bd{padding:12px 15px;font-size:14.5px}.bd b{color:#0b4a8b;background:#eef4fb;padding:0 3px;border-radius:3px;font-weight:600}
.btns{display:flex;flex-direction:column;border-top:1px solid #eef2f7}.btns span{padding:11px;text-align:center;color:#1f6fd6;font-weight:600;font-size:14px;border-top:1px solid #eef2f7;cursor:default}
.btns span:first-child{border-top:none}</style></head>
<body><div class="ribbon">SALES COMMS · WhatsApp sequence · body = minimal/kosher, value rides in the image header · human submits to Meta &amp; sends — <a href="/sandbox">open the interactive sandbox →</a> · <a href="/console">back to console</a></div>
<main><h1>Post-lead WhatsApp sequence</h1><div class="sub">${rows.length} templates · body kept Utility-flavoured for approval; the persuasion (cost, savings, process) lives in the infographic header. See <a href="/site/../build-os/09_SALES_COMMS_PLAYBOOK.md">/build-os/09</a>.</div>
${rows.map(card).join("")}</main></body></html>`;
      return send(200, "text/html; charset=utf-8", html);
    }
    if (url.pathname === "/distribution") {
      const posts = db.prepare(`SELECT cp.*, c.name cat, mk.name mname FROM channel_post cp
        JOIN category c ON c.id=cp.category_id JOIN market mk ON mk.code=cp.market_code
        ORDER BY cp.content_asset_id, cp.channel`).all();
      const icon = { linkedin: "in", instagram: "IG", reddit: "r/", whatsapp: "WA", x: "X" };
      let body = `# Content Distribution Queue\n\n> Each published cornerstone page, repurposed into platform-native posts by the Tier-2 model (facts injected, no invention). **Human-gated — nothing auto-posts.** ${posts.length} drafts.\n\n`;
      let lastAsset = null;
      for (const p of posts) {
        if (p.content_asset_id !== lastAsset) { body += `\n---\n## ${p.cat} × ${p.mname}\n`; lastAsset = p.content_asset_id; }
        body += `\n### ${icon[p.channel] || ""} ${p.channel.toUpperCase()} · _${p.format}_ · \`${p.status}\` · ${p.model || ""}\n\n${p.body}\n`;
      }
      if (!posts.length) body += "_No posts yet — run `npm run loop` or `data-core/repurpose_content.mjs`._";
      return send(200, "text/html; charset=utf-8",
        docPage("Content Distribution Queue", "REPURPOSED social posts · human-gated (nothing auto-posts)", mdToHtml(body)));
    }
    if (url.pathname.startsWith("/site/") || url.pathname.startsWith("/outputs/screenshots/")
        || url.pathname.startsWith("/outputs/comms/") || url.pathname.startsWith("/outputs/social/")) {
      const fp = join(ROOT, url.pathname.replace(/^\//, ""));
      if (!fp.startsWith(ROOT)) return send(403, "text/plain", "forbidden");
      try {
        const ext = fp.split(".").pop().toLowerCase();
        const ct = { html: "text/html; charset=utf-8", png: "image/png", jpg: "image/jpeg", css: "text/css", js: "text/javascript" }[ext] || "application/octet-stream";
        return send(200, ct, readFileSync(fp));
      } catch { return send(404, "text/html", "not built yet — run publish_site.mjs"); }
    }
    if (url.pathname === "/api/health") {
      const done = getState(db, "loop_completed");
      const ageH = done ? (Date.now() - Date.parse(done.v)) / 36e5 : null;
      const staleAfter = Number(process.env.LOOP_STALE_HOURS) || 8;   // 6h schedule + grace
      const os = readinessReport(db);
      const loopHealthy = ageH != null && ageH < staleAfter;
      return send(200, "application/json", JSON.stringify({
        ok: os.ok && (appMode() === "demo" || loopHealthy),
        service: "canopus-care",
        mode: appMode(),
        database: os.database === "READY" ? "ok" : "degraded",
        seed: db.prepare(`SELECT count(*) count FROM seed_version`).get().count ? "loaded" : "missing",
        last_loop: done?.v || null,
        app_mode: appMode(), os_ready: os.ok, legacy_loop_healthy: loopHealthy,
        last_loop_completed: done?.v || null, hours_since: ageH == null ? null : +ageH.toFixed(1),
        stale: ageH == null || ageH >= staleAfter, last_backup: getState(db, "last_backup")?.v || null,
        runs: db.prepare(`SELECT count(*) c FROM run`).get().c,
        fails_recent: db.prepare(`SELECT count(*) c FROM run WHERE status='fail' AND ts > datetime('now','-1 day')`).get().c,
      }));
    }
    if (url.pathname === "/api/state")
      return send(200, "application/json", JSON.stringify(buildState(db)));
    if (url.pathname === "/api/runs")
      return send(200, "application/json", JSON.stringify(db.prepare(`SELECT * FROM run ORDER BY id DESC LIMIT 80`).all()));
    // MARKETS — the servable/skipped footprint as JSON, so an external front-end (e.g. the YC demo landing
    // page) reflects the live register: reseed or flip a market's regulatory_status and this changes.
    // status derives from regulatory_status ('blocked' → skipped); telegramFirst is inferred from the
    // channel mix / notes (Central Asia + Cameroon), the markets the WhatsApp-only comms engine can't reach yet.
    if (url.pathname === "/api/markets") {
      const rows = db.prepare(`SELECT code,name,region,tier,regulatory_status,regulatory_note,primary_channels,notes FROM market
        ORDER BY CASE tier WHEN 'A' THEN 0 WHEN 'B' THEN 1 WHEN 'C' THEN 2 ELSE 3 END, name`).all();
      return send(200, "application/json", JSON.stringify(rows.map((m) => {
        const blocked = m.regulatory_status === "blocked";
        return {
          code: m.code, name: m.name, region: m.region, tier: m.tier,
          status: blocked ? "skipped" : "servable",
          reason: blocked ? m.regulatory_note : null,
          telegramFirst: /telegram/i.test(`${m.primary_channels || ""} ${m.notes || ""}`),
        };
      })));
    }
    // VAULT — the medical-data architecture status as JSON (same source as the /vault HTML page): backend,
    // per-market law register strictest-first, the skip list, and the access-log tail. Read-only.
    if (url.pathname === "/api/vault") {
      const backend = vaultBackend();
      let laws = [];
      try {
        laws = db.prepare(`SELECT market_code, transfer_rule, law_name, status FROM health_data_law ORDER BY CASE transfer_rule
          WHEN 'in_country_only' THEN 0 WHEN 'localization_copy' THEN 1 WHEN 'adequacy_or_sccs' THEN 2
          WHEN 'consent_based' THEN 3 ELSE 4 END, market_code`).all();
      } catch { /* health_data_law not seeded yet — npm run health-laws */ }
      const blocked = new Set(db.prepare(`SELECT code FROM market WHERE regulatory_status='blocked'`).all().map((r) => r.code));
      const skipped = db.prepare(`SELECT code, name, regulatory_note AS note FROM market WHERE regulatory_status='blocked' ORDER BY code`).all();
      let accessLogRows = [];
      try { const v = openVault(); accessLogRows = accessLog(v, { limit: 15 }); v.close(); } catch { /* vault not initialised yet */ }
      return send(200, "application/json", JSON.stringify({
        backend, laws: laws.map((l) => ({ ...l, blocked: blocked.has(l.market_code) })), skipped, accessLog: accessLogRows,
      }));
    }
    // ECONOMICS — the commission model as JSON so the demo's investor panel reads the live tier ladder:
    // change COMMISSION_TIERS in db.mjs and this (and the landing page) update. The worked per-case example
    // uses the live cardiac package band, computed at the 20% entry tier vs the conservative 25% incumbent floor.
    if (url.pathname === "/api/economics") {
      const pkg = db.prepare(`SELECT min(india_low) low, max(india_high) high FROM category_price WHERE category_id='cardiac'`).get();
      const band = pkg && pkg.low ? { low: pkg.low, high: pkg.high } : { low: 5000, high: 9000 };
      const model = commissionModel(band, COMMISSION_TIERS[0].pct, INCUMBENT_COMMISSION.low);
      return send(200, "application/json", JSON.stringify({
        incumbent: INCUMBENT_COMMISSION, usdInr: USD_INR, tiers: COMMISSION_TIERS,
        paidBy: "the hospital, never the patient",
        entryPct: COMMISSION_TIERS[0].pct, capPct: COMMISSION_TIERS.at(-1).pct,
        example: {
          category: "cardiac", packageUSD: band, ourFeeUSD: model.ourFee,
          hospitalNetUSD: model.hospitalNet, netUpliftVsIncumbentFloorUSD: model.netUplift,
        },
        line: "Open below every incumbent (20% vs their 25% floor) to win the pilot; step up only to their " +
          "cheapest rate (25%) as volume proves out — the hospital never pays more than its current cheapest agent.",
      }));
    }
    const m = url.pathname.match(/^\/draft\/(\d+)$/);
    if (m) {
      const a = db.prepare(`SELECT ca.*, c.name cat, mk.name mname FROM content_asset ca
        JOIN category c ON c.id=ca.category_id JOIN market mk ON mk.code=ca.market_code WHERE ca.id=?`).get(+m[1]);
      if (!a) return send(404, "text/html", "draft not found");
      const md = readFileSync(join(ROOT, a.file_ref), "utf8");
      return send(200, "text/html; charset=utf-8", landingPage(a, mdToHtml(md)));
    }
    const o = url.pathname.match(/^\/outreach\/(\d+)$/);
    if (o) {
      const row = db.prepare(`SELECT ot.*, pt.name partner FROM outreach ot JOIN partner pt ON pt.id=ot.partner_id WHERE ot.id=?`).get(+o[1]);
      if (!row) return send(404, "text/html", "outreach not found");
      const md = readFileSync(join(ROOT, row.file_ref), "utf8");
      return send(200, "text/html; charset=utf-8",
        docPage(`Outreach — ${row.partner}`, `DRAFT outreach · ${row.angle} angle · NOT sent (human-gated)`, mdToHtml(md)));
    }
    if (url.pathname.startsWith("/api/"))
      return send(404, "application/json", JSON.stringify({ ok: false, error: { code: "NOT_FOUND", message: "API route not found.", details: {} }, request_id: requestId }));
    return send(404, "text/html; charset=utf-8", errorPage(404, "Page not found", "The requested demo page does not exist or has moved.", requestId));
  } catch (e) {
    structuredLog("route_error", { request_id: requestId, method: req.method, path: url.pathname, error: String(e?.message || e) }, "error");
    if (url.pathname.startsWith("/api/"))
      send(500, "application/json", JSON.stringify({ ok: false, error: { code: "INTERNAL_ERROR", message: "The request could not be completed.", details: {} }, request_id: requestId }));
    else
      send(500, "text/html; charset=utf-8", errorPage(500, "Something went wrong", "The demo is still available. Return to the dashboard and try again.", requestId));
  }
  finally { db.close(); }
});
server.listen(PORT, HOST, () => structuredLog("server_started", { host: HOST, port: PORT, mode: appMode() }));
