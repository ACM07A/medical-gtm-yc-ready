// Publisher (FREE, local) — static-site generator replacing a paid CMS. Builds real HTML pages
// from QA-passed (review) English content into /site, and an index. Marks them published (in the
// LOCAL build). Deploying /site to the public internet stays a human/deploy gate.
//   node --experimental-sqlite data-core/publish_site.mjs
import { open, logRun } from "./db.mjs";
import { mdToHtml } from "../server/md.mjs";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, basename } from "node:path";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = join(ROOT, "site");
mkdirSync(SITE, { recursive: true });
const db = open();

const CSS = `body{margin:0;font-family:"Segoe UI",Roboto,Arial,system-ui,sans-serif;color:#0c1b2e;background:linear-gradient(180deg,#eaf1f8,#f6f9fd);line-height:1.6}
.ribbon{background:#0b4a8b;color:#fff;font-size:12px;text-align:center;padding:6px}.ribbon a{color:#8fd0ff}
main{max-width:740px;margin:0 auto;padding:26px 22px 60px}h1{color:#0b4a8b;font-size:29px;letter-spacing:-.02em}h2{color:#0b4a8b;margin-top:26px}
table{border-collapse:collapse;width:100%;margin:14px 0;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 8px 24px -16px rgba(11,74,139,.4)}
th,td{padding:10px 12px;border-bottom:1px solid #dbe4ef;text-align:left}th{background:#0b4a8b;color:#fff}a{color:#1f6fd6}
.cta{display:inline-block;margin-top:10px;background:#25a862;color:#fff;padding:12px 20px;border-radius:999px;font-weight:700;text-decoration:none}hr{border:none;border-top:1px solid #dbe4ef;margin:22px 0}`;
const esc = (s) => String(s || "").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const page = (title, inner, desc = "") => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>${desc ? `<meta name="description" content="${esc(desc)}">` : ""}<style>${CSS}</style></head><body><div class="ribbon">MedYatra — LOCAL PREVIEW build · <a href="/site/index.html">all guides</a></div><main>${inner}<p><a class="cta" href="#">Message us on WhatsApp →</a></p></main></body></html>`;

const rows = db.prepare(`SELECT ca.*, c.name cat, mk.name mname FROM content_asset ca
  JOIN category c ON c.id=ca.category_id JOIN market mk ON mk.code=ca.market_code
  WHERE ca.status IN ('review','published') AND ca.language='en'`).all();

const links = [];
for (const a of rows) {
  const md = readFileSync(join(ROOT, a.file_ref), "utf8");
  const slug = basename(a.file_ref).replace(/\.md$/, ".html");
  writeFileSync(join(SITE, slug), page(a.meta_title || `${a.cat} — ${a.mname}`, mdToHtml(md), a.meta_desc || ""));
  if (a.status !== "published") db.prepare(`UPDATE content_asset SET status='published' WHERE id=?`).run(a.id);
  links.push({ slug, title: `${a.cat} cost in India — ${a.mname}` });
  logRun(db, "Publisher", `published ${a.category_id}×${a.market_code}`, `local site`, `/site/${slug}`, "ok");
}
const index = page("MedYatra — Treatment cost guides", `<h1>Treatment cost guides (India)</h1><p>Accredited hospitals, honest prices, full support. Facilitator, not a provider.</p><ul>${links.map(l => `<li><a href="/site/${l.slug}">${l.title}</a></li>`).join("")}</ul>`);
writeFileSync(join(SITE, "index.html"), index);
logRun(db, "Publisher", "Site build complete", `${links.length} pages → /site (local preview)`, "/site/index.html", "ok");
console.log(`published ${links.length} English pages → site/  (deploy to go live = human gate)`);
db.close();
