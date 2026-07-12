// Rebuild content_asset rows from the COMMITTED generated pages — so the demo state is reproducible with
// NO API keys (seed.mjs only seeds the 4 original cornerstone rows; the ~30 generated cells come from
// gen_content, which needs a key). This scans outputs/content/*.md, parses the (category × market × language)
// from each filename, and upserts a draft row pointing at the committed file. Idempotent.
//   node --experimental-sqlite data-core/import_content.mjs
import { open, logRun } from "./db.mjs";
import { readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(ROOT, "outputs", "content");
const db = open();

// Filenames: "<category>-cost-india-<mk>[-<lang>].md" (categories have no hyphens; the 4 hand-authored
// cornerstone files use other names — e.g. heart-bypass-cost-india-nigeria.md — and won't match [a-z]{2}).
const RX = /^(.+)-cost-india-([a-z]{2})(?:-([a-z]{2}))?\.md$/;

const cats = new Set(db.prepare(`SELECT id FROM category`).all().map((r) => r.id));
const catName = (id) => db.prepare(`SELECT name FROM category WHERE id=?`).get(id)?.name || id;
const mkName = (code) => db.prepare(`SELECT name FROM market WHERE code=?`).get(code)?.name;

const files = existsSync(DIR) ? readdirSync(DIR).filter((f) => f.endsWith(".md")) : [];
let added = 0, updated = 0, skipped = 0;

for (const f of files) {
  const m = f.match(RX);
  if (!m) { skipped++; continue; }
  const cat = m[1], mk = m[2].toUpperCase(), lang = m[3] || "en";
  if (!cats.has(cat) || !mkName(mk)) { skipped++; continue; }   // unknown category/market → skip
  const fileRef = `outputs/content/${f}`;
  const title = `${catName(cat)} Cost in India — ${mkName(mk)} Guide${lang !== "en" ? " (" + lang + ")" : ""}`;
  const existing = db.prepare(`SELECT id, file_ref FROM content_asset WHERE category_id=? AND market_code=? AND language=?`).get(cat, mk, lang);
  if (existing) {
    // Point the cell at the richer generated page; reset to draft so QA re-evaluates it.
    if (existing.file_ref !== fileRef) {
      db.prepare(`UPDATE content_asset SET file_ref=?, title=?, status='draft' WHERE id=?`).run(fileRef, title, existing.id);
      updated++;
    }
  } else {
    db.prepare(`INSERT INTO content_asset (category_id,market_code,language,title,file_ref,status,cta_wired,citations_ok)
      VALUES (?,?,?,?,?, 'draft', 0, 0)`).run(cat, mk, lang, title, fileRef);
    added++;
  }
}

const total = db.prepare(`SELECT count(*) c FROM content_asset`).get().c;
logRun(db, "Content Engine", "Imported content from files", `${added} added, ${updated} re-pointed, ${skipped} skipped → ${total} cells`, null, "ok");
console.log(`✓ content import: ${added} added, ${updated} re-pointed, ${skipped} skipped (non-matching). Total cells: ${total}.`);
db.close();
