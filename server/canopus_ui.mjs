import { icons } from "lucide";

const esc = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

function attrsToHtml(attrs = {}) {
  return Object.entries(attrs).map(([key, value]) => {
    const name = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    return ` ${name}="${esc(value)}"`;
  }).join("");
}

function nodeToHtml([tag, attrs, children]) {
  return `<${tag}${attrsToHtml(attrs)}>${(children || []).map(nodeToHtml).join("")}</${tag}>`;
}

export function icon(name, size = 18, className = "") {
  const node = icons[name] || icons.CircleHelp;
  return `<svg class="icon ${esc(className)}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${node.map(nodeToHtml).join("")}</svg>`;
}

const NAV = [
  ["demo", "/demo", "House", "Overview"],
  ["cases", "/cases", "BriefcaseMedical", "Cases"],
  ["hospital", "/hospital", "Building2", "Hospitals"],
  ["agent", "/agent", "Users", "Agents"],
  ["vendors", "/vendors", "Handshake", "Vendors"],
  ["tasks", "/tasks", "ListTodo", "Tasks"],
  ["approvals", "/studio", "ShieldCheck", "Approvals"],
  ["ai", "/agents", "Bot", "AI activity"],
  ["integrations", "/integrations", "Plug", "Integrations"],
  ["audit", "/audit", "ScrollText", "Audit"],
];

