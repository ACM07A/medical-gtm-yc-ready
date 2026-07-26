import { backupDatabase } from "./os_core.mjs";
import { existsSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";

const out = backupDatabase(process.env.BACKUP_DIR || undefined);
if (!existsSync(out)) {
  console.error("Database backup failed: source database does not exist.");
  process.exit(1);
}
const keep = Math.max(2, Number(process.env.BACKUP_KEEP) || 14);
const dir = dirname(out);
const snapshots = readdirSync(dir)
  .filter((name) => /^medyatra-.*\.db$/.test(name))
  .map((name) => ({ name, modified: statSync(join(dir, name)).mtimeMs }))
  .sort((a, b) => b.modified - a.modified);
for (const snapshot of snapshots.slice(keep)) unlinkSync(join(dir, snapshot.name));
console.log(`Database backup written: ${out} (${Math.round(statSync(out).size / 1024)} KB; keeping ${Math.min(snapshots.length, keep)})`);
