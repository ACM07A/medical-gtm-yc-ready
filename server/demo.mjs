// DEMO HUB (/demo) — the single, showable entry point to every capability that's been built. Reads live
// counts from the data core so what a viewer sees is real, framed as a safe sandbox. This is the page you
// open when someone says "show me what it does." Everything it links to runs locally at ~$0; going live is
// a matter of plugging in API keys (see /plugins).
import { marketCleared } from "../data-core/db.mjs";

function stat(db, sql, ...p) { try { return db.prepare(sql).get(...p).c; } catch { return 0; } }

export function demoStats(db) {
  return {
    partners: stat(db, `SELECT count(*) c FROM partner`),
    named: stat(db, `SELECT count(*) c FROM poc WHERE contact_type IN ('named-verified','named-public')`),
    pubGuides: stat(db, `SELECT count(*) c FROM content_asset WHERE status='published' AND language='en'`),
    cells: stat(db, `SELECT count(*) c FROM content_asset`),
    proposals: stat(db, `SELECT count(*) c FROM proposal`),
    templates: stat(db, `SELECT count(*) c FROM comms_template`),
    leads: stat(db, `SELECT count(*) c FROM lead`),
    tenants: stat(db, `SELECT count(*) c FROM tenant WHERE active=1`),
    marketsCleared: stat(db, `SELECT count(*) c FROM market WHERE regulatory_status='verified'`),
    markets: stat(db, `SELECT count(*) c FROM market`),
    posts: stat(db, `SELECT count(*) c FROM channel_post`),
  };
}

const CSS = `
:root{--bg:#eef3f9;--panel:#fff;--ink:#0c1b2e;--muted:#5a6b80;--line:#e2ecf7;--brand:#0b4a8b;--brand2:#1f6fd6;--green:#1c8b50;--amber:#e5a13a;--shadow:0 18px 46px -28px rgba(11,74,139,.5)}
@media(prefers-color-scheme:dark){:root{--bg:#0e1621;--panel:#152232;--ink:#e7eefb;--muted:#8ba0ba;--line:#22364d;--brand:#5aa0ee;--brand2:#7cb6f5;--shadow:0 18px 46px -22px rgba(0,0,0,.6)}}
:root[data-theme=dark]{--bg:#0e1621;--panel:#152232;--ink:#e7eefb;--muted:#8ba0ba;--line:#22364d;--brand:#5aa0ee;--brand2:#7cb6f5;--shadow:0 18px 46px -22px rgba(0,0,0,.6)}
:root[data-theme=light]{--bg:#eef3f9;--panel:#fff;--ink:#0c1b2e;--muted:#5a6b80;--line:#e2ecf7;--brand:#0b4a8b;--brand2:#1f6fd6}
*{box-sizing:border-box}body{margin:0;font-family:"Segoe UI",Roboto,system-ui,-apple-system,sans-serif;color:var(--ink);background:var(--bg);line-height:1.55}
.ribbon{background:var(--amber);color:#3a2600;font-weight:700;font-size:12.5px;text-align:center;padding:7px 12px}
.wrap{max-width:1060px;margin:0 auto;padding:34px 22px 70px}
.hero{margin-bottom:26px}.eyebrow{font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:var(--brand2);font-weight:700}
h1{font-size:30px;margin:6px 0 8px;letter-spacing:-.02em;text-wrap:balance}.lede{font-size:16px;color:var(--muted);max-width:680px}
.kpis{display:flex;flex-wrap:wrap;gap:8px;margin:20px 0 6px}
.kpi{background:var(--panel);border:1px solid var(--line);border-radius:11px;padding:9px 14px;display:flex;flex-direction:column}
.kpi b{font-size:19px;color:var(--brand);font-variant-numeric:tabular-nums}.kpi span{font-size:11.5px;color:var(--muted)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;margin-top:22px}
.card{display:block;text-decoration:none;color:inherit;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:17px 18px;box-shadow:var(--shadow);transition:.16s}
.card:hover{border-color:var(--brand2);transform:translateY(-2px)}
.card.star{border-color:var(--brand);box-shadow:0 0 0 1px var(--brand),var(--shadow)}
.ic{font-size:22px;margin-bottom:9px}
.ct{font-size:16px;font-weight:700;color:var(--brand);display:flex;align-items:center;gap:8px}
.badge{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:1px 7px;border-radius:20px;background:rgba(28,139,80,.15);color:var(--green)}
.badge.edit{background:rgba(31,111,214,.14);color:var(--brand2)}.badge.new{background:rgba(229,161,58,.2);color:#9a6a12}
.cd{font-size:13.5px;color:var(--muted);margin:6px 0 10px}
.cstat{font-size:12px;color:var(--ink);font-weight:600}.cstat em{color:var(--muted);font-weight:400;font-style:normal}
.go{margin-top:30px;background:linear-gradient(135deg,#0b4a8b,#1f6fd6);color:#fff;border-radius:16px;padding:22px 24px}
.go h2{margin:0 0 6px;font-size:19px}.go p{margin:0 0 14px;opacity:.9;font-size:14px;max-width:720px}
.go a{color:#fff;font-weight:700;text-decoration:underline}
.gl{display:flex;flex-wrap:wrap;gap:8px}
.chip{background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.25);border-radius:9px;padding:7px 12px;font-size:12.5px;color:#fff;text-decoration:none}
.chip:hover{background:rgba(255,255,255,.24)}
.foot{margin-top:26px;font-size:12px;color:var(--muted);border-top:1px solid var(--line);padding-top:16px}
.foot b{color:var(--ink)}
@media(max-width:640px){h1{font-size:24px}}
`;

