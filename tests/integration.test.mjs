import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { open } from "../data-core/db.mjs";
import { ensureOsSchema, seedDemoOs } from "../data-core/os_core.mjs";
import { ingestLeads, parseLeadCsv, previewLeadCsv } from "../data-core/ingest.mjs";
import { apiAgentRuns, apiAudit, apiCase, apiCaseResource, apiServiceRequests, updateServiceRequest } from "../server/os_pages.mjs";
import { runFullJourney } from "../server/orchestrate.mjs";

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
  const updated = updateServiceRequest(db, vendor, requestId, { status: "Scheduled" });
  assert.equal(updated.ok, true);
  assert.equal(updated.service_request.status, "Scheduled");
  assert.equal(updated.service_request.quote_currency, "USD");
  assert.equal(updated.service_request.quote_amount, 630);
  assert.match(updated.service_request.audit_note, /vendor@canopuscare\.demo/);
  const forbidden = updateServiceRequest(db, { ...vendor, organization_id: "org_other" }, requestId, { status: "Completed" });
  assert.equal(forbidden.error.code, "FORBIDDEN");
  db.close(); rmSync(dir, { recursive: true, force: true });
});

test("service request lifecycle rejects skipped states, expired quotes and unexplained cancellation", () => {
  const { db, dir } = seededDb();
  const vendor = { role: "vendor_operator", organization_id: "org_vendor_blr", user: { id: "user_vendor", email: "vendor@canopuscare.demo" } };
  const requestId = db.prepare(`SELECT id FROM service_request WHERE vendor_id='vendor_interpreter'`).get().id;
  db.prepare(`UPDATE service_request SET status='Requested',quote_currency=NULL,quote_amount=NULL,quote_expires_at=NULL WHERE id=?`).run(requestId);

  const skipped = updateServiceRequest(db, vendor, requestId, { status: "Approved" });
  assert.equal(skipped.error.code, "INVALID_TRANSITION");
  assert.deepEqual(skipped.error.details.allowed, ["Accepted", "Declined"]);

  assert.equal(updateServiceRequest(db, vendor, requestId, { status: "Accepted" }).ok, true);
  const quoted = updateServiceRequest(db, vendor, requestId, {
    status: "Quoted",
    quote_currency: "usd",
    quote_amount: "95.50",
    quote_expires_at: "2020-01-01T00:00:00Z",
  });
  assert.equal(quoted.ok, true);
  assert.equal(quoted.service_request.quote_currency, "USD");
  assert.equal(quoted.service_request.quote_amount, 95.5);

  const expired = updateServiceRequest(db, vendor, requestId, { status: "Approved" });
  assert.equal(expired.error.code, "QUOTE_EXPIRED");

  db.prepare(`UPDATE service_request SET status='Scheduled',quote_expires_at=datetime('now','+1 day') WHERE id=?`).run(requestId);
  const unexplained = updateServiceRequest(db, vendor, requestId, { status: "Cancelled" });
  assert.equal(unexplained.error.code, "CANCELLATION_REASON_REQUIRED");
  const cancelled = updateServiceRequest(db, vendor, requestId, { status: "Cancelled", cancellation_reason: "Patient changed travel dates" });
  assert.equal(cancelled.ok, true);
  assert.ok(cancelled.service_request.cancelled_at);
  db.close(); rmSync(dir, { recursive: true, force: true });
});

test("journey orchestration updates the linked operational case", async () => {
  const { db, dir } = seededDb();
  const c = db.prepare(`SELECT source_lead_id FROM patient_case WHERE id='case_ibrahim_musa'`).get();
  const result = await runFullJourney(db, {
    leadId: c.source_lead_id,
    admissionDate: "2026-08-24",
    targetDepartureDate: "2026-08-21",
    dischargeDate: "2026-08-29",
  }, {
    familyUpdateFn: async () => ({ ok: true, text: "Synthetic family update preview" }),
    triageFn: async () => ({ key_facts: ["Synthetic intake"], method: "test" }),
    dischargeFn: async () => ({ text: "Synthetic discharge relay", method: "test" }),
    billingAdhocFn: async () => ({ text: "Synthetic variance explanation", method: "test" }),
  });
  assert.equal(result.leadId, c.source_lead_id);
  assert.ok(result.steps.length >= 10);
  const updated = db.prepare(`SELECT * FROM patient_case WHERE id='case_ibrahim_musa'`).get();
  assert.equal(updated.current_stage, "Journey orchestrated");
  assert.match(updated.next_best_action, /orchestration steps/);
  const audit = db.prepare(`SELECT * FROM audit_event WHERE action='journey_sync' AND subject_id='case_ibrahim_musa'`).get();
  assert.ok(audit);
  db.close(); rmSync(dir, { recursive: true, force: true });
});

test("existing synthetic demo rows are hardened without resetting the database", () => {
  const { db, dir } = seededDb();
  db.prepare(`UPDATE patient_case SET source_lead_id=NULL,synthetic_identifier='MYT-NG-CABG-001' WHERE id='case_ibrahim_musa'`).run();
  db.prepare(`UPDATE organization SET name='Apollo International Cardiac Centre' WHERE id='org_hospital_apollo'`).run();
  db.prepare(`UPDATE vendor SET rating=4.7 WHERE id='vendor_interpreter'`).run();
  db.prepare(`UPDATE commission SET expected_amount=1627.5,commercial_disclosure='Synthetic 15% facilitation share' WHERE id='commission_ibrahim'`).run();

  ensureOsSchema(db);

  const c = db.prepare(`SELECT * FROM patient_case WHERE id='case_ibrahim_musa'`).get();
  assert.ok(c.source_lead_id);
  assert.equal(c.synthetic_identifier, "CNP-NG-CABG-001");
  assert.equal(db.prepare(`SELECT name FROM organization WHERE id='org_hospital_apollo'`).get().name, "Demo Cardiac Centre A");
  assert.equal(db.prepare(`SELECT rating FROM vendor WHERE id='vendor_interpreter'`).get().rating, null);
  assert.equal(db.prepare(`SELECT expected_amount FROM commission WHERE id='commission_ibrahim'`).get().expected_amount, 2170);
  db.close(); rmSync(dir, { recursive: true, force: true });
});
