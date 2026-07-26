import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { loadEnv } from "../lib/env.mjs";

loadEnv();
const { DB_PATH } = await import("./db.mjs");
const { appMode } = await import("./os_core.mjs");

const force = process.argv.includes("--force");
const mode = appMode();
if (mode !== "demo" && !force) {
  console.error("Refusing to reset the database unless APP_MODE=demo or --force is provided.");
  process.exit(1);
}

if (existsSync(DB_PATH)) {
  const backupDir = process.env.BACKUP_DIR || join(dirname(DB_PATH), "backups");
  mkdirSync(backupDir, { recursive: true });
  const backup = join(backupDir, `pre-reset-${new Date().toISOString().replace(/[:.]/g, "-")}.db`);
  copyFileSync(DB_PATH, backup);
  rmSync(DB_PATH);
  console.log(`Database backup written before reset: ${backup}`);
}

if (mode === "demo") {
  execFileSync(process.execPath, ["--experimental-sqlite", "data-core/demo_seed.mjs"], {
    stdio: "inherit",
    env: { ...process.env, SEED_BROWSER: "0", SEED_GENERATION: "0" },
  });
  console.log("Synthetic demo database reset and reseeded.");
} else {
  console.log("Database removed with --force. Production mode was not seeded.");
}
