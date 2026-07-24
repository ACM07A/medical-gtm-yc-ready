import { existsSync, rmSync } from "node:fs";
import { DB_PATH, open } from "./db.mjs";
import { appMode } from "./os_core.mjs";

const force = process.argv.includes("--force");
if (appMode() !== "demo" && !force) {
  console.error("Refusing to reset the database unless APP_MODE=demo or --force is provided.");
  process.exit(1);
}
if (existsSync(DB_PATH)) rmSync(DB_PATH);
const db = open();
db.close();
console.log("✓ Demo database reset safely. Run npm run db:seed to repopulate.");
