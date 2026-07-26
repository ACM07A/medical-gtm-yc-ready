const esc = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

// Repository-local Lucide-style subset. Icons must never make the HTTP server depend on npm at boot.
const ICONS = {
  circleHelp: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.7 2.7 0 1 1 4.8 1.7c-1 .8-2.3 1-2.3 2.8"/><path d="M12 17.5h.01"/>',
  house: '<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>',
  briefcase: '<rect width="20" height="14" x="2" y="7" rx="2"/><path d="M8 7V4h8v3M12 11v5M9.5 13.5h5"/>',
  building: '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18M2 22h20M10 6h4M10 10h4M10 14h4M10 18h4"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  handshake: '<path d="m8 12 3 3a1.4 1.4 0 0 1-2 2l-5-5 4-4 3 3 2-2a3 3 0 0 1 4 0l4 4-3 3-4-4"/><path d="m2 11 6-6 3 3M22 11l-5-5-2 2"/>',
  list: '<path d="M10 6h11M10 12h11M10 18h11"/><path d="m3 6 1 1 2-2M3 12h3M3 18h3"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3z"/><path d="m9 12 2 2 4-4"/>',
  bot: '<rect width="18" height="10" x="3" y="11" rx="2"/><circle cx="9" cy="16" r="1"/><circle cx="15" cy="16" r="1"/><path d="M12 2v4M8 7h8"/>',
  plug: '<path d="M12 22v-5M9 8V2M15 8V2"/><path d="M18 8v4a6 6 0 0 1-12 0V8z"/>',
  document: '<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h6M9 17h6"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1z"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  pin: '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0"/><circle cx="12" cy="10" r="2"/>',
  send: '<path d="m22 2-7 20-4-9-9-4zM22 2 11 13"/>',
  save: '<path d="M5 3h12l4 4v14H3V5a2 2 0 0 1 2-2zM7 3v6h9V3M7 21v-8h10v8"/>',
  rotate: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5"/>',
  sparkles: '<path d="m12 3-1.8 4.2L6 9l4.2 1.8L12 15l1.8-4.2L18 9l-4.2-1.8zM5 16l-1 2-2 1 2 1 1 2 1-2 2-1-2-1z"/>',
};
const ICON_ALIAS = {
  House: "house", BriefcaseMedical: "briefcase", Building2: "building", Users: "users",
  Handshake: "handshake", ListTodo: "list", ShieldCheck: "shield", Bot: "bot", Plug: "plug",
  ScrollText: "document", Code2: "document", FileUp: "document", ClipboardCheck: "document",
  BookOpenText: "document", Search: "search", ScanSearch: "search", Settings: "settings",
  Bell: "bell", MapPin: "pin", Send: "send", Save: "save", RotateCcw: "rotate",
  Sparkles: "sparkles", CircleHelp: "circleHelp", MessageCircleQuestion: "circleHelp",
  KeyRound: "circleHelp",
};

