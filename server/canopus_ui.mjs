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
  heartPulse: '<path d="M19 14c1.5-1.5 3-3.5 3-6a6 6 0 0 0-10-4.5A6 6 0 0 0 2 8c0 5 5 8.5 10 13 1.2-1.1 2.4-2.1 3.5-3"/><path d="M3 12h4l2-4 3 8 2-4h7"/>',
  fileCheck: '<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6"/><path d="m9 15 2 2 4-4"/>',
  plane: '<path d="M22 2 9 15"/><path d="m22 2-8 20-4-8-8-4z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  activity: '<path d="M3 12h4l2-6 4 12 2-6h6"/>',
  arrowRight: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
  alert: '<path d="M12 3 2 21h20z"/><path d="M12 9v5M12 18h.01"/>',
  wallet: '<path d="M4 6h15a2 2 0 0 1 2 2v10H4a2 2 0 0 1-2-2V6a3 3 0 0 1 3-3h12"/><path d="M16 12h5"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
};
const ICON_ALIAS = {
  House: "house", BriefcaseMedical: "briefcase", Building2: "building", Users: "users",
  Handshake: "handshake", ListTodo: "list", ShieldCheck: "shield", Bot: "bot", Plug: "plug",
  ScrollText: "document", Code2: "document", FileUp: "document", ClipboardCheck: "document",
  BookOpenText: "document", Search: "search", ScanSearch: "search", Settings: "settings",
  Bell: "bell", MapPin: "pin", Send: "send", Save: "save", RotateCcw: "rotate",
  Sparkles: "sparkles", CircleHelp: "circleHelp", MessageCircleQuestion: "circleHelp",
  KeyRound: "circleHelp",
  HeartPulse: "heartPulse", FileCheck2: "fileCheck", Plane: "plane", Clock3: "clock",
  LockKeyhole: "lock", Activity: "activity", ArrowRight: "arrowRight",
  TriangleAlert: "alert", WalletCards: "wallet", CircleCheckBig: "checkCircle",
};

