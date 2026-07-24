import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const nodeMajor = Number(process.versions.node.split(".")[0]);
if (nodeMajor < 22) {
  console.error(`Node ${process.versions.node} found. MedYatra requires Node >=22.5 for node:sqlite.`);
  process.exit(1);
}

for (const p of ["outputs", "outputs/backups", "data-core"]) mkdirSync(join(ROOT, p), { recursive: true });
process.env.APP_MODE ||= "demo";
process.env.POST_LIVE = "0";

async function run(cmd, args) {
  await new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd: ROOT, stdio: "inherit", shell: process.platform === "win32", env: process.env });
    p.on("exit", (code) => code ? reject(new Error(`${cmd} ${args.join(" ")} exited ${code}`)) : resolve());
  });
}

if (!existsSync(join(ROOT, "data-core", "medyatra.db"))) {
  await run("npm", ["run", "db:seed"]);
} else {
  console.log("✓ Existing database found; not overwriting. Use npm run db:reset-demo to reset in APP_MODE=demo.");
}

const port = process.env.PORT || "5173";
const server = spawn("node", ["--experimental-sqlite", "server/server.mjs"], { cwd: ROOT, shell: process.platform === "win32", env: { ...process.env, PORT: port } });
server.stdout.on("data", (d) => process.stdout.write(d));
server.stderr.on("data", (d) => process.stderr.write(d));

async function waitHealth() {
  const url = `http://localhost:${port}/api/readiness`;
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("server did not become ready");
}

try {
  await waitHealth();
  await run("npm", ["run", "smoke"]);
  const ready = await (await fetch(`http://localhost:${port}/api/readiness`)).json();
  console.log("\nMedYatra YC demo is running");
  console.log(`Demo hub:     http://localhost:${port}/demo`);
  console.log(`Hospital:     http://localhost:${port}/hospital`);
  console.log(`Agent portal: http://localhost:${port}/agent`);
  console.log(`Case:         http://localhost:${port}/cases/case_ibrahim_musa`);
  console.log(`Credentials:  admin@medyatra.demo / ${ready.demo_credentials?.password || "configured password"}`);
  console.log(`Integrations: ${ready.integrations.map((i) => `${i.provider}=${i.status}`).join(", ")}`);
  console.log("\nPress Ctrl+C to stop.");
} catch (e) {
  console.error(e.message);
  server.kill();
  process.exit(1);
}

process.on("SIGINT", () => { server.kill(); process.exit(0); });
