import { dirname } from "node:path";
import { mkdirSync } from "node:fs";
import { loadEnv } from "../lib/env.mjs";

loadEnv();
const { DB_PATH, open } = await import("./db.mjs");
const { ensureOsSchema } = await import("./os_core.mjs");

mkdirSync(dirname(DB_PATH), { recursive: true });
const db = open();
ensureOsSchema(db);
const version = db.prepare(`SELECT count(*) count FROM seed_version`).get().count;
db.close();
console.log(JSON.stringify({ ok: true, database: DB_PATH, schema: "ready", seed_versions: version }));
