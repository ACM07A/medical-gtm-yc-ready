import { open } from "./db.mjs";
import { ensureOsSchema, readinessReport } from "./os_core.mjs";

const db = open();
ensureOsSchema(db);
const report = readinessReport(db);
const checks = {
  database_open: true,
  foreign_keys: db.prepare(`PRAGMA foreign_keys`).get().foreign_keys === 1,
  cases: db.prepare(`SELECT count(*) c FROM patient_case`).get().c,
  users: db.prepare(`SELECT count(*) c FROM app_user`).get().c,
  readiness: report.status,
};
console.log(JSON.stringify(checks, null, 2));
db.close();
if (!checks.database_open || !checks.foreign_keys || checks.cases < 2) process.exit(1);
