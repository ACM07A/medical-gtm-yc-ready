// Browser-automation sub-tasks for the pipeline (drives local Edge/Chrome via lib/browser.mjs).
// These are the pipeline steps that benefit from a real browser (JS-rendered pages, screenshots).
// Designed to be OWNED/RUN by a delegated worker (opencode + MiniMax) — see handoff/opencode/.
//   node --experimental-sqlite data-core/browser_tasks.mjs enrich [N]
//   node --experimental-sqlite data-core/browser_tasks.mjs screenshot [N]
import { open, logRun } from "./db.mjs";
import { search, extractContacts } from "../lib/research.mjs";
import { renderText, screenshot } from "../lib/browser.mjs";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const db = open();
const [cmd, nArg] = process.argv.slice(2);
const N = Number(nArg) || 3;

// SUB-TASK 1 — POC enrichment via real browser (renders JS pages fetch can't, e.g. contact widgets)
async function enrich(limit) {
  const need = db.prepare(`SELECT * FROM partner WHERE (ips_channel_public IS NULL OR ips_channel_public NOT LIKE '%@%')
    AND type!='unit' ORDER BY priority DESC, name LIMIT ?`).all(limit);
  let found = 0;
  for (const p of need) {
    let contact = null, src = null;
    try {
      const hits = await search(`${p.name} international patients contact email`, 4);
      for (const h of hits.slice(0, 2)) {
        let text = ""; try { text = await renderText(h.url); } catch {}
        const biz = extractContacts(text).emails.find((e) => !/gmail|yahoo|hotmail|outlook\.com/i.test(e));
        if (biz) { contact = biz; src = h.url; break; }
      }
    } catch (e) { logRun(db, "Browser Worker", `enrich error ${p.name}`, String(e).slice(0, 70), null, "fail"); continue; }
    if (contact) {
      db.prepare(`UPDATE partner SET ips_channel_public=?, ips_source=?, stage='POC found' WHERE id=?`).run(contact, src, p.id);
      db.prepare(`UPDATE poc SET channel_public=?, source=? WHERE partner_id=? AND person_name IS NULL`).run(contact, src, p.id);
      logRun(db, "Browser Worker", `contact found ${p.name}`, `${contact} (rendered page)`, null, "ok"); found++;
    } else logRun(db, "Browser Worker", `no contact ${p.name}`, "rendered pages had none — try enrichment API", null, "pending");
  }
  logRun(db, "Browser Worker", "Browser enrichment sweep", `${found}/${need.length} contacts (Edge-rendered)`);
  console.log(`enrich: ${found}/${need.length} public contacts found via browser`);
}

// SUB-TASK 2 — visual QA: screenshot published landing pages (for regression/review)
async function shots(limit) {
  let pages = [];
  try { pages = readdirSync(join(ROOT, "site")).filter((f) => f.endsWith(".html") && f !== "index.html").slice(0, limit); } catch {}
  let ok = 0;
  for (const f of pages) {
    const out = join("outputs", "screenshots", f.replace(/\.html$/, ".png"));
    try { await screenshot(`http://localhost:5173/site/${f}`, join(ROOT, out)); logRun(db, "Browser Worker", `screenshot ${f}`, out, `/${out.replace(/\\/g, "/")}`, "ok"); ok++; }
    catch (e) { logRun(db, "Browser Worker", `screenshot fail ${f}`, String(e).slice(0, 70), null, "fail"); }
  }
  console.log(`screenshot: ${ok}/${pages.length} published pages captured`);
}

if (cmd === "enrich") await enrich(N);
else if (cmd === "screenshot") await shots(N);
else console.log("usage: browser_tasks.mjs enrich [N] | screenshot [N]");
db.close();
