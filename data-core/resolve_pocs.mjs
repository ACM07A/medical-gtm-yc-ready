// Partner Sourcing Agent — POC resolution pass 1 (public web, 2026-07-03).
// Logs ONLY publicly-verifiable named business contacts, with provenance. No fabrication:
// where the public web didn't expose the operational IPS head, the row stays unresolved.
// Run: node --experimental-sqlite data-core/resolve_pocs.mjs
import { open, logRun } from "./db.mjs";
const db = open();

// idempotent: clear prior named rows for partners we touch this pass
db.exec(`DELETE FROM poc WHERE partner_id='fortis' AND person_name IS NOT NULL`);

const SRC_FORTIS = "BusinessWire press release — 'Fortis Healthcare Recognized for its Global Contribution to Medical Value Travel at Advantage Healthcare India 2025' (retrieved 2026-07-03)";
const add = db.prepare(`INSERT INTO poc (partner_id,title_target,person_name,channel_public,source,resolved) VALUES (?,?,?,?,?,?)`);

// FORTIS — two publicly listed MVT contacts. NOTE: these are public MVT/media & partnership
// inquiry contacts, not confirmed IPS operational heads. Useful warm entry; verify routing.
add.run("fortis", "MVT / partnership inquiry contact — public (Corporate Communications)", "Ajey Maharaj", "ajey.maharaj@fortishealthcare.com", SRC_FORTIS, 1);
add.run("fortis", "MVT / partnership inquiry contact — public (title unconfirmed)", "Rishu Singh", "rishu.singh@fortishealthcare.com", SRC_FORTIS, 1);
db.prepare(`UPDATE partner SET stage='POC found' WHERE id='fortis'`).run(); // advance pipeline

// APOLLO / MEDANTA — operational IPS/MVT head NOT publicly resolvable this pass.
// Keep the generic desk-channel POC unresolved; escalate to enrichment API or human Sales-Nav.
db.prepare(`UPDATE poc SET title_target='Head – International Patient Services (name unresolved — needs enrichment API / Sales-Nav)'
  WHERE partner_id IN ('apollo','medanta') AND person_name IS NULL`).run();

const named = db.prepare(`SELECT partner_id, person_name, channel_public FROM poc WHERE person_name IS NOT NULL`).all();
console.log(`Resolved named POCs this pass: ${named.length}`);
for (const p of named) console.log(`  ${p.partner_id.padEnd(10)} ${p.person_name.padEnd(16)} ${p.channel_public}`);
const unresolved = db.prepare(`SELECT count(*) c FROM poc WHERE person_name IS NULL`).get().c;
console.log(`Still unresolved (title+desk only): ${unresolved} — need enrichment API / Sales-Nav / human`);
logRun(db, "Partner Sourcing", "POC resolution pass (public web)", `${named.length} named, ${unresolved} title+desk only`, null, "ok");
db.close();
