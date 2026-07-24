import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { open } from "../data-core/db.mjs";
import { DEMO_PASSWORD, authenticateDemoUser, ensureOsSchema, passwordHash, readinessReport, seedDemoOs } from "../data-core/os_core.mjs";
import { apiCase, apiCases, getSession } from "../server/os_pages.mjs";

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

test("demo credentials are unreachable outside demo mode", () => {
  const { db, dir } = seededDb();
  const prior = process.env.APP_MODE;
  process.env.APP_MODE = "production";
  assert.equal(authenticateDemoUser(db, "admin@canopuscare.demo", DEMO_PASSWORD), null);
  assert.equal(getSession(db, { headers: { "x-demo-user": "admin@canopuscare.demo" } }).role, "unauthenticated");
  process.env.APP_MODE = "demo";
  assert.equal(authenticateDemoUser(db, "admin@canopuscare.demo", DEMO_PASSWORD)?.id, "user_admin");
  if (prior == null) delete process.env.APP_MODE; else process.env.APP_MODE = prior;
  db.close(); rmSync(dir, { recursive: true, force: true });
});

test("OS commission and case projection use canonical engine data", () => {
  const { db, dir } = seededDb();
  const commission = db.prepare(`SELECT * FROM commission WHERE id='commission_ibrahim'`).get();
  assert.equal(commission.expected_amount, 2170);
  assert.match(commission.commercial_disclosure, /20% entry-tier/);
  const c = db.prepare(`SELECT * FROM patient_case WHERE id='case_ibrahim_musa'`).get();
  const lead = db.prepare(`SELECT * FROM lead WHERE id=?`).get(c.source_lead_id);
  assert.equal(lead.ref, "case-ibrahim-musa");
  assert.equal(lead.category_id, "cardiac");
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
