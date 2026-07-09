// DB backup — the SQLite file is the ONLY record of contacts, pipeline, fit scores, outcomes. It is
// gitignored (privacy) so it isn't in git history either → a disk failure loses everything. This snapshots
// it to outputs/backups/ (timestamped, keeps the last N). Called at the start of every factory cycle.
// For real durability, sync outputs/backups/ to cloud storage (rclone/OneDrive) — see /build-os/10.
//   node --experimental-sqlite data-core/backup.mjs
import { open, setState, DB_PATH } from "./db.mjs";
import { copyFileSync, mkdirSync, readdirSync, statSync, unlinkSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(ROOT, "outputs", "backups");
const KEEP = Number(process.env.BACKUP_KEEP) || 14;

mkdirSync(DIR, { recursive: true });
if (!existsSync(DB_PATH)) { console.error("no db to back up — run seed first"); process.exit(1); }

const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16);
const dest = join(DIR, `medyatra-${ts}.db`);
copyFileSync(DB_PATH, dest);

// prune to the last KEEP snapshots
const snaps = readdirSync(DIR).filter((f) => f.startsWith("medyatra-") && f.endsWith(".db"))
  .map((f) => ({ f, t: statSync(join(DIR, f)).mtimeMs })).sort((a, b) => b.t - a.t);
for (const s of snaps.slice(KEEP)) unlinkSync(join(DIR, s.f));

const db = open();
setState(db, "last_backup", dest.replace(ROOT + "\\", "").replace(ROOT + "/", "").replace(/\\/g, "/"));
db.close();
console.log(`✓ backup → ${dest.split(/[\\/]/).pop()} (${Math.round(statSync(dest).size / 1024)}KB) · keeping ${Math.min(snaps.length + 1, KEEP)}`);
