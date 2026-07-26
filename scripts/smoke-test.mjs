const base = process.env.SMOKE_BASE_URL || process.env.APP_BASE_URL || "http://localhost:5173";

const checks = [
  ["GET", "/api/health"],
  ["GET", "/api/readiness"],
  ["GET", "/api/session"],
  ["GET", "/api/cases"],
  ["GET", "/api/cases/case_ibrahim_musa/documents"],
  ["GET", "/api/cases/case_ibrahim_musa/matches"],
  ["GET", "/api/cases/case_ibrahim_musa/estimates"],
  ["GET", "/api/approvals"],
  ["GET", "/api/tasks"],
  ["GET", "/api/vendors"],
  ["GET", "/api/service-requests"],
  ["GET", "/api/agent-runs"],
  ["GET", "/api/integrations"],
  ["GET", "/api/audit"],
  ["GET", "/api/metrics"],
  ["GET", "/api/markets"],
  ["GET", "/api/vault"],
  ["GET", "/api/economics"],
  ["GET", "/demo"],
  ["GET", "/login"],
  ["GET", "/readiness"],
  ["GET", "/hospital"],
  ["GET", "/agent"],
  ["GET", "/cases"],
  ["GET", "/cases/case_ibrahim_musa"],
  ["GET", "/cases/CASE-DEMO-001"],
  ["GET", "/vendors"],
  ["GET", "/agents"],
  ["GET", "/studio"],
  ["GET", "/console"],
  ["GET", "/integrations"],
  ["GET", "/audit"],
  ["GET", "/journey"],
  ["GET", "/docs/YC_REVIEWER_GUIDE.md"],
  ["GET", "/docs/VENDOR_DEPLOYMENT_READINESS.md"],
  ["GET", "/docs/PRODUCTION_LAUNCH_RUNBOOK.md"],
];

let failed = 0;
for (const [method, path] of checks) {
  try {
    const res = await fetch(base + path, { method, headers: { "x-demo-user": "admin@canopuscare.demo" } });
    const ok = res.status >= 200 && res.status < 400;
    console.log(`${ok ? "✓" : "✗"} ${method} ${path} -> ${res.status}`);
    if (!ok) failed++;
  } catch (e) {
    console.log(`✗ ${method} ${path} -> ${e.message}`);
    failed++;
  }
}

const healthBody = await (await fetch(base + "/api/health")).json();
const readinessBody = await (await fetch(base + "/api/readiness")).json();
const statusShapeOk = healthBody.service === "canopus-care"
  && healthBody.database === "ok"
  && healthBody.seed === "loaded"
  && readinessBody.components?.some((item) => item.name === "patient_intake" && item.status === "READY")
  && readinessBody.components?.some((item) => item.name === "payments" && item.status === "DISABLED");
console.log(`${statusShapeOk ? "✓" : "✗"} health/readiness response shape`);
if (!statusShapeOk) failed++;

const ingest = await fetch(base + "/api/lead/ingest", {
  method: "POST",
  headers: { "content-type": "application/json", "x-ingest-token": "bad-token" },
  body: JSON.stringify({ source: "trudoc-demo", leads: [] }),
});
console.log(`${ingest.status === 401 ? "✓" : "✗"} POST /api/lead/ingest invalid token -> ${ingest.status}`);
if (ingest.status !== 401) failed++;

const login = await fetch(base + "/api/auth/login", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: "hospital@canopuscare.demo", password: process.env.DEMO_PASSWORD || "canopus-demo" }),
});
const cookie = login.headers.get("set-cookie")?.split(";")[0] || "";
const scopedCases = cookie ? await fetch(base + "/api/cases", { headers: { cookie } }) : null;
const scopedBody = scopedCases ? await scopedCases.json() : {};
const cookieLoginOk = login.status === 200
  && cookie.startsWith("canopus_session=")
  && scopedCases?.status === 200
  && scopedBody.cases?.length === 1
  && scopedBody.cases[0].assigned_hospital_org_id === "org_hospital_apollo";
console.log(`${cookieLoginOk ? "✓" : "✗"} POST /api/auth/login + cookie-scoped hospital cases -> ${login.status}`);
if (!cookieLoginOk) failed++;

const invalidLogin = await fetch(base + "/api/auth/login", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: "hospital@canopuscare.demo", password: "wrong" }),
});
console.log(`${invalidLogin.status === 401 ? "✓" : "✗"} POST /api/auth/login invalid credentials -> ${invalidLogin.status}`);
if (invalidLogin.status !== 401) failed++;

const logout = await fetch(base + "/api/auth/logout", { method: "POST", headers: { cookie, origin: base } });
const logoutOk = logout.status === 200 && /Max-Age=0/i.test(logout.headers.get("set-cookie") || "");
console.log(`${logoutOk ? "✓" : "✗"} POST /api/auth/logout clears session -> ${logout.status}`);
if (!logoutOk) failed++;

const anonymousMutation = await fetch(base + "/api/approvals/approval_estimate_release/approve", { method: "POST" });
console.log(`${anonymousMutation.status === 403 ? "✓" : "✗"} POST approval as anonymous read-only -> ${anonymousMutation.status}`);
if (anonymousMutation.status !== 403) failed++;

const adminLogin = await fetch(base + "/api/auth/login", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: "admin@canopuscare.demo", password: process.env.DEMO_PASSWORD || "canopus-demo" }),
});
const adminCookie = adminLogin.headers.get("set-cookie")?.split(";")[0] || "";
const blockedApproval = await fetch(base + "/api/approvals/approval_blocked_consent/approve", {
  method: "POST",
  headers: { cookie: adminCookie, origin: base },
});
const blockedBody = await blockedApproval.json();
const complianceBlocked = blockedApproval.status === 403 && blockedBody.error?.code === "COMPLIANCE_BLOCKED";
console.log(`${complianceBlocked ? "✓" : "✗"} POST consent-blocked approval remains blocked -> ${blockedApproval.status}`);
if (!complianceBlocked) failed++;

const approvedEstimate = await fetch(base + "/api/approvals/approval_estimate_release/approve", {
  method: "POST",
  headers: { cookie: adminCookie, origin: base },
});
const approvedBody = await approvedEstimate.json();
const estimateApproved = approvedEstimate.status === 200 && approvedBody.approval?.status === "Approved";
console.log(`${estimateApproved ? "✓" : "✗"} POST synthetic estimate approval -> ${approvedEstimate.status}`);
if (!estimateApproved) failed++;

const csvPreview = await fetch(base + "/api/lead/preview-csv", {
  method: "POST",
  headers: { "content-type": "application/json", "x-ingest-token": "demo-ingest-trudoc" },
  body: JSON.stringify({
    source: "trudoc-demo",
    csv: "country,treatment,phone,consent\nNigeria,cardiac bypass,+2345550188,true",
  }),
});
const csvPreviewBody = await csvPreview.json();
const csvPreviewOk = csvPreview.status === 200 && csvPreviewBody.summary?.ready === 1;
console.log(`${csvPreviewOk ? "✓" : "✗"} POST /api/lead/preview-csv -> ${csvPreview.status}`);
if (!csvPreviewOk) failed++;

if (failed) {
  console.error(`Smoke failed: ${failed} check(s) failed`);
  process.exit(1);
}
console.log("✓ Smoke checks passed");
