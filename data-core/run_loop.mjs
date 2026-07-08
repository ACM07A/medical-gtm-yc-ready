// FACTORY RUNNER — one autonomous cycle of the free/local agents, in order, logging a cycle
// boundary so it's visible in the console. Schedule this (Windows Task Scheduler / cron) to run the
// whole factory unattended. GLM generation (gen_content/gen_outreach) is separate (costs tokens);
// this cycle is the zero-marginal-cost processing loop: QA -> research -> publish -> outreach send.
//   node --experimental-sqlite data-core/run_loop.mjs
import { open, logRun } from "./db.mjs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const HERE = dirname(fileURLToPath(import.meta.url));

let db = open(); logRun(db, "System", "Factory cycle start", new Date().toLocaleTimeString()); db.close();

// Steps run in order; each is a standalone Node script that needs NO Claude — so this whole cycle is
// the "Claude hit its usage limit" handoff: schedule it (Windows Task Scheduler / cron) and the factory
// keeps advancing. Generation uses the tier-2 FAILOVER chain (GLM-5.2 → llama-70b → llama-8b), so it
// survives GLM being down too. Set DISCOVER=1 (with STEALTH=1) to include the browser POC discovery.
const steps = [
  ["Partner layer (CRM backbone)", "partner_layer.mjs", []],
  ["Research worklist", "research_worklist.mjs", []],
  process.env.DISCOVER === "1" ? ["POC discovery (stealth Google→LinkedIn)", "discover_pocs.mjs", ["6"]] : null,
  ["Email inference", "infer_contacts.mjs", []],
  ["Repurpose content → social (GLM/failover)", "repurpose_content.mjs", [process.env.REPURPOSE_PAGES || "1"]],
  ["QA reviewer", "qa_content.mjs", []],
  ["Sourcing research (free web)", "sourcing_research.mjs", []],
  ["Publisher (local site)", "publish_site.mjs", []],
  ["Outreach sender (outbox)", "send_outreach.mjs", []],
].filter(Boolean);
for (const [name, script, args] of steps) {
  console.log(`\n=== ${name} ===`);
  try { execFileSync(process.execPath, ["--experimental-sqlite", join(HERE, script), ...args], { stdio: "inherit", env: process.env }); }
  catch { console.log(`(${name} step reported an issue — continuing)`); }
}
db = open(); logRun(db, "System", "Factory cycle complete", "QA · research · publish · outreach"); db.close();
console.log("\n✓ factory cycle done.");
