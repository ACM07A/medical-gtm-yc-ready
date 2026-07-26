import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { open } from "../data-core/db.mjs";
import { ensureOsSchema, seedDemoOs } from "../data-core/os_core.mjs";
import { renderAgent, renderCase, renderHospital, renderIntegrations, renderVendors } from "../server/os_pages.mjs";

test("browser-rendered golden path pages include required demo surfaces", () => {
  const dir = mkdtempSync(join(tmpdir(), "medyatra-e2e-"));
  const db = open(join(dir, "test.db"));
  ensureOsSchema(db);
  seedDemoOs(db);
  const admin = { role: "platform_admin", organization_id: "org_platform" };
  const html = [
    renderAgent(db, admin),
    renderHospital(db, admin),
    renderCase(db, admin, "case_ibrahim_musa"),
    renderVendors(db),
    renderIntegrations(db),
  ].join("\n");
  for (const text of ["CanopusCare", "DEMO ENVIRONMENT", "Ibrahim Musa", "Demo Cardiac Centre A", "No affiliation", "Mock quote", "Integration readiness"]) {
    assert.match(html, new RegExp(text));
  }
  assert.doesNotMatch(html, /Apollo International|Fortis International|Sir Ganga Ram/);
  assert.match(html, /<span class="badge forecast">Forecast<\/span>/);
  assert.doesNotMatch(html, /&lt;span class=&quot;badge/);
  assert.match(html, /class="brand-lockup"/);
  assert.match(html, /class="nav-label">Cases<\/span>/);
  assert.match(html, /--brand-500:#2F6BFF/);
  assert.match(html, /font-family:"Inter","Manrope"/);
  assert.match(html, /grid-template-rows:auto auto 1fr/);
  assert.match(html, /class="compact-user"/);
  db.close(); rmSync(dir, { recursive: true, force: true });
});