export function icon(name, size = 18, className = "") {
  const body = ICONS[ICON_ALIAS[name]] || ICONS.circleHelp;
  return `<svg class="icon ${esc(className)}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
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
.case-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.case-fact{border-bottom:1px solid var(--line);padding:7px 0;min-width:0}.case-fact b{display:block;font-size:10px;color:var(--muted);margin-bottom:2px}.case-fact span{font-size:12px;overflow-wrap:anywhere}
.path{padding-left:20px}.path li{margin:7px 0;font-size:12px}.foot{font-size:11px;color:var(--muted);border-top:1px solid var(--line);padding-top:14px;margin-top:22px}
.mobile-brand{display:none}
@media(max-width:1180px){.app-frame{grid-template-columns:82px minmax(0,1fr)}.context-rail{display:none}}
@media(max-width:760px){
  html,body{background:var(--app)}.app-frame{width:100%;min-height:100vh;margin:0;border:0;display:block;padding-bottom:72px}.demo-strip{font-size:9px}.rail{position:fixed;left:0;right:0;bottom:0;z-index:30;min-height:0;height:68px;padding:8px 10px;display:block;border:0;border-top:1px solid var(--line)}.brand-mark,.rail-foot{display:none}.rail-nav{height:100%;flex-direction:row;justify-content:space-around;gap:2px}.rail-link{width:42px;height:42px}.rail-link:nth-child(n+7){display:none}.rail-link::after{display:none}.workspace{padding:12px 15px 36px}.topbar{height:46px;margin-bottom:12px}.wordmark{font-size:19px}.search{display:none}.context-rail{display:none}.head{display:block}.split{grid-template-columns:1fr}.metric-row{grid-template-columns:1fr 1fr}.field-grid{grid-template-columns:1fr 1fr}table{display:block;overflow-x:auto}h1{font-size:25px}.grid{grid-template-columns:1fr}}
@media(max-width:440px){.field-grid,.case-facts{grid-template-columns:1fr}.metric-row{grid-template-columns:1fr 1fr}.top-tools .icon-btn:first-of-type{display:none}}

/* Reviewer UI refresh: quiet healthcare operations dashboard inspired by the supplied references. */
:root{
  --canvas:#e8ebe9;--app:#f7f8f7;--rail:#f3f5f3;--surface:#ffffff;--surface-soft:#f5f7f5;
  --ink:#111713;--muted:#747b76;--line:#e5e9e6;--line-strong:#d7ddd9;
  --coral:#ef6a52;--coral-soft:#fff0ec;--violet:#2468e8;--violet-soft:#eaf1ff;
  --lime:#dff2da;--lime-ink:#22613f;--mint:#e3f4eb;--mint-ink:#176844;
  --yellow:#f4d36a;--blue:#4c86ee;--danger:#b73b35;--green:#166a45;--green-2:#23865a;
  --shadow:0 22px 70px rgba(30,43,35,.12);
}
html{background:var(--canvas)}
body{background:radial-gradient(circle at 50% -15%,#f7f8f7 0,#e8ebe9 52%,#dde1de 100%);font-family:Inter,"Segoe UI",Arial,sans-serif}
.app-frame{width:min(1510px,calc(100% - 48px));min-height:calc(100vh - 48px);margin:24px auto;grid-template-columns:210px minmax(0,1fr) 270px;border:1px solid rgba(17,23,19,.06);border-radius:22px;box-shadow:var(--shadow)}
.demo-strip{padding:8px 20px;background:#10271d;color:#d9eee3;font-size:10px;letter-spacing:.1em}
.rail{padding:22px 15px 16px;align-items:stretch;background:var(--rail);min-height:calc(100vh - 88px)}
.brand-lockup{height:46px;display:flex;align-items:center;gap:10px;margin:0 6px 26px;text-decoration:none;font-size:17px;font-weight:800}
.brand-mark{width:36px;height:36px;margin:0;border:1px solid #c9ddd2;border-radius:50%;background:#fff;color:var(--green)}
.brand-mark .icon{width:20px;height:20px;stroke-width:2.5}
.brand-name{display:block}.brand-name b{color:var(--green)}
.rail-nav{align-items:stretch;gap:4px}
.rail-link,.rail-action{width:100%;height:42px;display:flex;justify-content:flex-start;gap:11px;padding:0 12px;border-radius:9px;color:#68706a;font-size:12px;font-weight:650}
.rail-link .icon,.rail-action .icon{width:17px;height:17px;stroke-width:1.8}
.nav-label{display:inline}
.rail-link:hover,.rail-action:hover{background:#fff;color:var(--ink);border-color:var(--line)}
.rail-link.active{background:#e2f0e8;color:var(--green);box-shadow:inset 3px 0 0 var(--green);border-color:transparent}
.rail-link::after,.rail-action::after{display:none}
.rail-foot{align-items:stretch;border-top:1px solid var(--line);padding-top:12px}
.workspace{padding:20px 24px 52px;background:var(--app)}
.topbar{height:48px;margin-bottom:22px}
.wordmark{display:none}
.top-tools{width:100%;justify-content:flex-end}
.search{margin-right:auto;width:min(410px,45vw);height:40px;border:0;background:#fff;border-radius:12px;box-shadow:0 2px 10px rgba(30,43,35,.04)}
.icon-btn{width:40px;height:40px;border:0;border-radius:50%;background:#fff;box-shadow:0 2px 10px rgba(30,43,35,.05)}
.context-rail{padding:20px 14px;background:var(--rail)}
.context-top{height:48px;margin-bottom:22px}
.profile{border:0;border-radius:14px;padding:18px 12px;box-shadow:0 3px 14px rgba(30,43,35,.05)}
.avatar{width:58px;height:58px;border:4px solid #fff;background:#dceee5;color:var(--green);font-family:inherit;font-size:18px;box-shadow:0 0 0 1px var(--line)}
.profile h3{font-family:inherit;font-size:16px}.profile p{font-size:10px}
.context-metrics{gap:7px;margin:9px 0}
.mini-stat{border:0;border-radius:12px;padding:11px 4px;box-shadow:0 3px 14px rgba(30,43,35,.04)}
.mini-stat .icon{color:var(--green)}.mini-stat:nth-child(2) .icon{color:var(--blue)}.mini-stat:nth-child(3) .icon{color:var(--coral)}
.readiness{border:0;border-radius:14px;padding:15px;box-shadow:0 3px 14px rgba(30,43,35,.05)}
.readiness h3{font-family:inherit;font-size:16px}
.ring{width:116px;background:conic-gradient(var(--green-2) 0 68%,var(--blue) 68% 82%,var(--yellow) 82% 91%,var(--coral) 91%)}
.ring-value b{font-family:inherit;font-size:25px}
.head{align-items:center;margin-bottom:20px}.eyebrow{color:var(--green);letter-spacing:.08em}
h1,h2,h3{font-family:Inter,"Segoe UI",Arial,sans-serif}
h1{font-size:28px;font-weight:680;line-height:1.16}h2{font-size:16px;font-weight:700;margin:24px 0 11px}h3{font-size:13px}
.lede{font-size:12px}
.grid{gap:12px}.card,.panel{border:0;border-radius:12px;padding:15px;box-shadow:0 3px 15px rgba(30,43,35,.045)}
.card-accent{background:linear-gradient(145deg,#e0f2e7,#f5fbf7);border:0}.card-accent.mint{background:linear-gradient(145deg,#e4f3eb,#f8fbf9)}.card-accent.coral{background:linear-gradient(145deg,#ffebe5,#fff8f6)}.card-accent.violet{background:linear-gradient(145deg,#e7efff,#f7f9ff)}
.k{font-family:inherit;font-size:30px;font-weight:650}
table{border:0;border-radius:12px;box-shadow:0 3px 15px rgba(30,43,35,.045)}
th,td{padding:11px 12px;border-color:#edf0ee;font-size:11px}th{background:#f8f9f8;color:#737b75;font-size:9px}
tbody tr:hover{background:#f5faf7}
.badge{padding:4px 8px;font-size:8.5px;letter-spacing:.02em}
.badge.completed,.badge.released,.badge.approved,.badge.ready,.badge.captured,.badge.verified-demo-docs,.badge.arrival-scheduled,.badge.shared-with-hospital,.badge.hospital-reviewing,.badge.response-received,.badge.option-accepted,.badge.travel-preparation,.badge.arrival-ready{background:#dff2e8;color:#176844}
.badge.high{background:#e7efff;color:#245dc7}
.split{gap:12px}.tabs{gap:6px;margin:13px 0 16px}.tab{border:0;border-radius:999px;padding:7px 11px;background:#edf0ee;color:#626a64;font-size:10px}.tab:first-child{background:var(--green);color:#fff}
.callout{border:0;border-left:3px solid var(--green-2);background:#edf7f1;color:#24513b;border-radius:7px}
.btn{min-height:38px;border-color:var(--line-strong);border-radius:999px;padding:8px 14px}.btn.primary{background:var(--green);border-color:var(--green)}.btn.primary:hover{background:#0f5839}.btn.dark{background:#18221d;border-color:#18221d}
textarea,input,select{border-color:var(--line);border-radius:9px;background:#fbfcfb}
.metric-row{gap:10px}.metric-tile{border:0;border-radius:12px;box-shadow:0 3px 15px rgba(30,43,35,.045)}.metric-tile:nth-child(1){background:linear-gradient(145deg,#176b46,#23865a);color:#fff}.metric-tile:nth-child(1) .label{color:#d9eee3}.metric-tile:nth-child(2){background:#fff}.metric-tile:nth-child(3){background:#edf3ff}.metric-tile:nth-child(4){background:#fff1ed}
.network{gap:10px}.node{border:0;border-radius:10px;box-shadow:0 3px 12px rgba(30,43,35,.045)}.node.center{background:var(--green)}
.case-fact{border-color:#edf0ee}.foot{border-color:var(--line)}
@media(max-width:1240px){.app-frame{grid-template-columns:196px minmax(0,1fr)}.context-rail{display:none}}
@media(max-width:820px){
  html,body{background:var(--app)}.app-frame{width:100%;min-height:100vh;margin:0;border:0;border-radius:0;box-shadow:none;display:block;padding-bottom:72px}
  .demo-strip{font-size:8px}.rail{position:fixed;left:0;right:0;bottom:0;z-index:30;height:68px;min-height:0;padding:8px 10px;display:block;border:0;border-top:1px solid var(--line)}
  .brand-lockup,.rail-foot{display:none}.rail-nav{height:100%;flex-direction:row;justify-content:space-around;gap:2px}.rail-link{width:44px;height:44px;justify-content:center;padding:0}.rail-link:nth-child(n+7){display:none}.nav-label{display:none}
  .workspace{padding:12px 14px 36px}.topbar{height:46px;margin-bottom:12px}.search{display:none}.context-rail{display:none}.head{display:block}.split{grid-template-columns:1fr}.metric-row{grid-template-columns:1fr 1fr}.field-grid{grid-template-columns:1fr 1fr}table{display:block;overflow-x:auto}h1{font-size:24px}.grid{grid-template-columns:1fr}
}
`;

export function appShell(title, inner, options = {}) {
  const active = options.active || "demo";
  const userName = options.userName || "Asha Mehta";
  const userRole = options.userRole || "Platform operations";
  const initials = userName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const metrics = options.metrics || { cases: 2, agents: 16, actions: 0 };
  const nav = NAV.map(([key, href, iconName, label]) =>
    `<a class="rail-link${key === active ? " active" : ""}" href="${href}" aria-label="${label}" data-label="${label}">${icon(iconName, 19)}<span class="nav-label">${label}</span></a>`
  ).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f7f8f7"><title>${esc(title)} | Canopus Care</title><style>${APP_CSS}</style></head><body>
  <div class="app-frame">
    <div class="demo-strip">DEMO ENVIRONMENT &middot; SYNTHETIC DATA &middot; EXTERNAL ACTIONS DISABLED</div>
    <aside class="rail"><a class="brand-lockup" href="/demo" aria-label="CanopusCare home"><span class="brand-mark">${icon("Sparkles", 30)}</span><span class="brand-name">Canopus<b>Care</b></span></a><nav class="rail-nav">${nav}</nav><div class="rail-foot"><a class="rail-action" href="/integrations" aria-label="Settings" data-label="Settings">${icon("Settings",19)}<span class="nav-label">Settings</span></a><a class="rail-action" href="/docs/YC_REVIEWER_GUIDE.md" aria-label="Help" data-label="Help">${icon("CircleHelp",19)}<span class="nav-label">Help & guide</span></a></div></aside>
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
