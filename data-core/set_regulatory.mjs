// Set a market's regulatory clearance — the human/counsel decision on whether MedYatra may legally
// solicit patients there. Nothing markets live to an 'unverified' or 'blocked' market.
//   node --experimental-sqlite data-core/set_regulatory.mjs <market> <verified|unverified|blocked> ["note"]
//   node --experimental-sqlite data-core/set_regulatory.mjs                      # list all
import { open, logRun } from "./db.mjs";
const db = open();
const [, , code, status, note] = process.argv;
const OK = ["verified", "unverified", "blocked"];

if (!code) {
  console.log("REGULATORY STATUS per market:");
  for (const m of db.prepare(`SELECT code,name,tier,regulatory_status s,regulatory_note n FROM market ORDER BY s, name`).all())
    console.log(`  ${(m.s || "unverified").padEnd(11)} ${m.code}  ${m.name}${m.n ? " — " + m.n : ""}`);
  console.log("\nusage: set_regulatory.mjs <market> <verified|unverified|blocked> [\"note\"]");
  db.close(); process.exit(0);
}
if (!OK.includes(status)) { console.error(`status must be one of: ${OK.join(", ")}`); process.exit(1); }
const m = db.prepare(`SELECT * FROM market WHERE code=?`).get(code);
if (!m) { console.error(`no market '${code}'`); process.exit(1); }

db.prepare(`UPDATE market SET regulatory_status=?, regulatory_note=? WHERE code=?`).run(status, note || null, code);
logRun(db, "Compliance", `Regulatory · ${code}`, `${m.name} → ${status}${note ? " (" + note + ")" : ""}`, null, status === "verified" ? "ok" : "pending");
console.log(`✓ ${m.name} (${code}): regulatory_status = '${status}'${note ? " — " + note : ""}${status !== "verified" ? "  (will NOT be marketed live)" : "  (cleared to market)"}`);
db.close();
