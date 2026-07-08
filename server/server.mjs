// MedYatra local backend — zero external deps. Serves a LIVE operator console that reads the
// data core, a runs/activity feed, and renders content drafts as patient landing pages.
//   node --experimental-sqlite server/server.mjs   ->   http://localhost:5173
import { createServer } from "node:http";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { open } from "../data-core/db.mjs";
import { mdToHtml } from "./md.mjs";
import { renderHome } from "./landing_home.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const PORT = Number(process.env.PORT) || 5173;

function buildState(db) {
  const A = (s, ...p) => db.prepare(s).all(...p);
  const O = (s, ...p) => db.prepare(s).get(...p);
  const cats = A(`SELECT * FROM category WHERE status='launch' ORDER BY rank`);
  const markets = A(`SELECT * FROM market ORDER BY CASE tier WHEN 'A' THEN 0 WHEN 'B' THEN 1 WHEN 'C' THEN 2 ELSE 3 END, name`);
  const target = A(`SELECT category_id, market_code FROM category_market`);
  const assets = A(`SELECT id, category_id, market_code, language, status FROM content_asset`);
  const partners = A(`SELECT * FROM partner`);
  const candidates = A(`SELECT * FROM partner WHERE mvt_presence IN ('latent','emerging') AND opportunity IN ('High','Med') ORDER BY CASE opportunity WHEN 'High' THEN 0 ELSE 1 END, name`)
    .map((p) => ({ ...p, cats: A(`SELECT category_id FROM partner_category WHERE partner_id=?`, p.id).map((r) => r.category_id).join(", ") }));
  const named = A(`SELECT p.person_name, p.channel_public, pt.name partner FROM poc p JOIN partner pt ON pt.id=p.partner_id WHERE p.person_name IS NOT NULL`);
  const isT = (c, m) => target.some((t) => t.category_id === c && t.market_code === m);
  const asset = (c, m) => assets.find((a) => a.category_id === c && a.market_code === m);
  const portfolio = cats.map((c) => {
    const pr = O(`SELECT min(india_low) lo, max(india_high) hi FROM category_price WHERE category_id=?`, c.id);
    const cp = O(`SELECT low, high FROM competitor_price WHERE category_id=? ORDER BY samples DESC LIMIT 1`, c.id);
    return { ...c, band: pr.lo ? `$${pr.lo / 1000}k–${pr.hi / 1000}k` : "—",
      mkt: cp && cp.low ? `$${Math.round(cp.low / 1000)}k–${Math.round(cp.high / 1000)}k` : "" };
  });
  const grid = cats.map((c) => ({
    id: c.id, name: c.name,
    cells: markets.map((m) => {
      if (!isT(c.id, m.code)) return { m: m.code, s: "none" };
      const a = asset(c.id, m.code);
      return a ? { m: m.code, s: a.status, lang: a.language, aid: a.id } : { m: m.code, s: "gap" };
    }),
  }));
  return {
    now: new Date().toISOString(),
    kpi: {
      markets: markets.length, cats: cats.length, partners: partners.length,
      latent: partners.filter((p) => ["latent", "emerging"].includes(p.mvt_presence)).length,
      highOpp: candidates.filter((c) => c.opportunity === "High").length,
      cellsTotal: target.length, cellsDrafted: new Set(assets.map((a) => a.category_id + a.market_code)).size,
      published: assets.filter((a) => a.status === "published").length,
      pocResolved: named.length, pocTotal: O(`SELECT count(*) c FROM poc`).c,
      proposals: O(`SELECT count(*) c FROM proposal WHERE status IN ('review','draft')`).c,
      outbox: (() => { try { return readdirSync(join(ROOT, "outputs", "outbox")).filter((f) => f.endsWith(".eml")).length; } catch { return 0; } })(),
      sitePages: assets.filter((a) => a.status === "published" && a.language === "en").length,
    },
    markets: markets.map((m) => ({ code: m.code, tier: m.tier })),
    portfolio, grid,
    pipeline: A(`SELECT stage, count(*) n FROM partner GROUP BY stage`),
    candidates, named,
    // Account Board — the partner layer as a working CRM: fit-ranked, why-this-account, best POC + how
    // sure we are of the contact path, and the concrete next action. This is the GTM engine's spine.
    accounts: A(`SELECT * FROM partner ORDER BY fit_score DESC, name`).map((p) => {
      const poc = O(`SELECT person_name, role, title_target, contact_type, contact_value, confidence FROM poc
        WHERE partner_id=? ORDER BY CASE contact_type WHEN 'named-verified' THEN 0 WHEN 'named-public' THEN 1
        WHEN 'inferred' THEN 2 ELSE 3 END, confidence DESC LIMIT 1`, p.id);
      return {
        id: p.id, name: p.name, city: p.city, presence: p.mvt_presence, opp: p.opportunity,
        fit: p.fit_score, reason: p.fit_reason, stage: p.stage, next: p.next_action, owner: p.owner,
        poc: poc && poc.person_name ? poc.person_name : null,
        pocRole: poc ? (poc.role || poc.title_target) : null,
        pocType: poc ? poc.contact_type : "open", pocConf: poc ? poc.confidence : 0,
        pocContact: poc ? poc.contact_value : null,
      };
    }),
    contactMix: A(`SELECT COALESCE(contact_type,'open') t, count(*) n FROM poc GROUP BY COALESCE(contact_type,'open')`),
    outreach: A(`SELECT o.id, o.status, o.angle, o.channel, pt.name partner FROM outreach o JOIN partner pt ON pt.id=o.partner_id ORDER BY o.id DESC`),
  };
}

