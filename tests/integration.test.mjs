import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { open } from "../data-core/db.mjs";
import { ensureOsSchema, seedDemoOs } from "../data-core/os_core.mjs";
import { ingestLeads, parseLeadCsv, previewLeadCsv } from "../data-core/ingest.mjs";
import { apiAgentRuns, apiAudit, apiCase, apiCaseResource, apiServiceRequests, updateServiceRequest } from "../server/os_pages.mjs";

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

test("CSV lead preview maps columns and reports invalid and duplicate rows without writing", () => {
  const { db, dir } = seededDb();
  const csv = [
    "Patient Country,Requested Procedure,Phone,Opt In,Urgency",
    'Nigeria,"cardiac bypass","+234 555 0111",yes,soon',
    'Nigeria,"cardiac bypass","+234 555 0111",yes,soon',
    'Neverland,"cardiac bypass","+1000",no,planning',
  ].join("\n");
  const mapping = {
    country: "Patient Country",
    treatment: "Requested Procedure",
    contact: "Phone",
    consent: "Opt In",
    urgency: "Urgency",
  };
  const before = db.prepare(`SELECT count(*) c FROM lead`).get().c;
  const preview = previewLeadCsv(db, { source: "trudoc-demo", token: "demo-ingest-trudoc", csv, mapping });
  assert.equal(preview.ok, true);
  assert.deepEqual(preview.summary, { received: 3, ready: 1, held_no_consent: 0, duplicates: 1, rejected: 1 });
  assert.equal(preview.rows[0].ref, "***0111");
  assert.equal(db.prepare(`SELECT count(*) c FROM lead`).get().c, before);
  assert.equal(parseLeadCsv("country,treatment\nNG,cardiac").ok, false);
  db.close(); rmSync(dir, { recursive: true, force: true });
});

test("vendor can update only service requests assigned to its organization", () => {
  const { db, dir } = seededDb();
  const vendor = { role: "vendor_operator", organization_id: "org_vendor_blr", user: { id: "user_vendor", email: "vendor@canopuscare.demo" } };
  const requestId = db.prepare(`SELECT id FROM service_request WHERE vendor_id='vendor_interpreter'`).get().id;
  const updated = updateServiceRequest(db, vendor, requestId, { status: "Quoted", mock_quote: "USD 95 mock quote" });
  assert.equal(updated.ok, true);
  assert.equal(updated.service_request.status, "Quoted");
  assert.match(updated.service_request.audit_note, /vendor@canopuscare\.demo/);
  const forbidden = updateServiceRequest(db, { ...vendor, organization_id: "org_other" }, requestId, { status: "Completed" });
  assert.equal(forbidden.error.code, "FORBIDDEN");
  db.close(); rmSync(dir, { recursive: true, force: true });
});
