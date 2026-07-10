// MedYatra local backend — zero external deps. Serves a LIVE operator console that reads the
// data core, a runs/activity feed, and renders content drafts as patient landing pages.
//   node --experimental-sqlite server/server.mjs   ->   http://localhost:5173
import { createServer } from "node:http";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadEnv } from "../lib/env.mjs";
loadEnv();   // so /plugins reflects configured keys
import { open, getState, readiness, marketCleared, logRun } from "../data-core/db.mjs";
import { mdToHtml } from "./md.mjs";
import { renderHome } from "./landing_home.mjs";
import { plugins as pluginList } from "../lib/plugins.mjs";
import { nextAction } from "../lib/comms_machine.mjs";
import { renderStudio, studioQueue, studioApprove } from "./studio.mjs";

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
        outcome: p.outcome && p.outcome !== "none" ? p.outcome : null,
        readiness: readiness(p),   // execution risk, kept SEPARATE from fit (opportunity)
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
<body><div class="ribbon">DRAFT preview · ${a.language.toUpperCase()} · Tier-2 draft · ${a.language !== "en" ? "pending native QA · " : ""}not published — <a href="/console">back to console</a></div>
<main>${inner}<p style="margin-top:30px"><a class="cta" href="#">Message us on WhatsApp →</a></p></main></body></html>`;
}

const readBody = (req) => new Promise((resolve) => {
  let s = ""; req.on("data", (d) => { s += d; if (s.length > 1e6) req.destroy(); });
  req.on("end", () => { try { resolve(JSON.parse(s || "{}")); } catch { resolve({}); } });
  req.on("error", () => resolve({}));
});

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const db = open();
  const send = (code, type, body) => { res.writeHead(code, { "content-type": type, "cache-control": "no-store" }); res.end(body); };
  // ACCESS CONTROL: the console + APIs expose named partner contacts and pipeline. If CONSOLE_TOKEN is set,
  // gate everything except the public patient site (/, /site, /outputs) and the health probe. REQUIRED
  // before exposing this beyond localhost. (No token set = open, for localhost dev.)
  const PROTECTED = /^\/(console|studio|api\/(state|runs|studio)|draft|outreach|worklist|comms|distribution|plugins)/;
  if (process.env.CONSOLE_TOKEN && PROTECTED.test(url.pathname)) {
    const auth = req.headers.authorization || "";
    const pass = auth.startsWith("Basic ") ? Buffer.from(auth.slice(6), "base64").toString().split(":").slice(1).join(":") : "";
    if (pass !== process.env.CONSOLE_TOKEN) {
      db.close();
      res.writeHead(401, { "WWW-Authenticate": 'Basic realm="MedYatra console"', "content-type": "text/plain" });
      return res.end("authentication required");
    }
  }
  try {
    // STUDIO — the live approve-and-deploy console (real data + write-back actions).
    if (req.method === "POST" && url.pathname === "/api/studio/approve") {
      const body = await readBody(req);
      return send(200, "application/json", JSON.stringify(studioApprove(db, body)));
    }
    if (url.pathname === "/studio")
      return send(200, "text/html; charset=utf-8", renderStudio(db));
    if (url.pathname === "/api/studio")
      return send(200, "application/json", JSON.stringify(studioQueue(db)));
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
          docPage("Partner Research Worklist", "HUMAN research worklist · named decision-makers (manual search — no automated circumvention)", mdToHtml(md)));
      } catch { return send(404, "text/html", "not built — run research_worklist.mjs"); }
    }
    if (url.pathname === "/plugins") {
      const ps = pluginList();
      const rows = ps.map((p) => `| ${p.ready ? "🟢 ready" : "⚪ needs key"} | **${p.name}** | ${p.purpose} | \`${p.envKeys.join("`, `")}\` | ${p.requirements} |`).join("\n");
      const body = `# Content Plugins — readiness\n\n> Every integration is wired to the correct API shape. **${ps.filter((p) => p.ready).length}/${ps.length} ready**; the rest are one API key away. Delivery is double-gated (needs \`POST_LIVE=1\` **and** per-post approval) — nothing auto-posts.\n\n| Status | Plugin | What it does | Env key(s) | Needs |\n|---|---|---|---|---|\n${rows}\n\nAdd keys to \`integrations/.env\`, restart, and the status flips to 🟢.`;
      return send(200, "text/html; charset=utf-8", docPage("Content Plugins", "Integration readiness — what's live vs one key away", mdToHtml(body)));
    }
    if (url.pathname === "/comms") {
      const rows = db.prepare(`SELECT * FROM comms_template ORDER BY seq`).all();
      const card = (t) => {
        const btns = (() => { try { return JSON.parse(t.buttons || "[]"); } catch { return []; } })();
        const img = t.header_asset ? `/${t.header_asset.replace(/^\//, "")}` : "";
        return `<div class="wa">
          <div class="stg"><span class="n">${t.seq}</span> ${t.stage.replace(/_/g, " ")}
            <span class="tag ${t.category}">${t.category}</span><span class="tag ${t.msg_type}">${t.msg_type}</span></div>
          <div class="bub">
            ${img ? `<img src="${img}" alt="header">` : ""}
            <div class="bd">${(t.body || "").replace(/\{\{(\d)\}\}/g, '<b>{{$1}}</b>')}</div>
            <div class="btns">${btns.map((b) => `<span>${b.text}</span>`).join("")}</div>
          </div></div>`;
      };
      const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sales Comms — WhatsApp sequence</title>
<style>body{margin:0;font-family:"Segoe UI",Roboto,Arial,system-ui,sans-serif;color:#0c1b2e;background:linear-gradient(180deg,#e9f1f8,#eef4fb);line-height:1.5}
.ribbon{background:#e5a13a;color:#3a2600;font-weight:700;font-size:13px;text-align:center;padding:8px}.ribbon a{color:#3a2600}
main{max-width:820px;margin:0 auto;padding:24px 20px 70px}h1{color:#0b4a8b;font-size:24px;margin:0 0 4px}.sub{color:#5a6b80;font-size:14px;margin-bottom:20px}
.wa{margin:26px 0}.stg{font-weight:700;text-transform:capitalize;color:#0b4a8b;margin-bottom:8px;display:flex;align-items:center;gap:8px}
.stg .n{background:#0b4a8b;color:#fff;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-size:13px}
.tag{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:2px 8px;border-radius:6px;background:#dbe4ef;color:#5a6b80}
.tag.utility{background:rgba(37,168,98,.15);color:#1c8b50}.tag.marketing{background:rgba(229,161,58,.2);color:#9a6a12}.tag.session{background:rgba(31,111,214,.12);color:#1f6fd6}
.bub{background:#fff;border-radius:4px 18px 18px 18px;box-shadow:0 10px 30px -18px rgba(11,74,139,.5);overflow:hidden;max-width:420px;border:1px solid #e2ecf7}
.bub img{width:100%;display:block}.bd{padding:12px 15px;font-size:14.5px}.bd b{color:#0b4a8b;background:#eef4fb;padding:0 3px;border-radius:3px;font-weight:600}
.btns{display:flex;flex-direction:column;border-top:1px solid #eef2f7}.btns span{padding:11px;text-align:center;color:#1f6fd6;font-weight:600;font-size:14px;border-top:1px solid #eef2f7;cursor:default}
.btns span:first-child{border-top:none}</style></head>
<body><div class="ribbon">SALES COMMS · WhatsApp sequence · body = minimal/kosher, value rides in the image header · human submits to Meta &amp; sends — <a href="/console">back to console</a></div>
<main><h1>Post-lead WhatsApp sequence</h1><div class="sub">${rows.length} templates · body kept Utility-flavoured for approval; the persuasion (cost, savings, process) lives in the infographic header. See <a href="/site/../build-os/09_SALES_COMMS_PLAYBOOK.md">/build-os/09</a>.</div>
${rows.map(card).join("")}</main></body></html>`;
      return send(200, "text/html; charset=utf-8", html);
    }
    if (url.pathname === "/distribution") {
      const posts = db.prepare(`SELECT cp.*, c.name cat, mk.name mname FROM channel_post cp
        JOIN category c ON c.id=cp.category_id JOIN market mk ON mk.code=cp.market_code
        ORDER BY cp.content_asset_id, cp.channel`).all();
      const icon = { linkedin: "in", instagram: "IG", reddit: "r/", whatsapp: "WA", x: "X" };
      let body = `# Content Distribution Queue\n\n> Each published cornerstone page, repurposed into platform-native posts by the Tier-2 model (facts injected, no invention). **Human-gated — nothing auto-posts.** ${posts.length} drafts.\n\n`;
      let lastAsset = null;
      for (const p of posts) {
        if (p.content_asset_id !== lastAsset) { body += `\n---\n## ${p.cat} × ${p.mname}\n`; lastAsset = p.content_asset_id; }
        body += `\n### ${icon[p.channel] || ""} ${p.channel.toUpperCase()} · _${p.format}_ · \`${p.status}\` · ${p.model || ""}\n\n${p.body}\n`;
      }
      if (!posts.length) body += "_No posts yet — run `npm run loop` or `data-core/repurpose_content.mjs`._";
      return send(200, "text/html; charset=utf-8",
        docPage("Content Distribution Queue", "REPURPOSED social posts · human-gated (nothing auto-posts)", mdToHtml(body)));
    }
    if (url.pathname.startsWith("/site/") || url.pathname.startsWith("/outputs/screenshots/")
        || url.pathname.startsWith("/outputs/comms/") || url.pathname.startsWith("/outputs/social/")) {
      const fp = join(ROOT, url.pathname.replace(/^\//, ""));
      if (!fp.startsWith(ROOT)) return send(403, "text/plain", "forbidden");
      try {
        const ext = fp.split(".").pop().toLowerCase();
        const ct = { html: "text/html; charset=utf-8", png: "image/png", jpg: "image/jpeg", css: "text/css", js: "text/javascript" }[ext] || "application/octet-stream";
        return send(200, ct, readFileSync(fp));
      } catch { return send(404, "text/html", "not built yet — run publish_site.mjs"); }
    }
    if (url.pathname === "/api/health") {
      const done = getState(db, "loop_completed");
      const ageH = done ? (Date.now() - Date.parse(done.v)) / 36e5 : null;
      const staleAfter = Number(process.env.LOOP_STALE_HOURS) || 8;   // 6h schedule + grace
      return send(200, "application/json", JSON.stringify({
        ok: ageH != null && ageH < staleAfter,
        last_loop_completed: done?.v || null, hours_since: ageH == null ? null : +ageH.toFixed(1),
        stale: ageH == null || ageH >= staleAfter, last_backup: getState(db, "last_backup")?.v || null,
        runs: db.prepare(`SELECT count(*) c FROM run`).get().c,
        fails_recent: db.prepare(`SELECT count(*) c FROM run WHERE status='fail' AND ts > datetime('now','-1 day')`).get().c,
      }));
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
