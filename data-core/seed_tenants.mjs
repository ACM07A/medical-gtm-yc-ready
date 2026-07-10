// Seed TENANTS (build-os/11 — operator-front-first, multi-tenant). 'medyatra' = own acquisition; operators
// are separate tenants with their own ingest token. Tokens here are DEMO placeholders — in production each
// tenant gets a generated secret (e.g. crypto.randomUUID), stored here, shared out-of-band. Idempotent.
//   node --experimental-sqlite data-core/seed_tenants.mjs
import { open, logRun } from "./db.mjs";
const db = open();

// [id, name, mode, ingest_token, rev_share]
const tenants = [
  ["medyatra", "MedYatra (own acquisition)", "own", null, 1.0],
  ["trudoc-demo", "Trudoc (demo operator)", "operator", "demo-ingest-trudoc", 0.5],
];
const ins = db.prepare(`INSERT OR REPLACE INTO tenant (id,name,mode,token,rev_share,active) VALUES (?,?,?,?,?,1)`);
for (const [id, name, mode, token, rev] of tenants) ins.run(id, name, mode, token, rev);

logRun(db, "System", "Tenants seeded", `${tenants.length} tenants (multi-tenant platform posture)`, null, "ok");
console.log(`✓ ${tenants.length} tenants:`);
for (const t of db.prepare(`SELECT id,name,mode,CASE WHEN token IS NULL THEN 'open' ELSE 'token' END auth,rev_share FROM tenant ORDER BY mode DESC,id`).all())
  console.log(`  · ${t.id} — ${t.name} · ${t.mode} · ${t.auth} · rev-share ${t.rev_share}`);
db.close();