const CARDS = (s) => [
  { href: "/sandbox", star: true, ic: "💬", title: "Patient Journey Sandbox", badge: "editable", bc: "edit",
    desc: "Walk the full WhatsApp journey in a phone simulator. Play every branch and fallback; click any template to edit it live. White-label tenant switch.",
    stat: `${s.templates} templates · 22 journey stages · human-gated edits` },
  { href: "/agents", star: true, ic: "🤖", title: "Concierge Agents", badge: "live", bc: "edit",
    desc: "Triage, family updates, document KYC, billing reconciliation, visa, accommodation, ticketing, and more — click Run for real model output through the same safety gate as everything else. Not a transcript.",
    stat: `13 agents · safety-gated · works with or without an API key` },
  { href: "/journey", star: true, ic: "🧭", title: "Full Journey Orchestrator", badge: "live", bc: "",
    desc: "One real lead, every concierge agent, in the real chronological order — intake through aftercare in one run. Same handlers /agents uses; a step that fails doesn't stop the walkthrough.",
    stat: `13 agents · 1 lead · real chronological order` },
  { href: "/console", ic: "🖥️", title: "Operator Console", badge: "live", bc: "",
    desc: "The real-time cockpit: fit-ranked partner accounts, named decision-makers, portfolio scoring, competitor pricing, and a live activity feed.",
    stat: `${s.partners} partner accounts · <em>${s.named} named contacts</em>` },
  { href: "/studio", ic: "✅", title: "Studio — approve & deploy", badge: "live", bc: "",
    desc: "The human gate. One inbox of everything awaiting approval; gates (regulatory · verified contact · consent) enforced; Approve writes back to the DB.",
    stat: `${s.tenants} tenants · publishes pages, releases comms, advances leads` },
  { href: "/", ic: "📄", title: "Content library", badge: "published", bc: "",
    desc: "Cornerstone cost-guides across categories × markets × languages. Prices injected from the data core, QA-gated, and regulatory-gated before they go live.",
    stat: `${s.pubGuides} published · <em>${s.cells} cells drafted</em>` },
  { href: "/comms", ic: "🟢", title: "WhatsApp templates", badge: "review", bc: "new",
    desc: "The approval-ready sequence: minimal Utility-flavoured bodies, value in the infographic header. Ready to submit to Meta.",
    stat: `${s.templates} templates · utility + marketing · opt-out honoured` },
  { href: "/worklist", ic: "🔎", title: "Partner research worklist", badge: "human", bc: "new",
    desc: "The compliant sourcing bridge: ready-to-click search URLs for each star account so a human confirms the named decision-maker in ~10 min.",
    stat: `${s.partners} accounts · manual search, no anti-bot circumvention` },
  { href: "/distribution", ic: "📣", title: "Distribution queue", badge: "human-gated", bc: "",
    desc: "Each published page repurposed into platform-native posts (LinkedIn / IG / Reddit / WhatsApp / X). Nothing auto-posts.",
    stat: s.posts ? `${s.posts} posts queued` : `Run repurpose to fill — needs a generation key` },
  { href: "/benchmarks", ic: "📊", title: "Cross-tenant benchmarks", badge: "de-identified", bc: "",
    desc: "The honest, legally-clean learning layer: k-anonymised aggregate funnel across operators — every tenant + patient identifier stripped. Not data reuse.",
    stat: `${s.tenants} tenants · k-anonymised · suppresses small cells` },
  { href: "/plugins", ic: "🔌", title: "Plugin readiness", badge: "keys", bc: "new",
    desc: "What's live vs. one API key away — image gen, social posting, enrichment, WhatsApp. Everything is wired to the right API shape and off until keyed.",
    stat: `${s.marketsCleared}/${s.markets} markets cleared · delivery double-gated` },
];

