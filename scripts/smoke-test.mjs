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
  ["GET", "/hospital"],
  ["GET", "/agent"],
  ["GET", "/cases"],
  ["GET", "/cases/case_ibrahim_musa"],
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
  body: JSON.stringify({ email: "admin@canopuscare.demo", password: "canopuscare-demo" }),
});
console.log(`${login.status === 200 ? "✓" : "✗"} POST /api/auth/login demo credentials -> ${login.status}`);
if (login.status !== 200) failed++;

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
