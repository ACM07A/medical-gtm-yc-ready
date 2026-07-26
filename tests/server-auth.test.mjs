import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

test("public demo, signed hospital session and operator token enforce the route matrix", async () => {
  const dir = mkdtempSync(join(tmpdir(), "canopus-auth-server-"));
  const port = String(5600 + Math.floor(Math.random() * 200));
  const env = {
    ...process.env,
    APP_MODE: "demo",
    POST_LIVE: "0",
    PORT: port,
    DATABASE_PATH: join(dir, "auth.db"),
    APP_BASE_URL: `http://127.0.0.1:${port}`,
    SESSION_SECRET: "test-session-secret-at-least-32-characters",
    CONSOLE_TOKEN: "operator-test-token",
    DEMO_PASSWORD: "canopus-demo",
  };
  const child = spawn(process.execPath, ["--experimental-sqlite", "scripts/start-app.mjs"], {
    cwd: root,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  const base = `http://127.0.0.1:${port}`;

  try {
    let ready = false;
    for (let attempt = 0; attempt < 80; attempt++) {
      try {
        if ((await fetch(`${base}/api/health`)).ok) { ready = true; break; }
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    assert.equal(ready, true, output);

    for (const path of ["/demo", "/cases", "/vendors", "/audit"])
      assert.equal((await fetch(base + path)).status, 200, path);
    const root = await fetch(`${base}/`, { redirect: "manual" });
    assert.equal(root.status, 302);
    assert.equal(root.headers.get("location"), "/demo");
    assert.equal((await fetch(`${base}/console`)).status, 401);
    assert.equal((await fetch(`${base}/site/index.html`)).status, 401);
    assert.equal((await fetch(`${base}/api/studio/approve`, { method: "POST" })).status, 401);

    const login = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "hospital@canopuscare.demo", password: "canopus-demo" }),
    });
    assert.equal(login.status, 200);
    const cookie = login.headers.get("set-cookie")?.split(";")[0];
    assert.match(cookie, /^canopus_session=/);
    const cases = await (await fetch(`${base}/api/cases`, { headers: { cookie } })).json();
    assert.deepEqual(cases.cases.map((row) => row.id), ["case_ibrahim_musa"]);
    const firstTransition = await fetch(`${base}/api/cases/CASE-DEMO-001/transition`, {
      method: "POST",
      headers: { cookie, origin: base, "content-type": "application/json" },
      body: JSON.stringify({ state: "hospital_reviewing" }),
    });
    assert.equal(firstTransition.status, 200);
    const persistedCase = await (await fetch(`${base}/api/cases/CASE-DEMO-001`, { headers: { cookie } })).json();
    assert.equal(persistedCase.case.current_stage, "hospital_reviewing");
    assert.ok(persistedCase.case.audit.some((event) => event.action === "case_transition"));

    const blockedLogin = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "admin@canopuscare.demo", password: "canopus-demo" }),
    });
    const adminCookie = blockedLogin.headers.get("set-cookie")?.split(";")[0];
    const blockedTransition = await fetch(`${base}/api/cases/CASE-DEMO-002/transition`, {
      method: "POST",
      headers: { cookie: adminCookie, origin: base, "content-type": "application/json" },
      body: JSON.stringify({ state: "ready_to_share" }),
    });
    assert.equal(blockedTransition.status, 403);
    assert.equal((await blockedTransition.json()).error.code, "COMPLIANCE_BLOCKED");

    const forgedTransition = await fetch(`${base}/api/cases/CASE-DEMO-001/transition`, {
      method: "POST",
      headers: { cookie, origin: "https://attacker.example", "content-type": "application/json" },
      body: JSON.stringify({ state: "response_received" }),
    });
    assert.equal(forgedTransition.status, 403);
    assert.equal((await forgedTransition.json()).error.code, "ORIGIN_REJECTED");

    const missingPage = await fetch(`${base}/does-not-exist`);
    assert.equal(missingPage.status, 404);
    assert.match(await missingPage.text(), /Page not found/);

    const basic = Buffer.from(`reviewer:${env.CONSOLE_TOKEN}`).toString("base64");
    assert.equal((await fetch(`${base}/console`, { headers: { authorization: `Basic ${basic}` } })).status, 200);
  } finally {
    child.kill();
    rmSync(dir, { recursive: true, force: true });
  }
});
