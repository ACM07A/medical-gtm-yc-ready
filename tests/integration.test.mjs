import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { open } from "../data-core/db.mjs";
import { ensureOsSchema, seedDemoOs } from "../data-core/os_core.mjs";
import { ingestLeads } from "../data-core/ingest.mjs";
import { apiAgentRuns, apiAudit, apiCase, apiCaseResource, apiServiceRequests } from "../server/os_pages.mjs";

function seededDb() {
  const dir = mkdtempSync(join(tmpdir(), "medyatra-integration-"));
  const db = open(join(dir, "test.db"));
  ensureOsSchema(db);
  seedDemoOs(db);
  return { db, dir };
}

test("golden cardiac case contains matches, estimate, vendors, tasks and audit", () => {
  const { db, dir } = seededDb();
  const c = apiCase(db, { role: "platform_admin", organization_id: "org_platform" }, "case_ibrahim_musa");
  assert.equal(c.synthetic_name, "Ibrahim Musa");
  assert.ok(c.matches.length >= 3);
  assert.ok(c.estimates.length >= 1);
  assert.ok(c.services.length >= 3);
  assert.ok(c.tasks.length >= 4);
  assert.ok(c.audit.length >= 1);
  db.close(); rmSync(dir, { recursive: true, force: true });
});

test("lead ingestion validates token, category, market and consent", () => {
  const { db, dir } = seededDb();
  const bad = ingestLeads(db, { source: "trudoc-demo", token: "wrong", leads: [] });
  assert.equal(bad.ok, false);
  const good = ingestLeads(db, { source: "trudoc-demo", token: "demo-ingest-trudoc", leads: [
    { country: "NG", treatment: "cardiac bypass", phone: "+2345550123", consent: true },
    { country: "Neverland", treatment: "cardiac", phone: "+1000", consent: true },
    { country: "NG", treatment: "unknown thing", phone: "+1001", consent: true },
  ] });
  assert.equal(good.ok, true);
  assert.equal(good.accepted, 1);
  assert.equal(good.rejected.length, 2);
  db.close(); rmSync(dir, { recursive: true, force: true });
});

test("operational API readers enforce case and organization scope", () => {
  const { db, dir } = seededDb();
  const hospital = { role: "hospital_ops", organization_id: "org_hospital_apollo" };
  const vendor = { role: "vendor_ops", organization_id: "org_vendor_blr" };
  assert.ok(apiCaseResource(db, hospital, "case_ibrahim_musa", "documents").length > 0);
  assert.equal(apiCaseResource(db, hospital, "case_amina_okoro", "documents"), null);
  assert.ok(apiAgentRuns(db, hospital).every((r) => r.organization_id === "org_hospital_apollo"));
  assert.ok(apiAudit(db, hospital).every((r) => r.organization_id === "org_hospital_apollo"));
  assert.ok(apiServiceRequests(db, vendor).every((r) => r.vendor_organization_id === "org_vendor_blr"));
  db.close(); rmSync(dir, { recursive: true, force: true });
});