export const APP_CSS = `
:root{
  --canvas:#c9cbc3;--app:#f8f9f3;--rail:#e9eae2;--surface:#fff;--surface-soft:#f2f3ec;
  --ink:#171a17;--muted:#6e736d;--line:#e0e2da;--line-strong:#cdd0c6;
  --coral:#f04b23;--coral-soft:#ffdcd2;--violet:#5527df;--violet-soft:#eee6ff;
  --lime:#dff58d;--lime-ink:#607b00;--mint:#dcf4e9;--mint-ink:#187152;
  --yellow:#f6cf50;--blue:#80a6f5;--danger:#b83d34;
}
*{box-sizing:border-box}
html{background:var(--canvas)}
body{margin:0;color:var(--ink);background:var(--canvas);font-family:Inter,"Segoe UI",Arial,sans-serif;line-height:1.42}
button,input,textarea,select{font:inherit}
a{color:inherit}
.app-frame{width:min(1480px,calc(100% - 36px));min-height:calc(100vh - 36px);margin:18px auto;background:var(--app);display:grid;grid-template-columns:88px minmax(0,1fr) 286px;overflow:hidden;border:1px solid rgba(23,26,23,.08)}
.demo-strip{grid-column:1/-1;background:#171a17;color:#fff;padding:7px 18px;font-size:11px;font-weight:750;letter-spacing:.04em;text-align:center}
.rail{background:var(--rail);padding:18px 12px 14px;display:flex;flex-direction:column;align-items:center;border-right:1px solid var(--line);min-height:calc(100vh - 70px)}
.brand-mark{width:48px;height:48px;display:grid;place-items:center;color:var(--coral);margin-bottom:24px}.brand-mark .icon{width:30px;height:30px;stroke-width:2.8}
.rail-nav{display:flex;flex-direction:column;gap:8px;align-items:center}
.rail-link,.rail-action{width:46px;height:46px;display:grid;place-items:center;border:1px solid transparent;border-radius:50%;color:#242724;text-decoration:none;background:transparent;position:relative}
.rail-link:hover,.rail-action:hover{background:#fff;border-color:var(--line-strong)}
.rail-link.active{background:var(--violet);color:#fff;box-shadow:0 7px 16px rgba(85,39,223,.2)}
.rail-link::after,.rail-action::after{content:attr(data-label);position:absolute;left:54px;top:50%;transform:translateY(-50%);background:#171a17;color:#fff;padding:5px 8px;border-radius:5px;font-size:11px;white-space:nowrap;opacity:0;pointer-events:none;z-index:20}
.rail-link:hover::after,.rail-action:hover::after{opacity:1}
.rail-foot{margin-top:auto;display:flex;flex-direction:column;gap:8px}
.workspace{min-width:0;padding:18px 26px 60px;overflow:hidden}
.topbar{height:56px;display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:18px}
.wordmark{font-family:Georgia,"Times New Roman",serif;font-size:22px;font-weight:800}.wordmark span{color:var(--coral)}
.top-tools{display:flex;align-items:center;gap:9px}
.search{height:38px;width:min(320px,34vw);border:1px solid var(--line-strong);background:#fff;border-radius:7px;display:flex;align-items:center;gap:8px;padding:0 11px;color:var(--muted);font-size:12px}
.icon-btn{width:38px;height:38px;border:1px solid var(--line-strong);border-radius:7px;background:#fff;display:grid;place-items:center;color:var(--ink)}
.context-rail{background:var(--rail);padding:18px 14px;border-left:1px solid var(--line);min-width:0}
.context-top{height:56px;display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-bottom:18px}
.profile{background:var(--surface);border:1px solid var(--line);padding:18px 14px;text-align:center;border-radius:8px}
.avatar{width:64px;height:64px;margin:0 auto 10px;border-radius:50%;background:var(--mint);display:grid;place-items:center;font-family:Georgia,serif;font-size:23px;font-weight:800;color:var(--mint-ink);border:5px solid #edf7f1}
.profile h3{font-family:Georgia,"Times New Roman",serif;font-size:18px;margin:0 0 2px}.profile p{font-size:11px;color:var(--muted);margin:0}
.context-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:8px 0}
.mini-stat{background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:10px 5px;text-align:center}
.mini-stat .icon{color:var(--coral)}.mini-stat:nth-child(2) .icon{color:#82a800}.mini-stat:nth-child(3) .icon{color:var(--violet)}
.mini-stat b{display:block;font-size:16px;margin-top:4px}.mini-stat span{display:block;color:var(--muted);font-size:9px}
.readiness{background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:14px;margin-top:8px}
.readiness-head{display:flex;align-items:center;justify-content:space-between;font-size:11px;color:var(--muted)}
.readiness h3{font-family:Georgia,"Times New Roman",serif;font-size:18px;margin:6px 0 12px}
.ring{width:122px;aspect-ratio:1;border-radius:50%;margin:8px auto 16px;background:conic-gradient(var(--lime) 0 42%,var(--yellow) 42% 59%,var(--blue) 59% 81%,#f28343 81%);position:relative;display:grid;place-items:center}
.ring::after{content:"";position:absolute;width:76px;aspect-ratio:1;border-radius:50%;background:#fff}
.ring-value{position:relative;z-index:1;text-align:center;font-size:10px;color:var(--muted)}.ring-value b{display:block;color:var(--ink);font-family:Georgia,serif;font-size:24px}
.mode-row{display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--line);padding-top:10px;font-size:11px}.mode-dot{width:7px;height:7px;border-radius:50%;background:#a4cf37;display:inline-block;margin-right:6px}
.head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;margin-bottom:18px}.eyebrow{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--coral);font-weight:850}
h1,h2,h3{letter-spacing:0}h1{font-family:Georgia,"Times New Roman",serif;font-size:30px;line-height:1.12;margin:3px 0 7px}h2{font-family:Georgia,"Times New Roman",serif;font-size:18px;margin:24px 0 10px}h3{font-size:14px;margin:0 0 8px}.lede{color:var(--muted);font-size:13px;max-width:760px;margin:0}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}.card,.panel{min-width:0;background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:14px;box-shadow:none}
.card-accent{min-height:112px;background:var(--lime);border-color:#d2e77d}.card-accent.mint{background:var(--mint);border-color:#cae8dc}.card-accent.coral{background:var(--coral-soft);border-color:#f3c9bd}.card-accent.violet{background:var(--violet-soft);border-color:#ded0fb}
.k{font-family:Georgia,"Times New Roman",serif;font-size:28px;font-weight:800}.label{font-size:11px;color:var(--muted)}
table{width:100%;border-collapse:separate;border-spacing:0;background:var(--surface);border:1px solid var(--line);border-radius:8px;overflow:hidden}
th,td{padding:11px 10px;border-bottom:1px solid var(--line);text-align:left;font-size:12px;vertical-align:top}tr:last-child td{border-bottom:0}th{background:var(--surface-soft);color:#5d625d;font-size:9px;text-transform:uppercase;letter-spacing:.08em}
tbody tr:hover{background:#fafbf6}
.badge{display:inline-block;font-size:9px;font-weight:850;text-transform:uppercase;border-radius:999px;padding:4px 8px;background:#eceee7;color:#565c56;white-space:nowrap}
.badge.completed,.badge.released,.badge.approved,.badge.ready,.badge.captured,.badge.verified-demo-docs,.badge.arrival-scheduled{background:var(--mint);color:var(--mint-ink)}
.badge.blocked,.badge.missing,.badge.disabled,.badge.rejected{background:var(--coral-soft);color:var(--danger)}
.badge.waiting-for-input,.badge.needs-review,.badge.requested,.badge.mock,.badge.scheduled,.badge.medium{background:#fff1c7;color:#7d6000}
.badge.high{background:var(--violet-soft);color:var(--violet)}
.split{display:grid;grid-template-columns:1.35fr .9fr;gap:10px}.split>*{min-width:0}.tabs{display:flex;gap:7px;flex-wrap:wrap;margin:12px 0}.tab{background:var(--surface);border:1px solid var(--line);border-radius:7px;padding:7px 9px;font-size:11px;font-weight:700;color:#555b55}.tab:first-child{background:var(--ink);color:#fff;border-color:var(--ink)}
.callout{border-left:3px solid var(--coral);background:#fff5ef;padding:10px 12px;border-radius:5px;color:#61352b;font-size:12px}
.actions{display:flex;gap:8px;flex-wrap:wrap}.btn{min-height:36px;border:1px solid var(--line-strong);background:#fff;color:var(--ink);border-radius:7px;padding:7px 11px;font-weight:750;text-decoration:none;font-size:11px;display:inline-flex;align-items:center;justify-content:center;gap:6px}.btn:hover{border-color:#9ea49b}.btn.primary{background:var(--coral);color:#fff;border-color:var(--coral);cursor:pointer}.btn.dark{background:var(--ink);color:#fff;border-color:var(--ink)}.btn:disabled{opacity:.45;cursor:not-allowed}
pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#1b1e1b;color:#f6f7f2;padding:12px;border-radius:7px;font-size:11px}
textarea,input,select{width:100%;border:1px solid var(--line-strong);border-radius:6px;padding:8px;background:#fff;color:var(--ink)}textarea{min-height:126px;resize:vertical;font-family:Consolas,monospace;font-size:11px}
.field-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:9px 0}.field label{display:block;font-size:10px;color:var(--muted);font-weight:700;margin-bottom:3px}.result{margin-top:12px;overflow:auto}.result:empty{display:none}
.inline-edit{display:grid;grid-template-columns:118px minmax(150px,1fr) 38px;gap:6px;min-width:330px}.inline-edit .icon-btn{height:34px}.inline-edit input,.inline-edit select{height:34px;padding:6px 7px;font-size:11px}
.request-editor{display:grid;grid-template-columns:110px 62px 88px minmax(170px,1fr) minmax(180px,1fr) 38px;gap:6px;min-width:690px}.request-editor .icon-btn{height:34px}.request-editor input,.request-editor select{height:34px;padding:6px 7px;font-size:11px}
.metric-row{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin:14px 0}.metric-tile{border-radius:8px;padding:13px;border:1px solid var(--line);background:#fff}.metric-tile:nth-child(1){background:var(--lime)}.metric-tile:nth-child(2){background:var(--mint)}.metric-tile:nth-child(3){background:var(--coral-soft)}.metric-tile:nth-child(4){background:var(--violet-soft)}
.surface-link{text-decoration:none;transition:transform .15s ease,border-color .15s ease}.surface-link:hover{transform:translateY(-2px);border-color:#b8bbb3}
.network{display:grid;grid-template-columns:1fr 1fr;gap:8px}.node{border:1px solid var(--line);border-radius:7px;padding:11px;background:#fff}.node.center{grid-column:1/3;background:var(--violet);color:#fff}.node.center .label{color:#ddd5ff}
.path{padding-left:20px}.path li{margin:7px 0;font-size:12px}.foot{font-size:11px;color:var(--muted);border-top:1px solid var(--line);padding-top:14px;margin-top:22px}
.mobile-brand{display:none}
@media(max-width:1180px){.app-frame{grid-template-columns:82px minmax(0,1fr)}.context-rail{display:none}}
@media(max-width:760px){
  html,body{background:var(--app)}.app-frame{width:100%;min-height:100vh;margin:0;border:0;display:block;padding-bottom:72px}.demo-strip{font-size:9px}.rail{position:fixed;left:0;right:0;bottom:0;z-index:30;min-height:0;height:68px;padding:8px 10px;display:block;border:0;border-top:1px solid var(--line)}.brand-mark,.rail-foot{display:none}.rail-nav{height:100%;flex-direction:row;justify-content:space-around;gap:2px}.rail-link{width:42px;height:42px}.rail-link:nth-child(n+7){display:none}.rail-link::after{display:none}.workspace{padding:12px 15px 36px}.topbar{height:46px;margin-bottom:12px}.wordmark{font-size:19px}.search{display:none}.context-rail{display:none}.head{display:block}.split{grid-template-columns:1fr}.metric-row{grid-template-columns:1fr 1fr}.field-grid{grid-template-columns:1fr 1fr}table{display:block;overflow-x:auto}h1{font-size:25px}.grid{grid-template-columns:1fr}}
@media(max-width:440px){.field-grid{grid-template-columns:1fr}.metric-row{grid-template-columns:1fr 1fr}.top-tools .icon-btn:first-of-type{display:none}}
`;