export function renderDemo(db) {
  const s = demoStats(db);
  const cards = CARDS(s).map((c) => `<a class="card${c.star ? " star" : ""}" href="${c.href}">
    <div class="ic">${c.ic}</div>
    <div class="ct">${c.title}${c.badge ? `<span class="badge ${c.bc}">${c.badge}</span>` : ""}</div>
    <div class="cd">${c.desc}</div>
    <div class="cstat">${c.stat}</div></a>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>MedYatra — Live Demo</title><style>${CSS}</style></head><body>
<div class="ribbon">DEMO · everything here is real data running locally · human-gated · nothing is sent or posted</div>
<div class="wrap">
  <div class="hero">
    <div class="eyebrow">Agentic go-to-market engine · medical value travel</div>
    <h1>MedYatra — see the whole engine, live</h1>
    <p class="lede">An autonomous GTM engine for a medical-tourism facilitator: it decides what to sell, builds the hospital-partner supply side down to the named decision-maker, runs a multilingual content campaign, and drives each patient from first WhatsApp touch to treated-and-referred — all human-gated. Pick any surface below; it's real, and it's safe to click.</p>
    <div class="kpis">
      <div class="kpi"><b>${s.partners}</b><span>partner accounts</span></div>
      <div class="kpi"><b>${s.named}</b><span>named contacts</span></div>
      <div class="kpi"><b>${s.cells}</b><span>content cells</span></div>
      <div class="kpi"><b>${s.templates}</b><span>WhatsApp templates</span></div>
      <div class="kpi"><b>${s.leads}</b><span>demo leads</span></div>
      <div class="kpi"><b>${s.tenants}</b><span>tenants</span></div>
    </div>
  </div>
  <div class="grid">${cards}</div>
  <div class="go">
    <h2>Going live = plugging in keys</h2>
    <p>The whole loop runs at ~$0 marginal cost: generation is on free tiers with cross-provider failover, images and infographics are free, and every paid or outbound integration is wired to the correct API shape but <b>off until keyed and human-approved</b>. There is no rebuild between demo and production — it's an env file.</p>
    <div class="gl">
      <a class="chip" href="/plugins">🔌 Plugin readiness board</a>
      <a class="chip" href="/sandbox">💬 Try the journey sandbox</a>
      <a class="chip" href="/console">🖥️ Open the console</a>
      <a class="chip" href="/studio">✅ Open Studio</a>
    </div>
  </div>
  <div class="foot">
    <b>Honest by design:</b> MedYatra is a <b>facilitator, not a provider</b> — no clinical claims, prices cited or marked indicative, discovered contacts stored UNVERIFIED for human confirmation. Every outbound action is human-gated. A handful of markets are marked <b>regulatory-cleared for this demo only</b> (illustrative, not legal sign-off); the rest stay gated to show the guardrail working. Non-English content is machine-drafted and flagged pending native-speaker QA.
  </div>
</div></body></html>`;
}