export function icon(name, size = 18, className = "") {
  const body = ICONS[ICON_ALIAS[name]] || ICONS.circleHelp;
  return `<svg class="icon ${esc(className)}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

const NAV = [
  ["demo", "/demo", "House", "Overview"],
  ["concierge", "/concierge", "MessageCircleQuestion", "Concierge"],
  ["cases", "/cases", "BriefcaseMedical", "Cases"],
  ["hospital", "/hospital", "Building2", "Hospitals"],
  ["agent", "/agent", "Users", "Agents"],
  ["vendors", "/vendors", "Handshake", "Vendors"],
  ["tasks", "/tasks", "ListTodo", "Tasks"],
  ["ai", "/agents", "Bot", "AI activity"],
  ["integrations", "/integrations", "Plug", "Integrations"],
  ["audit", "/audit", "ScrollText", "Audit"],
];

export const APP_CSS = `
@import url("https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap");
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

/* Warm editorial healthcare layer: calm, trustworthy and operational. */
:root{
  --brand-50:#EDF5F0;--brand-100:#DCEBE2;--brand-200:#BBD5C5;--brand-500:#39745B;
  --brand-600:#226647;--brand-700:#174A35;--indigo-500:#526A9D;
  --ink-950:#19231E;--ink-700:#454D48;--ink-500:#64716A;--line-200:#DCE2DC;
  --surface-0:#FFFFFF;--surface-50:#F4F6F2;--surface-100:#EDF1EA;
  --success-500:#2E8B65;--warning-500:#C88A35;--danger-500:#C65F58;
  --info-500:#526A9D;--purple-500:#75658C;--teal-500:#44857E;
  --canvas:var(--surface-50);--app:var(--surface-50);--rail:var(--surface-0);--surface:var(--surface-0);
  --surface-soft:var(--surface-100);--ink:var(--ink-950);--muted:var(--ink-500);
  --line:var(--line-200);--line-strong:#D7DCE5;--blue:var(--brand-500);
  --violet:var(--indigo-500);--violet-soft:#F0EEFF;--mint:#E9F8F2;--mint-ink:#167B54;
  --coral:var(--danger-500);--coral-soft:#FDEDED;--yellow:#FFF4D6;--danger:var(--danger-500);
  --green:var(--brand-600);--green-2:var(--brand-500);--shadow:0 1px 2px rgba(16,24,40,.03);
}
html{background:var(--surface-50)}
body{background:var(--surface-50);color:var(--ink-950);font-family:"DM Sans","Segoe UI",sans-serif;font-size:14px;line-height:1.55;font-variant-numeric:tabular-nums}
.app-frame{width:min(1440px,calc(100% - 48px));min-height:calc(100vh - 48px);margin:24px auto;display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:auto auto 1fr;background:var(--app);border:1px solid var(--line-200);border-radius:8px;box-shadow:0 12px 32px rgba(17,19,24,.08),0 2px 8px rgba(17,19,24,.04)}
.demo-strip{grid-column:1;grid-row:1;background:#20242C;color:#F4F6FA;padding:7px 20px;font-size:10px;letter-spacing:.08em}
.rail{grid-column:1;grid-row:2;min-height:72px;height:72px;padding:0 20px;display:flex;flex-direction:row;align-items:center;gap:20px;background:var(--surface-0);border:0;border-bottom:1px solid var(--line-200)}
.brand-lockup{height:44px;min-width:174px;margin:0;gap:10px;font-size:16px;font-weight:700}
.brand-mark{width:34px;height:34px;border:0;border-radius:7px;background:var(--brand-600);color:#fff}
.brand-name b{color:var(--ink-950)}
.rail-nav{margin:0 auto;display:flex;flex-direction:row;align-items:center;gap:3px;padding:4px;background:var(--surface-100);border-radius:999px}
.rail-link{width:auto;height:36px;padding:0 13px;gap:7px;border:0;border-radius:999px;color:var(--ink-500);font-size:11px;font-weight:500}
.rail-link .icon{width:14px;height:14px}
.rail-link:hover{background:var(--brand-50);color:var(--brand-700);border:0}
.rail-link.active{background:var(--surface-0);color:var(--ink-950);box-shadow:0 1px 4px rgba(17,19,24,.09);border:0}
.rail-link:nth-child(n+7){display:none}
.rail-foot{display:none}
.workspace{grid-column:1;grid-row:3;padding:0 24px 48px;background:var(--surface-50);overflow:visible}
.topbar{height:72px;margin:0 -4px 20px;padding:0 4px;gap:10px;border-bottom:1px solid var(--line-200)}
.top-tools{width:100%;gap:8px}
.search{margin-left:auto;margin-right:0;width:min(340px,35vw);height:40px;border:1px solid var(--line-200);border-radius:999px;background:var(--surface-0);box-shadow:none}
.icon-btn{width:40px;height:40px;border:1px solid var(--line-200);border-radius:50%;box-shadow:none}
.icon-btn:hover{background:var(--brand-50);color:var(--brand-700);border-color:var(--brand-200)}
.compact-user{display:flex;align-items:center;gap:9px;margin-left:2px;padding:4px 8px 4px 4px;border-radius:999px;text-decoration:none}
.compact-user:hover{background:var(--surface-100)}
.compact-avatar{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:var(--brand-100);color:var(--brand-700);font-size:11px;font-weight:700}
.compact-user-text{display:grid;line-height:1.25}.compact-user-text b{font-size:11px;font-weight:600}.compact-user-text span{font-size:9px;color:var(--ink-500)}
.context-rail{display:none}
.head{align-items:flex-start;margin-bottom:24px}.eyebrow{color:var(--brand-600);font-size:11px;letter-spacing:.07em}
h1,h2{font-family:"Fraunces",Georgia,serif}h1{font-size:34px;font-weight:650;line-height:1.12;margin:4px 0 10px}h2{font-size:22px;font-weight:650;line-height:1.2;margin:28px 0 12px}h3{font-size:16px;font-weight:650;line-height:1.3}
.lede{font-size:14px;line-height:1.55;color:var(--ink-500)}
.grid{gap:16px}.card,.panel{border:1px solid var(--line-200);border-radius:8px;padding:16px;background:var(--surface-0);box-shadow:var(--shadow)}
.card-accent{background:var(--brand-50);border-color:var(--brand-200)}
.card-accent.mint{background:#EAF8F3;border-color:#CDEDE0}.card-accent.coral{background:#FDEFEF;border-color:#F6D2D2}.card-accent.violet{background:#F1EFFF;border-color:#DDD7FF}
.k{font-size:36px;font-weight:600;line-height:1}.label{font-size:12px;line-height:1.4;color:var(--ink-500)}
table{border:1px solid var(--line-200);border-radius:8px;box-shadow:var(--shadow)}th,td{padding:12px 14px;font-size:13px;line-height:1.45}th{background:var(--surface-50);font-size:11px;font-weight:600;letter-spacing:.04em;color:var(--ink-500)}
tbody tr:hover{background:var(--brand-50)}
.badge{min-height:28px;display:inline-flex;align-items:center;padding:5px 10px;font-size:10px;font-weight:600;text-transform:none}
.badge.completed,.badge.released,.badge.approved,.badge.ready,.badge.captured,.badge.verified-demo-docs,.badge.arrival-scheduled,.badge.shared-with-hospital,.badge.hospital-reviewing,.badge.response-received,.badge.option-accepted,.badge.travel-preparation,.badge.arrival-ready{background:#E7F7F1;color:#167A53}
.badge.blocked,.badge.missing,.badge.disabled,.badge.rejected{background:#FDECEC;color:#B93434}
.badge.waiting-for-input,.badge.needs-review,.badge.requested,.badge.mock,.badge.scheduled,.badge.medium{background:#FFF4D7;color:#8A6110}
.badge.high{background:#EEEBFF;color:#5B43CB}
.split{gap:16px}.tabs{margin:16px 0;gap:6px}.tab{min-height:32px;padding:7px 12px;border:1px solid var(--line-200);background:var(--surface-0);color:var(--ink-500)}.tab:first-child{background:var(--brand-600);border-color:var(--brand-600);color:#fff}
.callout{border-left:3px solid var(--brand-500);background:var(--brand-50);color:var(--ink-700);padding:12px 14px;border-radius:7px}
.btn{min-height:40px;padding:9px 14px;border-radius:7px;border-color:var(--line-200);font-size:12px;font-weight:600}.btn.primary{background:var(--brand-600);border-color:var(--brand-600)}.btn.primary:hover{background:var(--brand-700)}.btn.dark{background:#20242C;border-color:#20242C}
textarea,input,select{min-height:42px;border:1px solid var(--line-200);border-radius:7px;padding:9px 11px;background:var(--surface-0);font-size:13px;outline:none}
textarea:focus,input:focus,select:focus,.btn:focus-visible,.icon-btn:focus-visible,.rail-link:focus-visible{border-color:var(--brand-500);box-shadow:0 0 0 3px var(--brand-100);outline:none}
.metric-row{gap:16px}.metric-tile{border:1px solid var(--line-200);border-radius:8px;background:var(--surface-0);box-shadow:var(--shadow)}.metric-tile:nth-child(1){background:var(--brand-600);color:#fff}.metric-tile:nth-child(1) .label{color:#EAF3EE}.metric-tile:nth-child(2){background:#fff}.metric-tile:nth-child(3){background:#F5EDE8}.metric-tile:nth-child(4){background:#EDF1F7}
.node{border:1px solid var(--line-200);border-radius:8px;box-shadow:var(--shadow)}.node.center{background:var(--brand-600)}
@media(max-width:1040px){
  .rail-link{padding:0 10px}.nav-label{display:none}.rail-link .icon{width:16px;height:16px}.compact-user-text{display:none}
}
@media(max-width:820px){
  body{font-size:15px}.app-frame{width:100%;min-height:100vh;margin:0;border:0;border-radius:0;box-shadow:none;display:block;padding-bottom:72px}
  .rail{position:fixed;left:0;right:0;bottom:0;top:auto;z-index:30;height:68px;min-height:68px;padding:8px 10px;border-top:1px solid var(--line-200);border-bottom:0}
  .brand-lockup{display:none}.rail-nav{width:100%;height:100%;justify-content:space-around;background:transparent;padding:0}.rail-link{width:48px;height:48px;justify-content:center;padding:0;border-radius:14px}.rail-link:nth-child(n+6){display:none}.rail-link.active{background:var(--brand-50);color:var(--brand-700);box-shadow:none}
  .workspace{padding:0 16px 36px}.topbar{height:60px;margin-bottom:16px}.search{display:none}.compact-user{padding:4px}.head{display:block}.split{grid-template-columns:1fr}.metric-row{grid-template-columns:1fr 1fr}.field-grid{grid-template-columns:1fr 1fr}
  table{display:block;overflow-x:auto}h1{font-size:28px}h2{font-size:20px}.lede{font-size:15px}.card,.panel{padding:16px}
}
@media(max-width:480px){.field-grid,.case-facts{grid-template-columns:1fr}.metric-row{grid-template-columns:1fr}.top-tools .icon-btn:first-of-type{display:none}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
.hero-panel{position:relative;overflow:hidden;display:grid;grid-template-columns:minmax(0,1.05fr) minmax(360px,.95fr);min-height:360px;padding:0;background:#F8F4EE;border-color:#E7DED3}
.hero-copy{position:relative;z-index:1;align-self:center;max-width:700px;padding:36px}.hero-copy h1{max-width:650px}
.hero-media{position:relative;min-height:360px;margin:0;overflow:hidden}.hero-media img{width:100%;height:100%;display:block;object-fit:cover;object-position:62% center}.hero-media::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,#F8F4EE 0,rgba(248,244,238,.08) 28%,transparent 55%)}
.trust-row{display:flex;gap:16px;flex-wrap:wrap;margin-top:20px;color:var(--ink-700);font-size:11px;font-weight:650}.trust-row span{display:inline-flex;align-items:center;gap:6px}.trust-row .icon{color:var(--brand-600)}
.hero-actions{position:relative;z-index:1;margin-top:20px}
.metric-tile{position:relative;min-height:118px}.metric-icon{width:34px;height:34px;display:grid;place-items:center;margin-bottom:16px;border-radius:7px;background:var(--brand-50);color:var(--brand-600)}.metric-tile:nth-child(1) .metric-icon{background:rgba(255,255,255,.16);color:#fff}.metric-tile:nth-child(3) .metric-icon{background:#fff}.metric-tile:nth-child(4) .metric-icon{background:#fff}
.section-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin:28px 0 12px}.section-head h2{margin:0}.section-head .label{max-width:520px;text-align:right}
.case-summary{display:grid;grid-template-columns:72px minmax(0,1fr) auto;align-items:center;gap:16px}.case-symbol{width:72px;height:72px;display:grid;place-items:center;border-radius:8px;background:var(--brand-600);color:#fff}.case-symbol .icon{width:32px;height:32px}.case-summary h2{margin:0 0 5px}.case-meta{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}
.status-list{display:grid;gap:10px}.status-row{display:grid;grid-template-columns:34px minmax(0,1fr) auto;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid var(--line-200)}.status-row:last-child{border-bottom:0}.status-icon{width:34px;height:34px;display:grid;place-items:center;border-radius:7px;background:var(--surface-100);color:var(--brand-600)}.status-row b{display:block;font-size:13px}.status-row .label{font-size:11px}
.journey-panel{padding:20px 22px}.journey-panel .section-head{margin-bottom:18px}.journey-panel .section-head h2{margin:3px 0 0}.journey-track{width:min(100%,1040px);margin:0 auto;display:grid;grid-template-columns:repeat(7,minmax(86px,1fr));align-items:start;padding:8px 4px 2px}.journey-step{position:relative;min-width:0;text-align:center;padding:0 8px}.journey-step::before{content:"";position:absolute;z-index:0;left:0;right:0;top:17px;height:2px;background:var(--line-200)}.journey-step.done::before{background:var(--success-500)}.journey-step.done+.journey-step.active::before{background:linear-gradient(90deg,var(--success-500) 0 50%,var(--line-200) 50%)}.journey-step:first-child::before{left:50%}.journey-step:last-child::before{right:50%}.journey-dot{position:relative;z-index:1;width:36px;height:36px;margin:0 auto 10px;display:grid;place-items:center;border-radius:50%;background:var(--surface-100);color:var(--ink-700);border:3px solid var(--surface-0);box-shadow:0 0 0 1px var(--line-200)}.journey-step.done .journey-dot{background:var(--success-500);color:#fff;box-shadow:0 0 0 1px var(--success-500)}.journey-step.active .journey-dot{background:linear-gradient(135deg,var(--brand-500),var(--indigo-500));color:#fff;box-shadow:0 0 0 5px var(--brand-100)}.journey-step>span:last-child{display:block;min-height:30px;font-size:11px;font-weight:550;line-height:1.35;color:var(--ink-700)}.journey-step.active>span:last-child{color:var(--ink-950);font-weight:700}
.surface-card{display:grid;grid-template-columns:46px minmax(0,1fr) 24px;gap:13px;align-items:start;min-height:138px}.surface-icon{width:46px;height:46px;display:grid;place-items:center;border-radius:7px;background:var(--brand-50);color:var(--brand-600)}.surface-card:nth-child(3n+2) .surface-icon{background:#F5E9E4;color:#A9574D}.surface-card:nth-child(3n) .surface-icon{background:#E9EDF5;color:#526A9D}.surface-card.blocked-card .surface-icon{background:#FDECEC;color:var(--danger-500)}.surface-card.gate-card .surface-icon{background:#FFF4D7;color:#8A6110}.surface-card h3{margin:1px 0 5px}.surface-card .arrow{margin-top:10px;color:var(--ink-500)}.grid>.surface-card:first-child,.grid>.surface-card:nth-child(2){grid-column:span 2}.grid>.surface-card:first-child{background:var(--brand-50)}.grid>.surface-card:nth-child(2){background:#F7EFEA}
.attention-panel{background:#28322D;color:#fff;border-color:#28322D}.attention-panel .label{color:#D4DBD6}.attention-panel .status-icon{background:rgba(255,255,255,.1);color:#fff}
@media(max-width:1040px){.hero-panel{grid-template-columns:1fr minmax(300px,.72fr)}.grid>.surface-card:first-child,.grid>.surface-card:nth-child(2){grid-column:span 1}}
@media(max-width:820px){.hero-panel{display:block;min-height:0}.hero-copy{padding:26px 22px}.hero-media{min-height:230px}.hero-media::after{background:linear-gradient(180deg,#F8F4EE 0,transparent 30%)}.case-summary{grid-template-columns:56px minmax(0,1fr)}.case-symbol{width:56px;height:56px}.case-summary>.btn{grid-column:1/-1}.journey-panel{padding:18px}.journey-track{width:100%;grid-template-columns:1fr;gap:0;padding:2px 0}.journey-step{display:grid;grid-template-columns:44px minmax(0,1fr);min-height:48px;padding:0;text-align:left;align-items:start}.journey-step::before{left:17px!important;right:auto!important;top:0;bottom:0;width:2px;height:auto}.journey-step:first-child::before{top:18px}.journey-step:last-child::before{bottom:30px}.journey-step.done+.journey-step.active::before{background:linear-gradient(180deg,var(--success-500) 0 50%,var(--line-200) 50%)}.journey-dot{width:36px;height:36px;margin:0}.journey-step>span:last-child{min-height:0;padding:9px 0 12px;font-size:12px}}

/* Shared Canopus Care visual system: matches the AI Studio landing without changing portal behavior. */
:root{
  --brand-50:#E6F8F5;--brand-100:#D6F4EF;--brand-200:#9FE2D7;--brand-500:#0FB8A6;
  --brand-600:#0D9488;--brand-700:#0A8C7E;--indigo-500:#3B82F6;
  --ink-950:#0A1626;--ink-700:#334155;--ink-500:#64748B;--line-200:#E6ECEA;
  --surface-0:#FFFFFF;--surface-50:#F7FAF9;--surface-100:#EEF5F3;
  --success-500:#10B981;--warning-500:#F59E0B;--danger-500:#EF4444;
  --info-500:#3B82F6;--teal-500:#0FB8A6;
  --canvas:var(--surface-50);--app:var(--surface-50);--rail:var(--surface-0);--surface:var(--surface-0);
  --surface-soft:var(--surface-100);--ink:var(--ink-950);--muted:var(--ink-500);
  --line:var(--line-200);--line-strong:#D5E1DE;--green:var(--brand-600);--green-2:var(--brand-500);
  --mint:var(--brand-50);--mint-ink:var(--brand-700);--coral:var(--danger-500);--coral-soft:#FEF2F2;
  --violet:var(--info-500);--violet-soft:#EFF6FF;--yellow:#FFFBEB;--danger:var(--danger-500);
}
body{background:var(--surface-50);color:var(--ink-950);font-family:"Plus Jakarta Sans","Segoe UI",sans-serif}
.app-frame{border-color:var(--line-200);background:var(--surface-50);box-shadow:0 18px 50px rgba(10,22,38,.08)}
.demo-strip{background:#070F1A;color:#CBD5E1;font-family:"JetBrains Mono",monospace}
.rail{background:#FFFFFF;border-color:var(--line-200)}
.brand-mark{background:var(--brand-600);color:#fff}.brand-name b{color:var(--brand-600)}
.rail-nav{background:#EEF5F3}.rail-link{color:#64748B}.rail-link:hover{background:#E6F8F5;color:var(--brand-700)}
.rail-link.active{background:#fff;color:var(--brand-700);box-shadow:0 1px 5px rgba(10,22,38,.10)}
.workspace{background:var(--surface-50)}
.eyebrow,.mode{color:var(--brand-700);font-family:"JetBrains Mono",monospace}
h1,h2,h3,.k{font-family:"Plus Jakarta Sans","Segoe UI",sans-serif}
h1{font-weight:800}h2,h3{font-weight:700}
.card,.panel,table{border-color:var(--line-200);box-shadow:0 1px 2px rgba(10,22,38,.03)}
.card-accent{background:var(--brand-50);border-color:var(--brand-200)}
.tab:first-child,.btn.primary,.metric-tile:nth-child(1),.node.center,.case-symbol{background:var(--brand-600);border-color:var(--brand-600)}
.btn.primary:hover{background:var(--brand-700)}
.btn,.tab,textarea,input,select{border-radius:8px}
.badge.completed,.badge.released,.badge.approved,.badge.ready,.badge.captured,.badge.verified-demo-docs,.badge.arrival-scheduled,.badge.shared-with-hospital,.badge.hospital-reviewing,.badge.response-received,.badge.option-accepted,.badge.travel-preparation,.badge.arrival-ready{background:#DDF7EE;color:#087A5F}
.callout{border-left-color:var(--brand-500);background:var(--brand-50);color:var(--ink-700)}
.hero-panel{background:#F7FAF9;border-color:var(--line-200)}.hero-media::after{background:linear-gradient(90deg,#F7FAF9 0,rgba(247,250,249,.08) 28%,transparent 55%)}
.attention-panel{background:#0A1626;border-color:#0A1626}
.surface-icon,.status-icon,.metric-icon{background:var(--brand-50);color:var(--brand-700)}
textarea:focus,input:focus,select:focus,.btn:focus-visible,.icon-btn:focus-visible,.rail-link:focus-visible{border-color:var(--brand-500);box-shadow:0 0 0 3px rgba(15,184,166,.2)}
@media(max-width:820px){.hero-media::after{background:linear-gradient(180deg,#F7FAF9 0,transparent 30%)}}
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
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f4f6f2"><title>${esc(title)} | Canopus Care</title><style>${APP_CSS}</style></head><body>
  <div class="app-frame">
    <div class="demo-strip">DEMO ENVIRONMENT &middot; SYNTHETIC DATA &middot; EXTERNAL ACTIONS DISABLED</div>
    <aside class="rail"><a class="brand-lockup" href="/demo" aria-label="Canopus Care home"><span class="brand-mark">${icon("Sparkles", 30)}</span><span class="brand-name">Canopus <b>Care</b></span></a><nav class="rail-nav">${nav}</nav><div class="rail-foot"><a class="rail-action" href="/integrations" aria-label="Settings" data-label="Settings">${icon("Settings",19)}<span class="nav-label">Settings</span></a><a class="rail-action" href="/docs/YC_REVIEWER_GUIDE.md" aria-label="Help" data-label="Help">${icon("CircleHelp",19)}<span class="nav-label">Help & guide</span></a></div></aside>
    <section class="workspace">
      <header class="topbar"><div class="wordmark">Canopus<span>Care</span></div><div class="top-tools"><div class="search">${icon("Search",15)}<span>Search cases, hospitals, records</span></div><button class="icon-btn" title="Notifications" aria-label="Notifications">${icon("Bell",17)}</button><a class="icon-btn" href="/docs/YC_REVIEWER_GUIDE.md" title="Help" aria-label="Help">${icon("CircleHelp",17)}</a><a class="compact-user" href="/login" aria-label="Account"><span class="compact-avatar">${esc(initials)}</span><span class="compact-user-text"><b>${esc(userName)}</b><span>${esc(userRole)}</span></span></a></div></header>
      <main>${inner}</main>
    </section>
    <aside class="context-rail"><div class="context-top"><button class="icon-btn" title="Support" aria-label="Support">${icon("MessageCircleQuestion",17)}</button></div>
      <section class="profile"><div class="avatar">${esc(initials)}</div><h3>${esc(userName)}</h3><p>${esc(userRole)}</p></section>
      <div class="context-metrics"><div class="mini-stat">${icon("MapPin",15)}<b>${esc(metrics.cases)}</b><span>Cases</span></div><div class="mini-stat">${icon("Bot",15)}<b>${esc(metrics.agents)}</b><span>Agents</span></div><div class="mini-stat">${icon("Send",15)}<b>${esc(metrics.actions)}</b><span>Live actions</span></div></div>
      <section class="readiness"><div class="readiness-head"><span>Platform readiness</span><span>Demo</span></div><h3>Controlled operations</h3><div class="ring"><div class="ring-value">Checks<b>12</b></div></div><div class="mode-row"><span><i class="mode-dot"></i>Database ready</span><b>100%</b></div></section>
    </aside>
  </div></body></html>`;
}

export function errorPage(status, title, message, requestId = "") {
  return appShell(title, `<div class="head"><div><div class="eyebrow">Error ${esc(status)}</div><h1>${esc(title)}</h1><p class="lede">${esc(message)}</p></div></div>
    <section class="panel"><h2>What you can do</h2><p>Return to the reviewer dashboard or use the navigation to continue with the synthetic demo.</p>
    <div class="actions"><a class="btn primary" href="/demo">Back to dashboard</a><a class="btn" href="/cases">Open cases</a></div>
    ${requestId ? `<p class="label">Request ID: ${esc(requestId)}</p>` : ""}</section>`, { active: "" });
}
