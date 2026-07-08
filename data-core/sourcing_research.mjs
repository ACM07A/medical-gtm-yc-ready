// Partner Sourcing (autonomous, FREE) — finds public IPS contacts for partners that don't have one
// yet, using the free research module (search + fetch; browser fallback available). Public data only.
// Replaces paid enrichment for the public-contact portion.  node --experimental-sqlite data-core/sourcing_research.mjs
import { open, logRun } from "./db.mjs";
import { search, fetchText, extractContacts } from "../lib/research.mjs";
const db = open();

// partners whose stored channel has no email yet (mostly the latent/emerging brands)
const need = db.prepare(`SELECT * FROM partner WHERE ips_channel_public IS NULL
  OR ips_channel_public NOT LIKE '%@%'`).all();
let found = 0;
for (const p of need) {
  try {
    const hits = await search(`${p.name} international patient services contact email`, 5);
    let contact = null, src = null;
    for (const h of hits.slice(0, 3)) {
      const text = await fetchText(h.url, 6000);
      const c = extractContacts(text);
      const biz = c.emails.find((e) => !/gmail|yahoo|hotmail|outlook\.com/i.test(e));
      if (biz) { contact = biz + (c.phones[0] ? " · " + c.phones[0] : ""); src = h.url; break; }
    }
    if (contact) {
      db.prepare(`UPDATE partner SET ips_channel_public=?, ips_source=?, stage='POC found' WHERE id=?`).run(contact, src, p.id);
      db.prepare(`UPDATE poc SET channel_public=?, source=? WHERE partner_id=? AND person_name IS NULL`).run(contact, src, p.id);
      logRun(db, "Partner Sourcing", `contact found ${p.name}`, `${contact} (public)`, null, "ok");
      found++;
    } else {
      logRun(db, "Partner Sourcing", `no public contact ${p.name}`, "public web had none — enrichment API / Sales-Nav", null, "pending");
    }
  } catch (e) { logRun(db, "Partner Sourcing", `research error ${p.name}`, String(e).slice(0, 80), null, "fail"); }
}
logRun(db, "Partner Sourcing", "Research sweep complete", `${found} public contacts found of ${need.length} sought`);
console.log(`sourcing research: ${found}/${need.length} public contacts found`);
db.close();
