import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { open } from "../data-core/db.mjs";
import { DEMO_PASSWORD, ensureOsSchema, passwordHash, readinessReport, seedDemoOs } from "../data-core/os_core.mjs";
import { apiCase, apiCases } from "../server/os_pages.mjs";

function seededDb() {
  const dir = mkdtempSync(join(tmpdir(), "medyatra-test-"));
  const db = open(join(dir, "test.db"));
  ensureOsSchema(db);
  seedDemoOs(db);
  return { db, dir };
}

test("demo users use deterministic non-production password hash", () => {
  const { db, dir } = seededDb();
  const user = db.prepare(`SELECT * FROM app_user WHERE email='admin@canopuscare.demo'`).get();
  assert.equal(user.password_hash, passwordHash(DEMO_PASSWORD));
  db.close(); rmSync(dir, { recursive: true, force: true });
});

test("consent gate leaves the exception case blocked", () => {
  const { db, dir } = seededDb();
  const c = db.prepare(`SELECT * FROM patient_case WHERE id='case_amina_okoro'`).get();
  assert.equal(c.consent_status, "missing");
  assert.equal(c.blockers, "CONSENT_REQUIRED");
  const approval = db.prepare(`SELECT * FROM approval WHERE id='approval_blocked_consent'`).get();
  assert.equal(approval.status, "Blocked");
  db.close(); rmSync(dir, { recursive: true, force: true });
});

test("role-scoped case access hides unrelated tenant data", () => {
  const { db, dir } = seededDb();
  const hospital = { role: "hospital_admin", organization_id: "org_hospital_apollo" };
  const vendor = { role: "vendor_operator", organization_id: "org_vendor_blr" };
  const hospitalCases = apiCases(db, hospital);
  assert.deepEqual(hospitalCases.map((c) => c.id), ["case_ibrahim_musa"]);
  assert.equal(apiCase(db, hospital, "case_amina_okoro"), null);
  assert.equal(apiCases(db, vendor).length, 1);
  db.close(); rmSync(dir, { recursive: true, force: true });
});

test("readiness report is ready in demo mode and keeps outbound disabled", () => {
  const { db, dir } = seededDb();
  process.env.APP_MODE = "demo";
  const report = readinessReport(db);
  assert.equal(report.status, "READY");
  assert.equal(report.external_actions, "DISABLED");
  assert.ok(report.integrations.some((i) => i.provider === "whatsapp" && i.status === "disabled"));
  db.close(); rmSync(dir, { recursive: true, force: true });
});
