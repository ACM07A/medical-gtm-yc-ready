// Health check for the unattended loop — a single desktop + Scheduled Task has no monitoring: if the
// machine is off or the task silently fails, nothing tells you. Run this from cron/another box (or open
// /api/health) to detect a stalled pipeline. Exits NON-ZERO when stale so a wrapper can alert.
//   node --experimental-sqlite data-core/check_health.mjs
import { open, getState } from "./db.mjs";
const db = open();
const staleAfter = Number(process.env.LOOP_STALE_HOURS) || 8;
const done = getState(db, "loop_completed");
const backup = getState(db, "last_backup");
const fails = db.prepare(`SELECT count(*) c FROM run WHERE status='fail' AND ts > datetime('now','-1 day')`).get().c;
db.close();

const ageH = done ? (Date.now() - Date.parse(done.v)) / 36e5 : null;
const stale = ageH == null || ageH >= staleAfter;
console.log(`last loop: ${done?.v || "never"}${ageH != null ? ` (${ageH.toFixed(1)}h ago)` : ""}`);
console.log(`last backup: ${backup?.v || "none"} · fails (24h): ${fails}`);
if (stale) { console.error(`⛔ STALE: no completed loop in ${staleAfter}h — the scheduled task may be down (machine off / task failed). ALERT.`); process.exit(1); }
if (fails > 3) { console.error(`⚠ ${fails} failures in 24h — investigate.`); process.exit(2); }
console.log("✓ healthy");
