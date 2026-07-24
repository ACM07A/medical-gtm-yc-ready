// Rebuilds the deterministic demo state. Browser-rendered extras are opt-in so a bare clone and CI seed fast.
//   npm run demo
//   SEED_BROWSER=1 npm run demo  (requires CHROME_PATH/EDGE_PATH or a known browser installation)
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "../lib/env.mjs";

loadEnv();
const HERE = dirname(fileURLToPath(import.meta.url));
const hasGenKey = !!(process.env.GEMINI_API_KEY || process.env.NVIDIA_API_KEY);
const generationRequested = process.env.SEED_GENERATION === "1";
const browserRequested = process.env.SEED_BROWSER === "1";
const browserAvailable = browserRequested && [
  process.env.CHROME_PATH,
  process.env.EDGE_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean).some(existsSync);

const steps = [
  { script: "seed.mjs", fatal: true, note: "structure, categories, partners, POCs and cornerstone content" },
  { script: "seed_runs.mjs", note: "activity feed" },
  { script: "import_content.mjs", note: "generated content cells from committed files" },
  { script: "seed_reference_prices.mjs", note: "price-ladder rungs" },
  { script: "seed_tenants.mjs", note: "own-brand and demo operator" },
  { script: "seed_leads.mjs", note: "synthetic journey leads" },
  { script: "seed_os.mjs", fatal: true, note: "CanopusCare OS roles, cases, vendors and audit" },
  { script: "gen_comms.mjs", browser: true, note: "WhatsApp templates and infographic headers" },
  { script: "gen_header_datauris.mjs", browser: true, note: "sandbox header data URIs" },
  { script: "set_regulatory.mjs", args: ["GB", "verified", "DEMO clearance - illustrative, not legal sign-off"], note: "demo-clear GB" },
  { script: "set_regulatory.mjs", args: ["IE", "verified", "DEMO clearance - illustrative, not legal sign-off"], note: "demo-clear IE" },
  { script: "set_regulatory.mjs", args: ["KE", "verified", "DEMO clearance - illustrative, not legal sign-off"], note: "demo-clear KE" },
  { script: "qa_content.mjs", note: "promote passing English drafts to review" },
  { script: "publish_site.mjs", note: "publish cleared and reviewed guides" },
].filter((step) => !step.browser || browserAvailable);

if (generationRequested && hasGenKey) steps.push({
  script: "repurpose_content.mjs",
  args: ["2"],
  env: { FORCE: "1" },
  note: "seed two pages into the distribution queue",
});

console.log(`\nCanopusCare demo bootstrap - ${steps.length} steps`);
if (!browserAvailable)
  console.log("Browser rendering skipped immediately. Set SEED_BROWSER=1 with CHROME_PATH or EDGE_PATH to enable it.\n");
if (!generationRequested)
  console.log("Model generation skipped. Set SEED_GENERATION=1 with a configured provider key to enable it.\n");

let ok = 0, failed = 0;
for (const step of steps) {
  const label = `${step.script}${step.args ? ` ${step.args.join(" ")}` : ""}`;
  process.stdout.write(`  - ${label.padEnd(46)} `);
  try {
    execFileSync("node", ["--experimental-sqlite", join(HERE, step.script), ...(step.args || [])], {
      stdio: ["ignore", "ignore", "ignore"],
      env: { ...process.env, ...(step.env || {}) },
      timeout: 60_000,
    });
    console.log(`OK  ${step.note}`);
    ok++;
  } catch (error) {
    console.log(`SKIP  ${String(error.message || error).split("\n")[0].slice(0, 48)} - ${step.note}`);
    failed++;
    if (step.fatal) {
      console.error(`\nFatal seed step failed: ${step.script}`);
      process.exit(1);
    }
  }
}

console.log(`\nDemo state built: ${ok} steps ok, ${failed} skipped.`);
console.log("Next: npm run serve -> http://localhost:5173/demo\n");
