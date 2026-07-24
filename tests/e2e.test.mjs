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
  for (const text of ["DEMO ENVIRONMENT", "Ibrahim Musa", "Apollo International Cardiac Centre", "Mock quote", "Integration readiness"]) {
    assert.match(html, new RegExp(text));
  }
  db.close(); rmSync(dir, { recursive: true, force: true });
});
