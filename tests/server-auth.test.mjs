import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

test("public landing, signed app session and operator token enforce the route matrix", async () => {
  const dir = mkdtempSync(join(tmpdir(), "canopus-auth-server-"));
  const port = String(5600 + Math.floor(Math.random() * 200));
  const reviewerPassword = "test-reviewer-password-not-for-production";
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
    DEMO_REVIEWER_PASSWORD: reviewerPassword,
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

    for (const path of ["/demo", "/concierge", "/cases", "/cases/CASE-DEMO-002", "/vendors", "/audit", "/workflows", "/docs/YC_REVIEWER_GUIDE.md"]) {
      const response = await fetch(base + path, { redirect: "manual" });
      assert.equal(response.status, 302, path);
      assert.match(response.headers.get("location") || "", /^\/login\?next=/, path);
    }
    const forgedDemoHeader = await fetch(`${base}/workflows`, {
      redirect: "manual",
      headers: { "x-demo-user": "admin@canopuscare.demo" },
    });
    assert.equal(forgedDemoHeader.status, 302);
    assert.equal((await fetch(`${base}/api/cases`)).status, 401);
    assert.equal((await fetch(`${base}/api/metrics`)).status, 401);
    const anonymousConcierge = await fetch(`${base}/api/concierge/ask`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ caseId: "case_ibrahim_musa", text: "What's the status?" }),
    });
    assert.equal(anonymousConcierge.status, 401);
    const landing = await fetch(`${base}/`);
    assert.equal(landing.status, 200);
    const landingHtml = await landing.text();
    assert.match(landingHtml, /<div id="root"><\/div>/);
    const scriptPath = landingHtml.match(/src="(\/landing-assets\/landing-[^"]+\.js)"/)?.[1];
    const stylePath = landingHtml.match(/href="(\/landing-assets\/landing-[^"]+\.css)"/)?.[1];
    assert.ok(scriptPath, "landing script path");
    assert.ok(stylePath, "landing stylesheet path");
    assert.doesNotMatch(landingHtml, /Apollo|Fortis|signed partner/i);
    assert.equal((await fetch(base + stylePath)).status, 200);
    const landingBundle = await fetch(base + scriptPath);
    assert.equal(landingBundle.status, 200);
    const landingBundleText = await landingBundle.text();
    assert.doesNotMatch(landingBundleText, /Apollo|Fortis|Mazumdar Shaw|signed partner/i);
    assert.doesNotMatch(landingBundleText, /without registration/i);
    assert.match(landingBundleText, /Reviewer Login|Sign in to Interactive Demo/);
    assert.equal((await fetch(`${base}/landing-assets/care-coordination-v2.jpg`)).status, 200);
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
    for (const path of ["/demo", "/concierge", "/cases", "/hospital", "/vendors", "/audit"])
      assert.equal((await fetch(base + path, { headers: { cookie } })).status, 200, path);
    const concierge = await fetch(`${base}/api/concierge/ask`, {
      method: "POST",
      headers: { cookie, origin: base, "content-type": "application/json" },
      body: JSON.stringify({ caseId: "case_ibrahim_musa", text: "What's the status?" }),
    });
    assert.equal(concierge.status, 200);
    assert.equal((await concierge.json()).intent, "status");

    const reviewerLogin = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "reviewer@canopuscare.com", password: reviewerPassword }),
    });
    assert.equal(reviewerLogin.status, 200);
    const reviewerCookie = reviewerLogin.headers.get("set-cookie")?.split(";")[0];
    const reviewerPages = ["/demo", "/cases/CASE-DEMO-001", "/concierge", "/hospital", "/agent", "/vendors", "/agents", "/workflows", "/integrations", "/audit"];
    for (const path of reviewerPages) {
      const response = await fetch(base + path, { headers: { cookie: reviewerCookie } });
      assert.equal(response.status, 200, path);
      const html = await response.text();
      assert.doesNotMatch(html, /href="\/(studio|console|sandbox|journey|benchmarks)/, path);
      assert.match(html, /aria-label="Sign out"/);
      if (path === "/demo") {
        assert.match(html, /Current reviewer session/);
        assert.doesNotMatch(html, /Local setup|docker compose up --build/);
        assert.doesNotMatch(html, /(?:src|href)="\/(?:site|console|studio|sandbox|journey|outputs)(?:\/|")/);
        assert.match(html, /src="\/landing-assets\/care-coordination-v2\.jpg"/);
      }
      if (path === "/workflows") {
        assert.match(html, /13 operational agents and the WhatsApp journey/);
        assert.match(html, /Outbound disabled/);
        assert.match(html, /href="\/agents\?preview=1#workflow-triage"/);
        assert.match(html, /Run deterministic preview/);
      }
    }
    assert.equal((await fetch(`${base}/docs/YC_REVIEWER_GUIDE.md`, { headers: { cookie: reviewerCookie } })).status, 200);
    assert.equal((await fetch(`${base}/api/metrics`, { headers: { cookie: reviewerCookie } })).status, 200);
    const previewPage = await fetch(`${base}/agents?preview=1`, { headers: { cookie: reviewerCookie } });
    assert.equal(previewPage.status, 200);
    const previewHtml = await previewPage.text();
    assert.match(previewHtml, /id="workflow-triage"/);
    assert.match(previewHtml, /database changes rolled back/);
    assert.match(previewHtml, /\/api\/agents\/.*\?preview=1/);
    const previewLeadId = Number(previewHtml.match(/data-f="leadId" value="(\d+)"/)?.[1]);
    assert.ok(previewLeadId > 0);

    const previewRun = await fetch(`${base}/api/agents/family-update-add?preview=1`, {
      method: "POST",
      headers: { cookie: reviewerCookie, origin: base, "content-type": "application/json" },
      body: JSON.stringify({ leadId: previewLeadId, name: "Preview Contact", phone: "+96800000000", relationship: "spouse" }),
    });
    const previewRunBody = await previewRun.text();
    assert.equal(previewRun.status, 200, previewRunBody);
    const previewResult = JSON.parse(previewRunBody);
    assert.equal(previewResult.preview, true);
    assert.equal(previewResult.persisted, false);
    assert.equal((await fetch(`${base}/api/agents/family-update-add`, {
      method: "POST",
      headers: { cookie: reviewerCookie, origin: base, "content-type": "application/json" },
      body: JSON.stringify({ leadId: previewLeadId, name: "Blocked Contact", phone: "+96800000001", relationship: "spouse" }),
    })).status, 401);
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
    await new Promise((resolve) => {
      if (child.exitCode != null) return resolve();
      child.once("exit", resolve);
      child.kill();
      setTimeout(resolve, 1500);
    });
    rmSync(dir, { recursive: true, force: true });
  }
});
