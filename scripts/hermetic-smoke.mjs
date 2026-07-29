import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "../lib/env.mjs";

// Load the same .env the spawned server will load, so CONSOLE_TOKEN (and any other
// gate) is visible to this process too -- otherwise the smoke-test child below can't
// authenticate against operator routes the server just started gating.
loadEnv();

const root = fileURLToPath(new URL("..", import.meta.url));
const dir = mkdtempSync(join(tmpdir(), "canopuscare-smoke-"));
const database = join(dir, "smoke.db");
const port = String(5200 + Math.floor(Math.random() * 400));
const env = {
  ...process.env,
  APP_MODE: "demo",
  POST_LIVE: "0",
  ALLOW_DEMO_HEADER_AUTH: "1",
  PORT: port,
  DATABASE_PATH: database,
};
const server = spawn(process.execPath, ["--experimental-sqlite", "scripts/start-app.mjs"], {
  cwd: root,
  env,
  stdio: ["ignore", "pipe", "pipe"],
});
let output = "";
server.stdout.on("data", (chunk) => { output += chunk; });
server.stderr.on("data", (chunk) => { output += chunk; });

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/readiness`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`server did not become ready\n${output}`);
}

async function runSmoke() {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["scripts/smoke-test.mjs"], {
      cwd: root,
      env: { ...env, SMOKE_BASE_URL: `http://127.0.0.1:${port}` },
      stdio: "inherit",
    });
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`smoke exited ${code}`)));
  });
}

try {
  await waitForServer();
  await runSmoke();
} finally {
  server.kill();
  rmSync(dir, { recursive: true, force: true });
}
