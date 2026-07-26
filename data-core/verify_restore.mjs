import { DatabaseSync } from "node:sqlite";
import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { loadEnv } from "../lib/env.mjs";

loadEnv();
const { DB_PATH } = await import("./db.mjs");
const { backupDatabase } = await import("./os_core.mjs");

const backupDir = process.env.BACKUP_DIR || join(dirname(DB_PATH), "backups");
mkdirSync(backupDir, { recursive: true });
const source = process.argv[2] || backupDatabase(backupDir);
if (!existsSync(source)) {
  console.error(`Restore verification source does not exist: ${source}`);
  process.exit(1);
}

const isolated = join(tmpdir(), `canopus-restore-${Date.now()}.db`);
copyFileSync(source, isolated);
let db;
let report;
try {
  db = new DatabaseSync(isolated, { readOnly: true });
  const integrity = db.prepare("PRAGMA integrity_check").get().integrity_check;
  const requiredTables = ["patient_case", "app_user", "audit_event", "seed_version"];
  const existing = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((row) => row.name));
  const missingTables = requiredTables.filter((table) => !existing.has(table));
  const counts = missingTables.length ? {} : {
    cases: db.prepare("SELECT count(*) count FROM patient_case").get().count,
    users: db.prepare("SELECT count(*) count FROM app_user").get().count,
    audit_events: db.prepare("SELECT count(*) count FROM audit_event").get().count,
  };
  const ok = integrity === "ok" && missingTables.length === 0 && counts.cases >= 2 && counts.users >= 2;
  report = {
    ok,
    checked_at: new Date().toISOString(),
    source,
    integrity,
    missing_tables: missingTables,
    counts,
  };
} catch (error) {
  report = { ok: false, checked_at: new Date().toISOString(), source, error: error.message };
} finally {
  db?.close();
  rmSync(isolated, { force: true });
}

const reportPath = join(backupDir, `restore-report-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ ...report, report: reportPath }, null, 2));
if (!report.ok) process.exit(1);
