import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { loadEnv } from "../lib/env.mjs";

loadEnv();

const { APP_MODES, appMode, ensureOsSchema, readinessReport } = await import("../data-core/os_core.mjs");
const { DB_PATH, open } = await import("../data-core/db.mjs");
const mode = appMode();

if (!APP_MODES.has(process.env.APP_MODE || "demo")) {
  console.error(`Invalid APP_MODE: ${process.env.APP_MODE}`);
  process.exit(1);
}

mkdirSync(dirname(DB_PATH), { recursive: true });
let needsInitialization = !existsSync(DB_PATH);
if (!needsInitialization && mode === "demo") {
  const existing = open();
  ensureOsSchema(existing);
  needsInitialization = existing.prepare(`SELECT count(*) count FROM seed_version`).get().count === 0
    && existing.prepare(`SELECT (SELECT count(*) FROM lead) + (SELECT count(*) FROM partner) + (SELECT count(*) FROM patient_case) count`).get().count === 0;
  existing.close();
}
if (needsInitialization) {
  if (mode === "demo") {
    console.log(`Initializing synthetic demo database at ${DB_PATH}`);
    execFileSync(process.execPath, ["--experimental-sqlite", "data-core/demo_seed.mjs"], {
      stdio: "inherit",
      env: { ...process.env, SEED_BROWSER: "0", SEED_GENERATION: "0" },
    });
  } else {
    const db = open();
    ensureOsSchema(db);
    db.close();
    console.log(`Initialized empty ${mode} database at ${DB_PATH}; demo data was not seeded.`);
  }
} else {
  console.log(`Existing database preserved at ${DB_PATH}`);
  if (process.env.BACKUP_ON_START !== "0") {
    execFileSync(process.execPath, ["--experimental-sqlite", "data-core/backup_os.mjs"], {
      stdio: "inherit",
      env: process.env,
    });
  }
}

if (mode === "production") {
  const db = open();
  const readiness = readinessReport(db);
  db.close();
  if (!readiness.ok || readiness.status === "BLOCKED") {
    console.error(`Production startup blocked: ${readiness.missing.join(", ") || "database is not ready"}`);
    process.exit(1);
  }
}

await import("../server/server.mjs");
