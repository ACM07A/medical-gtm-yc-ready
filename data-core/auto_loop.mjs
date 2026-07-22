// AUTO-LOOP — resumes generation automatically when a rate limit clears, instead of waiting for a human to
// notice a failed run and re-type the command. This is the exact failure this session hit twice tonight:
// `tier-2 all models failed -> z-ai/glm-5.2: timeout | gemini:gemini-2.5-flash HTTP 429: quota exceeded`.
// Before this script, the only fix was a person seeing that and re-running the command by hand later.
//
// Generic on purpose: wraps ANY script in this repo that uses the standard logRun(...,'fail') convention —
// not hardcoded to one generator. Works because every gen_*.mjs script here is ALREADY idempotent (skips
// anything with a fresh output on file) — so "just re-run the whole script" is a correct, sufficient resume
// mechanism with no separate retry queue needed. What this adds is deciding WHEN to re-run and WHETHER it's
// worth it at all:
//   RETRYABLE (timeout / 429 / quota / rate limit / resource-exhausted / connection reset) -> back off and
//   retry, backoff doubling up to a cap, because the failure is the world being temporarily unavailable.
//   NON-RETRYABLE (anything else — a missing key, a real bug, a compliance block) -> stop immediately.
//   Looping against a broken config for hours is worse than doing nothing and saying so.
//
//   node --experimental-sqlite data-core/auto_loop.mjs gen_doctor_outreach.mjs
//   node --experimental-sqlite data-core/auto_loop.mjs run_loop.mjs                 # the full factory cycle
//   MAX_ATTEMPTS=20 node --experimental-sqlite data-core/auto_loop.mjs gen_proposals.mjs 8
//   npm run auto-loop -- gen_content.mjs
import { open, logRun } from "./db.mjs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const HERE = dirname(fileURLToPath(import.meta.url));

const [, , script, ...args] = process.argv;
if (!script) {
  console.error("usage: auto_loop.mjs <script.mjs> [args...]   (e.g. gen_doctor_outreach.mjs, gen_proposals.mjs, run_loop.mjs)");
  process.exit(1);
}
const scriptPath = join(HERE, script);

const RETRYABLE = /(timeout|\b429\b|quota|rate.?limit|resource.?exhausted|econnreset|etimedout|fetch failed|enotfound|socket hang up)/i;
const BASE_MS = Number(process.env.AUTO_LOOP_BASE_MS) || 5 * 60_000;      // 5 min base backoff
const MAX_MS = Number(process.env.AUTO_LOOP_MAX_MS) || 60 * 60_000;       // cap at 1h between retries
const MAX_ATTEMPTS = Number(process.env.MAX_ATTEMPTS) || 0;               // 0 = unlimited
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function runOnce() {
  const res = spawnSync(process.execPath, ["--experimental-sqlite", scriptPath, ...args], { encoding: "utf8", env: process.env });
  process.stdout.write(res.stdout || "");
  process.stderr.write(res.stderr || "");
  return res;
}

// Classify what happened using the run log (structured, reliable) as primary signal, and the child's own
// exit code/stderr (in case it crashed before writing anything) as a backstop.
function classify(db, beforeId, res) {
  const failRows = db.prepare(`SELECT agent, action, detail FROM run WHERE id > ? AND status='fail'`).all(beforeId);
  if (failRows.length) {
    const retryable = failRows.filter((r) => RETRYABLE.test(r.detail || ""));
    const hard = failRows.filter((r) => !RETRYABLE.test(r.detail || ""));
    return { clean: false, retryable, hard };
  }
  if (res.status !== 0) {
    const text = `${res.stdout || ""}\n${res.stderr || ""}`;
    return RETRYABLE.test(text)
      ? { clean: false, retryable: [{ agent: "System", action: script, detail: `nonzero exit ${res.status}` }], hard: [] }
      : { clean: false, retryable: [], hard: [{ agent: "System", action: script, detail: `nonzero exit ${res.status} — see output above` }] };
  }
  return { clean: true, retryable: [], hard: [] };
}

console.log(`\n  AUTO-LOOP — ${script}${args.length ? " " + args.join(" ") : ""}`);
console.log(`  base backoff ${BASE_MS / 60000}min, cap ${MAX_MS / 60000}min${MAX_ATTEMPTS ? `, gives up after ${MAX_ATTEMPTS} consecutive retryable failures` : ", retries indefinitely on transient failures"}. Ctrl+C to stop.\n`);

let attempt = 0, backoff = BASE_MS;
while (true) {
  let db = open();
  const beforeId = db.prepare(`SELECT COALESCE(MAX(id),0) m FROM run`).get().m;
  logRun(db, "System", "Auto-loop run", `${script} — attempt ${attempt + 1}`);
  db.close();

  const res = runOnce();

  db = open();
  const outcome = classify(db, beforeId, res);

  if (outcome.clean) {
    logRun(db, "System", "Auto-loop complete", `${script} — clean run, no retryable or hard failures`);
    db.close();
    console.log(`\n  ✓ clean run — nothing left to retry.\n`);
    process.exit(0);
  }
  if (outcome.hard.length) {
    logRun(db, "System", "Auto-loop stopped", `${script} — ${outcome.hard.length} non-retryable failure(s), needs a human`, null, "fail");
    db.close();
    console.log(`\n  ✗ ${outcome.hard.length} non-retryable failure(s) — stopping, retrying won't fix this:`);
    for (const r of outcome.hard) console.log(`     ${r.agent} · ${r.action}: ${r.detail}`);
    process.exit(1);
  }
  attempt++;
  if (MAX_ATTEMPTS && attempt >= MAX_ATTEMPTS) {
    logRun(db, "System", "Auto-loop gave up", `${script} — ${attempt} consecutive retryable (rate-limit/timeout) failures`, null, "fail");
    db.close();
    console.log(`\n  ✗ ${attempt} consecutive retryable failures — giving up (MAX_ATTEMPTS=${MAX_ATTEMPTS}). This looks like a sustained outage, not a transient rate limit.\n`);
    process.exit(1);
  }
  logRun(db, "System", "Auto-loop retry scheduled", `${script} — ${outcome.retryable.length} retryable failure(s), next attempt in ${Math.round(backoff / 60000)}min`);
  db.close();
  console.log(`\n  ⏳ ${outcome.retryable.length} retryable failure(s) (rate limit / timeout) — retrying in ${Math.round(backoff / 60000)}min (attempt ${attempt}${MAX_ATTEMPTS ? `/${MAX_ATTEMPTS}` : ""}).\n`);
  await sleep(backoff);
  backoff = Math.min(backoff * 2, MAX_MS);
}
