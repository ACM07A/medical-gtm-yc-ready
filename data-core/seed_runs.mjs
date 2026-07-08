// Backfill the runs feed with the actual work history so the console shows activity immediately.
// Idempotent. Going forward, gen_content / resolve_pocs append new run rows live.
//   node --experimental-sqlite data-core/seed_runs.mjs
import { open, logRun } from "./db.mjs";
const db = open();
db.exec(`DELETE FROM run`);
logRun(db, "System", "Data core seeded", "12 markets · 7 categories · 24 partners");
logRun(db, "Category Intelligence", "Scored portfolio", "weighted model rank · Cardiac ⚑ flagship (T013)");
logRun(db, "Partner Sourcing", "Enriched partners", "24 incl. latent/emerging brands (margin play) + unit-level rows");
logRun(db, "Partner Sourcing", "POC pass 1 (public web)", "2 named (Fortis) · rest title+desk");
for (const a of db.prepare(`SELECT id,category_id,market_code,language FROM content_asset ORDER BY id`).all())
  logRun(db, "Content Engine", `draft ${a.category_id}×${a.market_code} (${a.language})`, a.language === "en" ? "GLM-5.2" : "GLM-5.2 · needs native QA", `/draft/${a.id}`);
logRun(db, "System", "Backend + console online", "live state, runs feed, draft→landing rendering");
console.log("runs backfilled:", db.prepare(`SELECT count(*) c FROM run`).get().c);
db.close();