function docPage(title, ribbon, inner) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{margin:0;font-family:"Segoe UI",Roboto,Arial,system-ui,sans-serif;color:#0c1b2e;background:linear-gradient(180deg,#eaf1f8,#f6f9fd);line-height:1.6}
.ribbon{background:#e5a13a;color:#3a2600;font-weight:700;font-size:13px;text-align:center;padding:7px}.ribbon a{color:#3a2600}
main{max-width:720px;margin:0 auto;padding:26px 22px 60px}h1{color:#0b4a8b;font-size:26px}h2{color:#0b4a8b}
a{color:#1f6fd6}hr{border:none;border-top:1px solid #dbe4ef;margin:20px 0}code{background:#e7eef7;padding:1px 5px;border-radius:4px}
table{border-collapse:collapse;width:100%;margin:12px 0}th,td{padding:8px 10px;border-bottom:1px solid #dbe4ef;text-align:left}</style></head>
<body><div class="ribbon">${ribbon} — <a href="/console">back to console</a></div><main>${inner}</main></body></html>`;
}

function landingPage(a, inner) {
  const rtl = a.language === "ar";
  return `<!doctype html><html lang="${a.language}"${rtl ? ' dir="rtl"' : ""}><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${a.cat} — ${a.mname} (draft)</title>
<style>body{margin:0;font-family:"Segoe UI",Roboto,Arial,system-ui,sans-serif;color:#0c1b2e;background:linear-gradient(180deg,#eaf1f8,#f6f9fd);line-height:1.6}
.ribbon{background:#e5a13a;color:#3a2600;font-weight:700;font-size:13px;text-align:center;padding:7px}
.ribbon a{color:#3a2600}main{max-width:760px;margin:0 auto;padding:26px 22px 60px}
h1{color:#0b4a8b;font-size:30px;letter-spacing:-.02em;line-height:1.15}h2{color:#0b4a8b;margin-top:28px}
table{border-collapse:collapse;width:100%;margin:14px 0;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 8px 24px -16px rgba(11,74,139,.4)}
th,td{padding:10px 12px;border-bottom:1px solid #dbe4ef;text-align:${rtl ? "right" : "left"}}th{background:#0b4a8b;color:#fff}
a{color:#1f6fd6}hr{border:none;border-top:1px solid #dbe4ef;margin:22px 0}
.cta{display:inline-block;margin-top:8px;background:#25a862;color:#fff;padding:12px 20px;border-radius:999px;font-weight:700;text-decoration:none}
code{background:#e7eef7;padding:1px 5px;border-radius:4px}</style></head>
<body><div class="ribbon">DRAFT preview · ${a.language.toUpperCase()} · GLM-5.2 · ${a.language !== "en" ? "pending native QA · " : ""}not published — <a href="/console">back to console</a></div>
<main>${inner}<p style="margin-top:30px"><a class="cta" href="#">Message us on WhatsApp →</a></p></main></body></html>`;
}

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const db = open();
  const send = (code, type, body) => { res.writeHead(code, { "content-type": type, "cache-control": "no-store" }); res.end(body); };
  try {
    if (url.pathname === "/") {
      const cats = db.prepare(`SELECT c.*, (SELECT min(india_low) FROM category_price p WHERE p.category_id=c.id) lo,
        (SELECT max(india_high) FROM category_price p WHERE p.category_id=c.id) hi
        FROM category c WHERE c.status='launch' ORDER BY c.rank`).all();
      const guides = db.prepare(`SELECT ca.*, c.name cat, mk.name mname FROM content_asset ca
        JOIN category c ON c.id=ca.category_id JOIN market mk ON mk.code=ca.market_code
        WHERE ca.status='published' AND ca.language='en' ORDER BY c.rank, mk.name`).all();
      return send(200, "text/html; charset=utf-8", renderHome({ cats, guides }));
    }
    if (url.pathname === "/console")
      return send(200, "text/html; charset=utf-8", readFileSync(join(HERE, "console.html")));
    if (url.pathname === "/worklist") {
      try {
        const md = readFileSync(join(ROOT, "outputs", "partner-research-worklist.md"), "utf8");
        return send(200, "text/html; charset=utf-8",
          docPage("Partner Research Worklist", "HUMAN research worklist · named decision-makers (public, ToS-clean)", mdToHtml(md)));
      } catch { return send(404, "text/html", "not built — run research_worklist.mjs"); }
    }
    if (url.pathname.startsWith("/site/") || url.pathname.startsWith("/outputs/screenshots/")) {
      const fp = join(ROOT, url.pathname.replace(/^\//, ""));
      if (!fp.startsWith(ROOT)) return send(403, "text/plain", "forbidden");
      try {
        const ext = fp.split(".").pop().toLowerCase();
        const ct = { html: "text/html; charset=utf-8", png: "image/png", jpg: "image/jpeg", css: "text/css", js: "text/javascript" }[ext] || "application/octet-stream";
        return send(200, ct, readFileSync(fp));
      } catch { return send(404, "text/html", "not built yet — run publish_site.mjs"); }
    }
    if (url.pathname === "/api/state")
      return send(200, "application/json", JSON.stringify(buildState(db)));
    if (url.pathname === "/api/runs")
      return send(200, "application/json", JSON.stringify(db.prepare(`SELECT * FROM run ORDER BY id DESC LIMIT 80`).all()));
    const m = url.pathname.match(/^\/draft\/(\d+)$/);
    if (m) {
      const a = db.prepare(`SELECT ca.*, c.name cat, mk.name mname FROM content_asset ca
        JOIN category c ON c.id=ca.category_id JOIN market mk ON mk.code=ca.market_code WHERE ca.id=?`).get(+m[1]);
      if (!a) return send(404, "text/html", "draft not found");
      const md = readFileSync(join(ROOT, a.file_ref), "utf8");
      return send(200, "text/html; charset=utf-8", landingPage(a, mdToHtml(md)));
    }
    const o = url.pathname.match(/^\/outreach\/(\d+)$/);
    if (o) {
      const row = db.prepare(`SELECT ot.*, pt.name partner FROM outreach ot JOIN partner pt ON pt.id=ot.partner_id WHERE ot.id=?`).get(+o[1]);
      if (!row) return send(404, "text/html", "outreach not found");
      const md = readFileSync(join(ROOT, row.file_ref), "utf8");
      return send(200, "text/html; charset=utf-8",
        docPage(`Outreach — ${row.partner}`, `DRAFT outreach · ${row.angle} angle · NOT sent (human-gated)`, mdToHtml(md)));
    }
    return send(404, "text/html", "not found");
  } catch (e) { send(500, "text/plain", String(e && e.stack || e)); }
  finally { db.close(); }
});
server.listen(PORT, () => console.log(`MedYatra console  ->  http://localhost:${PORT}`));
