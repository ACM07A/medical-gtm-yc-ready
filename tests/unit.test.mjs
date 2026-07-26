import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { open } from "../data-core/db.mjs";
import { DEMO_PASSWORD, authenticateDemoUser, ensureOsSchema, passwordHash, readinessReport, seedDemoOs } from "../data-core/os_core.mjs";
import { apiCase, apiCases, getSession } from "../server/os_pages.mjs";
import { requiresConsoleToken } from "../server/access.mjs";
import { createSessionToken, sessionCookie, sessionMutationOriginAllowed, verifySessionToken } from "../server/session.mjs";

function seededDb() {
  const dir = mkdtempSync(join(tmpdir(), "medyatra-test-"));
  const db = open(join(dir, "test.db"));
  ensureOsSchema(db);
  seedDemoOs(db);
  return { db, dir };
}

test("demo users use deterministic non-production password hash", () => {
  const { db, dir } = seededDb();
  const user = db.prepare(`SELECT * FROM app_user WHERE email='reviewer@canopuscare.com'`).get();
  assert.equal(user.password_hash, passwordHash(DEMO_PASSWORD));
  db.close(); rmSync(dir, { recursive: true, force: true });
});

test("anonymous demo visitors receive read-only scope", () => {
  const { db, dir } = seededDb();
  const prior = process.env.APP_MODE;
  process.env.APP_MODE = "demo";
  const session = getSession(db, { headers: {} });
  assert.equal(session.role, "read_only");
  assert.equal(session.authenticated, false);
  assert.equal(apiCases(db, session).length, 2);
  if (prior == null) delete process.env.APP_MODE; else process.env.APP_MODE = prior;
  db.close(); rmSync(dir, { recursive: true, force: true });
});

test("signed cookie alone applies hospital case scope", () => {
  const { db, dir } = seededDb();
  const priorMode = process.env.APP_MODE;
  const priorSecret = process.env.SESSION_SECRET;
  process.env.APP_MODE = "demo";
  process.env.SESSION_SECRET = "test-session-secret-at-least-32-characters";
  const cookie = sessionCookie("user_hospital").split(";")[0];
  const session = getSession(db, { headers: { cookie } });
  assert.equal(session.role, "hospital_admin");
  assert.equal(session.authenticated, true);
  assert.deepEqual(apiCases(db, session).map((row) => row.id), ["case_ibrahim_musa"]);
  if (priorMode == null) delete process.env.APP_MODE; else process.env.APP_MODE = priorMode;
  if (priorSecret == null) delete process.env.SESSION_SECRET; else process.env.SESSION_SECRET = priorSecret;
  db.close(); rmSync(dir, { recursive: true, force: true });
});

test("session signatures reject tampering and expiration", () => {
  const priorMode = process.env.APP_MODE;
  const priorSecret = process.env.SESSION_SECRET;
  process.env.APP_MODE = "demo";
  process.env.SESSION_SECRET = "test-session-secret-at-least-32-characters";
  const now = Date.now();
  const token = createSessionToken("user_hospital", now);
  assert.equal(verifySessionToken(token, now)?.sub, "user_hospital");
  assert.equal(verifySessionToken(`${token.slice(0, -1)}x`, now), null);
  assert.equal(verifySessionToken(token, now + 9 * 60 * 60 * 1000), null);
  if (priorMode == null) delete process.env.APP_MODE; else process.env.APP_MODE = priorMode;
  if (priorSecret == null) delete process.env.SESSION_SECRET; else process.env.SESSION_SECRET = priorSecret;
});

test("session-cookie mutations require an allowed origin", () => {
  const prior = {
    APP_MODE: process.env.APP_MODE,
    APP_BASE_URL: process.env.APP_BASE_URL,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
    SESSION_SECRET: process.env.SESSION_SECRET,
  };
  Object.assign(process.env, {
    APP_MODE: "production",
    APP_BASE_URL: "https://demo.canopuscare.online",
    ALLOWED_ORIGINS: "https://demo.canopuscare.online",
    SESSION_SECRET: "test-session-secret-at-least-32-characters",
  });
  const cookie = sessionCookie("user_agent").split(";")[0];
  const request = (origin) => ({ method: "POST", headers: { cookie, ...(origin ? { origin } : {}) } });
  assert.equal(sessionMutationOriginAllowed(request("https://demo.canopuscare.online")), true);
  assert.equal(sessionMutationOriginAllowed(request("https://attacker.example")), false);
  assert.equal(sessionMutationOriginAllowed(request()), false);
  assert.equal(sessionMutationOriginAllowed({ method: "GET", headers: { cookie } }), true);
  for (const [key, value] of Object.entries(prior)) {
    if (value == null) delete process.env[key]; else process.env[key] = value;
  }
});

test("public OS and operator route posture is explicit", () => {
  for (const path of ["/demo", "/cases", "/cases/case_ibrahim_musa", "/vendors", "/audit", "/api/readiness", "/api/cases", "/login"])
    assert.equal(requiresConsoleToken(path), false, path);
  for (const path of ["/console", "/studio", "/sandbox", "/site/index.html", "/outputs/screenshots/landing-home.png", "/api/studio/approve", "/api/agents/triage", "/api/journey/run", "/api/economics"])
    assert.equal(requiresConsoleToken(path), true, path);
});

test("production readiness blocks a database containing demo users", () => {
  const { db, dir } = seededDb();
  const keys = ["APP_MODE", "SESSION_SECRET", "APP_BASE_URL", "CONSOLE_TOKEN", "ALLOWED_ORIGINS", "ENCRYPTION_KEY"];
  const prior = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  Object.assign(process.env, {
    APP_MODE: "production",
    SESSION_SECRET: "production-session-secret-at-least-32-characters",
    APP_BASE_URL: "https://demo.example.com",
    CONSOLE_TOKEN: "production-console-token",
    ALLOWED_ORIGINS: "https://demo.example.com",
    ENCRYPTION_KEY: "production-encryption-key-at-least-32-characters",
  });
  const report = readinessReport(db);
  assert.equal(report.status, "BLOCKED");
  assert.ok(report.missing.includes("DEMO_USERS_PRESENT"));
  for (const key of keys) {
    if (prior[key] == null) delete process.env[key]; else process.env[key] = prior[key];
  }
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
