import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { open } from "../data-core/db.mjs";
import { ensureOsSchema, seedDemoOs } from "../data-core/os_core.mjs";
import { renderAgent, renderCase, renderHospital, renderIntegrations, renderVendors } from "../server/os_pages.mjs";
import { renderDemo } from "../server/demo.mjs";

test("browser-rendered golden path pages include required demo surfaces", () => {
  const dir = mkdtempSync(join(tmpdir(), "medyatra-e2e-"));
  const db = open(join(dir, "test.db"));
  ensureOsSchema(db);
  seedDemoOs(db);
  const admin = { role: "platform_admin", organization_id: "org_platform" };
  const caseHtml = renderCase(db, admin, "case_ibrahim_musa");
  const demoHtml = renderDemo(db, { ...admin, authenticated: true, user: { email: "reviewer@canopuscare.com", name: "YC Demo Reviewer" } });
  const html = [
    renderAgent(db, admin),
    renderHospital(db, admin),
    caseHtml,
    renderVendors(db),
    renderIntegrations(db),
    demoHtml,
  ].join("\n");
  for (const text of ["Canopus Care", "DEMO ENVIRONMENT", "Ibrahim Musa", "Demo Cardiac Centre A", "No affiliation", "Structured quote", "Integration readiness"]) {
    assert.match(html, new RegExp(text));
  }
  assert.doesNotMatch(html, /Apollo International|Fortis International|Sir Ganga Ram/);
  assert.match(html, /<span class="badge forecast">Forecast<\/span>/);
  assert.doesNotMatch(html, /&lt;span class=&quot;badge/);
  assert.match(html, /class="brand-lockup"/);
  assert.match(html, /class="nav-label">Cases<\/span>/);
  assert.match(html, /--brand-500:#39745B/);
  assert.match(html, /font-family:"DM Sans","Segoe UI"/);
  assert.match(html, /h1,h2\{font-family:"Fraunces",Georgia,serif\}/);
  assert.match(html, /grid-template-rows:auto auto 1fr/);
  assert.match(html, /class="compact-user"/);
  for (const anchor of ["overview", "documents", "hospital-matches", "estimates", "messages", "tasks", "travel-support", "vendors", "timeline", "compliance", "audit-log"]) {
    assert.match(caseHtml, new RegExp(`href="#${anchor}"`), `${anchor} tab`);
    assert.match(caseHtml, new RegExp(`id="${anchor}"`), `${anchor} section`);
  }
  for (const target of ["#overview", "#documents", "#hospital-matches", "#estimates", "#travel-support", "#tasks"]) {
    assert.match(demoHtml, new RegExp(`href="/cases/CASE-DEMO-001${target}"`), `${target} journey link`);
  }
  assert.doesNotMatch(demoHtml, /Local setup|docker compose up --build/);
  assert.match(demoHtml, /Current reviewer session/);
  db.close(); rmSync(dir, { recursive: true, force: true });
});
