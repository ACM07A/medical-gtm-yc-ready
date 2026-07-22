// Small-task agent — SEO meta (title + description) for published pages, on MiniMax (tier-3),
// GLM fallback if no MiniMax key. Small, per-page, cheap. Then re-run publish_site to inject them.
//   MINIMAX_API_KEY=... node --experimental-sqlite data-core/gen_meta.mjs   (or NVIDIA_API_KEY for fallback)
import { open, logRun } from "./db.mjs";
import { smallTask } from "../lib/small.mjs";
import { withEmpathyContent } from "../lib/voice.mjs";
import { basename } from "node:path";
const db = open();

const rows = db.prepare(`SELECT ca.*, c.name cat, mk.name mname FROM content_asset ca
  JOIN category c ON c.id=ca.category_id JOIN market mk ON mk.code=ca.market_code
  WHERE ca.status='published' AND ca.language='en' AND (ca.meta_desc IS NULL OR ca.meta_desc='')`).all();
let model = "n/a", done = 0;
for (const a of rows) {
  const prompt = `SEO meta for a page: "${a.cat} treatment cost in India for patients from ${a.mname}". ` +
    `Return EXACTLY two lines:\nTITLE: <=60 chars\nDESC: <=155 chars — speak to the reader's real concern ` +
    `(what it costs, and getting safe care at accredited hospitals), calm and honest. NO clickbait, NO "huge ` +
    `savings" hype over someone's illness, no quotes.`;
  let res; try { res = await smallTask(prompt, { maxTokens: 180, temperature: 0.4, system: withEmpathyContent("You are a concise medical-travel SEO copywriter for a facilitator (not a hospital). No hype, no guarantees. A meta description is the first thing a frightened person searching for treatment reads — make it honest and human, not a sales shout.") }); }
  catch (e) { logRun(db, "Small Tasks", `meta ${a.category_id}×${a.market_code}`, String(e).slice(0, 60), null, "fail"); continue; }
  model = res.model;
  const title = (res.text.match(/TITLE:\s*(.+)/i)?.[1] || `${a.cat} Cost in India — ${a.mname}`).trim().replace(/^["']|["']$/g, "").slice(0, 65);
  const desc = (res.text.match(/DESC:\s*(.+)/i)?.[1] || "").trim().replace(/^["']|["']$/g, "").slice(0, 160);
  db.prepare(`UPDATE content_asset SET meta_title=?, meta_desc=? WHERE id=?`).run(title, desc, a.id);
  const ref = "/site/" + basename(a.file_ref).replace(/\.md$/, ".html");
  logRun(db, "Small Tasks", `meta ${a.category_id}×${a.market_code}`, `${res.model} · ${desc.slice(0, 48)}…`, ref, "ok");
  done++;
}
logRun(db, "Small Tasks", "Meta batch complete", `${done} pages via ${model}`);
console.log(`meta: ${done}/${rows.length} pages via ${model}`);
db.close();
