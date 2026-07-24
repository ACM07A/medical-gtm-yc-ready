// ONE-COMMAND DEMO BOOTSTRAP — rebuilds the entire showable state from committed files + scripts, so `/demo`,
// `/sandbox`, the console, Studio, published guides, templates, and benchmarks are all populated on any machine
// (including a fresh clone). Runs WITHOUT API keys for everything except the optional social repurpose step.
//   npm run demo        (then: npm run serve  →  http://localhost:5173/demo)
//
// Note: this WIPES and rebuilds the demo database (data-core/medyatra.db). Any manually-captured contacts are
// re-seeded from the committed seed data — don't run it over a DB holding real, unbacked-up captures.
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "../lib/env.mjs";

loadEnv();
const HERE = dirname(fileURLToPath(import.meta.url));
const hasGenKey = !!(process.env.GEMINI_API_KEY || process.env.NVIDIA_API_KEY);

// Each step: a script + args, whether a failure is fatal, and a note. Browser/generation steps are best-effort
// (a missing browser or key must not abort the whole bootstrap — the core demo is key-free and deterministic).
const STEPS = [
  { s: "seed.mjs", fatal: true, note: "structure + categories + partners + POCs + cornerstone content" },
  { s: "seed_runs.mjs", fatal: false, note: "activity feed" },
  { s: "import_content.mjs", fatal: false, note: "rebuild the ~30 generated content cells from files" },
  { s: "seed_reference_prices.mjs", fatal: false, note: "price-ladder rungs (local → international → India)" },
  { s: "seed_tenants.mjs", fatal: false, note: "own-brand + demo operator (dual-mode)" },
  { s: "seed_leads.mjs", fatal: false, note: "demo patient leads for the journey" },
  { s: "seed_os.mjs", fatal: true, note: "CanopusCare OS roles, cases, vendors, approvals, audit and agent runs" },
  { s: "gen_comms.mjs", fatal: false, note: "21 WhatsApp templates (+ infographic headers, needs a browser)" },
  { s: "gen_header_datauris.mjs", fatal: false, note: "inline headers for the shareable sandbox artifact (browser)" },
  // Regulatory: illustrative demo clearances so guides can publish (NG left gated to show the gate working).
  { s: "set_regulatory.mjs", args: ["GB", "verified", "DEMO clearance — illustrative, not legal sign-off"], fatal: false, note: "demo-clear GB" },
  { s: "set_regulatory.mjs", args: ["IE", "verified", "DEMO clearance — illustrative, not legal sign-off"], fatal: false, note: "demo-clear IE" },
  { s: "set_regulatory.mjs", args: ["KE", "verified", "DEMO clearance — illustrative, not legal sign-off"], fatal: false, note: "demo-clear KE" },
  { s: "qa_content.mjs", fatal: false, note: "promote passing English drafts → review" },
  { s: "publish_site.mjs", fatal: false, note: "publish cleared+reviewed guides → the static site" },
];
// Optional: seed the distribution queue (needs a generation key).
if (hasGenKey) STEPS.push({ s: "repurpose_content.mjs", args: ["2"], env: { FORCE: "1" }, fatal: false, note: "seed /distribution: 2 pages → social posts" });

console.log(`\n▶ CanopusCare demo bootstrap — ${STEPS.length} steps ${hasGenKey ? "(incl. social repurpose — key found)" : "(key-free; social repurpose skipped — no generation key)"}\n`);

let ok = 0, failed = 0;
for (const step of STEPS) {
  const label = `${step.s}${step.args ? " " + step.args.join(" ") : ""}`;
  process.stdout.write(`  • ${label.padEnd(46)} `);
  try {
    execFileSync("node", ["--experimental-sqlite", join(HERE, step.s), ...(step.args || [])],
      { stdio: ["ignore", "ignore", "ignore"], env: { ...process.env, ...(step.env || {}) }, timeout: 300000 });
    console.log(`✓  ${step.note}`);
    ok++;
  } catch (e) {
    console.log(`⚠  skipped (${String(e.message || e).split("\n")[0].slice(0, 40)}) — ${step.note}`);
    failed++;
    if (step.fatal) { console.error(`\n✗ fatal step failed (${step.s}) — aborting.`); process.exit(1); }
  }
}

console.log(`\n✓ Demo state built: ${ok} steps ok, ${failed} skipped.`);
console.log(`  Next:  npm run serve   →   http://localhost:5173/demo\n`);
