const base = process.env.SMOKE_BASE_URL || process.env.APP_BASE_URL || "http://localhost:5173";

const checks = [
  ["GET", "/api/health"],
  ["GET", "/api/readiness"],
  ["GET", "/api/session"],
  ["GET", "/api/cases"],
  ["GET", "/api/metrics"],
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
];

let failed = 0;
for (const [method, path] of checks) {
  try {
    const res = await fetch(base + path, { method, headers: { "x-demo-user": "admin@medyatra.demo" } });
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

if (failed) {
  console.error(`Smoke failed: ${failed} check(s) failed`);
  process.exit(1);
}
console.log("✓ Smoke checks passed");