export function appShell(title, inner, options = {}) {
  const active = options.active || "demo";
  const userName = options.userName || "Asha Mehta";
  const userRole = options.userRole || "Platform operations";
  const initials = userName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const metrics = options.metrics || { cases: 2, agents: 16, actions: 0 };
  const nav = NAV.map(([key, href, iconName, label]) =>
    `<a class="rail-link${key === active ? " active" : ""}" href="${href}" aria-label="${label}" data-label="${label}">${icon(iconName, 19)}</a>`
  ).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f8f9f3"><title>${esc(title)} | CanopusCare</title><style>${APP_CSS}</style></head><body>
  <div class="app-frame">
    <div class="demo-strip">DEMO ENVIRONMENT · SYNTHETIC DATA · EXTERNAL ACTIONS DISABLED</div>
    <aside class="rail"><a class="brand-mark" href="/demo" aria-label="CanopusCare home">${icon("Sparkles", 30)}</a><nav class="rail-nav">${nav}</nav><div class="rail-foot"><a class="rail-action" href="/integrations" aria-label="Settings" data-label="Settings">${icon("Settings",19)}</a><a class="rail-action" href="/docs/YC_REVIEWER_GUIDE.md" aria-label="Help" data-label="Help">${icon("CircleHelp",19)}</a></div></aside>
    <section class="workspace">
      <header class="topbar"><div class="wordmark">Canopus<span>Care</span></div><div class="top-tools"><div class="search">${icon("Search",15)}<span>Search cases, vendors, tasks</span></div><button class="icon-btn" title="Notifications" aria-label="Notifications">${icon("Bell",17)}</button><a class="icon-btn" href="/integrations" title="Settings" aria-label="Settings">${icon("Settings",17)}</a></div></header>
      <main>${inner}</main>
    </section>
    <aside class="context-rail"><div class="context-top"><button class="icon-btn" title="Support" aria-label="Support">${icon("MessageCircleQuestion",17)}</button></div>
      <section class="profile"><div class="avatar">${esc(initials)}</div><h3>${esc(userName)}</h3><p>${esc(userRole)}</p></section>
      <div class="context-metrics"><div class="mini-stat">${icon("MapPin",15)}<b>${esc(metrics.cases)}</b><span>Cases</span></div><div class="mini-stat">${icon("Bot",15)}<b>${esc(metrics.agents)}</b><span>Agents</span></div><div class="mini-stat">${icon("Send",15)}<b>${esc(metrics.actions)}</b><span>Live actions</span></div></div>
      <section class="readiness"><div class="readiness-head"><span>Platform readiness</span><span>Demo</span></div><h3>Controlled operations</h3><div class="ring"><div class="ring-value">Checks<b>12</b></div></div><div class="mode-row"><span><i class="mode-dot"></i>Database ready</span><b>100%</b></div></section>
    </aside>
  </div></body></html>`;
}
