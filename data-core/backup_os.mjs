import { backupDatabase } from "./os_core.mjs";

const out = backupDatabase();
console.log(`✓ Database backup written: ${out}`);
