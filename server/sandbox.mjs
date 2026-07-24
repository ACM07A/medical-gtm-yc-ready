// Patient-journey SANDBOX — the deployment surface for the WhatsApp sales comms.
// A customer (e.g. a TruDoc operator) can step the whole journey through a phone simulator, follow every
// branch/fallback, click any stage, and EDIT its template live. Edits are human-gated: saving sets the
// template back to `review`. The same page powers the live /sandbox route (edits POST to the DB) and a
// self-contained shareable artifact (edits persist to localStorage). Data is real: templates come from
// comms_template, the journey graph from lib/comms_machine.mjs.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { STAGES } from "../lib/comms_machine.mjs";
import { logRun } from "../data-core/db.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CLIENT = () => readFileSync(join(HERE, "sandbox_client.js"), "utf8");

// Human-readable labels for each transition event (the on* keys on a STAGES entry).
const EVENT_LABEL = {
  onReply: "Patient replies", onKnownProcedure: "Knows their procedure", onSymptoms: "Has symptoms — needs diagnosis",
  onNotFit: "Not a surgical fit", onDocs: "Sends reports", onOpinion: "Hospital opinion is back",
  onPick: "Picks a package", onObjection: "Raises an objection", onDocsNeeded: "A document is still needed",
  onResolved: "Concern resolved", onConfirm: "Confirms the slot", onStall: "Stalls on dates",
  onReady: "Visa documents ready", onDenied: "Visa denied / not fit to fly", onReschedule: "Reschedules",
  onNoShow: "No-show", onComplication: "A complication arises", onBooked: "Books own travel",
  onArrive: "Arrives at the hospital", onDischarge: "Discharged", onRecoverUpsell: "Adds a recovery stay",
  onReferral: "Leaves a review / refers", onLost: "Drops off", onSilent: "Goes quiet",
};
// The "happy path" event to surface as the one-click ▶ advance per stage.
const HAPPY = {
  intake: "onReply", awaiting_reply: "onReply", qualifying: "onKnownProcedure", triage: "onDocs",
  awaiting_opinion: "onOpinion", product_selection: "onPick", awaiting_docs: "onDocs", objection: "onResolved",
  booking: "onConfirm", visa: "onReady", travel: "onBooked", cant_travel: "onReply", pre_op: "onArrive",
  in_treatment: "onDischarge", complication: "onResolved", post_op: "onRecoverUpsell",
  recovery_bundle: "onReferral", dormant: "onReply",
};
const PHASES = [
  { name: "Acquire", stages: ["intake", "awaiting_reply", "channel_fallback"] },
  { name: "Qualify & diagnose", stages: ["qualifying", "triage", "awaiting_opinion", "off_ramp"] },
  { name: "Decide", stages: ["product_selection", "awaiting_docs", "objection"] },
  { name: "Book & travel", stages: ["booking", "visa", "travel", "cant_travel"] },
  { name: "Treat", stages: ["pre_op", "in_treatment", "complication"] },
  { name: "Recover & refer", stages: ["post_op", "recovery_bundle", "referral"] },
  { name: "Dormant", stages: ["dormant", "lost"] },
];

function transitionsFor(id) {
  const s = STAGES[id]; const out = [];
  for (const k of Object.keys(s)) {
    if (k === "advance") { out.push({ event: "advance", label: "No reply — nudge loop", to: s[k], kind: "timeout" }); continue; }
    if (k.startsWith("on") && EVENT_LABEL[k]) out.push({ event: k, label: EVENT_LABEL[k], to: s[k], kind: k === "onSilent" ? "timeout" : "action" });
  }
  return out;
}

export function buildSandboxData(db) {
  const templates = db.prepare(`SELECT * FROM comms_template ORDER BY seq`).all().map((t) => {
    const parse = (v, f) => { try { return JSON.parse(v); } catch { return f; } };
    const s = STAGES[t.stage] || {};
    return { id: t.id, stage: t.stage, seq: t.seq, name: t.name, msg_type: t.msg_type, category: t.category,
      header_type: t.header_type, header_asset: t.header_asset, body: t.body,
      variables: parse(t.variables, {}), buttons: parse(t.buttons, []), status: t.status,
      clinical: !!s.clinical, handoff: s.handoff || null };
  });
  const stages = Object.keys(STAGES).map((id) => {
    const s = STAGES[id];
    return { id, desc: s.desc || id, clinical: !!s.clinical, handoff: s.handoff || null,
      terminal: !!s.terminal, won: !!s.won, msg_type: s.msgType, transitions: transitionsFor(id) };
  });
  const happy = {};
  for (const id of Object.keys(HAPPY)) {
    const s = STAGES[id]; const ev = HAPPY[id]; const to = s && s[ev];
    if (to) happy[id] = { event: ev, label: (EVENT_LABEL[ev] || ev), to };
  }
  let tenants = [{ id: "medyatra", name: "CanopusCare (own acquisition)", mode: "own" }];
  try {
    const rows = db.prepare(`SELECT id, name, mode FROM tenant WHERE active=1 ORDER BY mode DESC`).all();
    if (rows.length) tenants = rows;
  } catch { /* tenant table not present — keep default */ }
  return { templates, stages, phases: PHASES, happy, tenants };
}

// Persist a customer edit. Human-gated: an edited template goes back to `review` — it can't send until a
// human re-approves. Only body + button text are editable (structure/category/type are governance-owned).
export function saveTemplate(db, { id, body, buttons } = {}) {
  if (!id) return { ok: false, error: "missing id" };
  const row = db.prepare(`SELECT * FROM comms_template WHERE id=?`).get(id);
  if (!row) return { ok: false, error: "no such template" };
  const cleanBtns = Array.isArray(buttons) ? buttons.filter((b) => b && typeof b.text === "string").map((b) => ({ type: "quick_reply", text: b.text.slice(0, 40) })) : undefined;
  db.prepare(`UPDATE comms_template SET body=?, buttons=COALESCE(?, buttons), status='review' WHERE id=?`)
    .run(String(body ?? row.body).slice(0, 1200), cleanBtns ? JSON.stringify(cleanBtns) : null, id);
  logRun(db, "Comms", `Template edited · ${row.name}`, "customer edit in sandbox → back to review (human approves before send)", "/sandbox", "pending");
  return { ok: true, id, status: "review" };
}

const CSS = `
:root{--bg:#eef3f9;--panel:#fff;--ink:#0c1b2e;--muted:#5a6b80;--line:#e2ecf7;--brand:#0b4a8b;--brand2:#1f6fd6;
  --green:#1c8b50;--amber:#e5a13a;--wa:#e5ddd5;--wa-out:#fff;--chip:#f1f6fc;--shadow:0 18px 46px -26px rgba(11,74,139,.55)}
@media (prefers-color-scheme:dark){:root{--bg:#0e1621;--panel:#152232;--ink:#e7eefb;--muted:#8ba0ba;--line:#22364d;
  --brand:#5aa0ee;--brand2:#7cb6f5;--wa:#0b141a;--wa-out:#1f2c39;--chip:#1b2b3f;--shadow:0 18px 46px -22px rgba(0,0,0,.6)}}
:root[data-theme=dark]{--bg:#0e1621;--panel:#152232;--ink:#e7eefb;--muted:#8ba0ba;--line:#22364d;--brand:#5aa0ee;--brand2:#7cb6f5;--wa:#0b141a;--wa-out:#1f2c39;--chip:#1b2b3f;--shadow:0 18px 46px -22px rgba(0,0,0,.6)}
:root[data-theme=light]{--bg:#eef3f9;--panel:#fff;--ink:#0c1b2e;--muted:#5a6b80;--line:#e2ecf7;--brand:#0b4a8b;--brand2:#1f6fd6;--wa:#e5ddd5;--wa-out:#fff;--chip:#f1f6fc}
*{box-sizing:border-box}body{margin:0;font-family:"Segoe UI",Roboto,system-ui,-apple-system,sans-serif;color:var(--ink);background:var(--bg);line-height:1.5}
.ribbon{background:var(--amber);color:#3a2600;font-weight:700;font-size:12.5px;text-align:center;padding:7px 12px;letter-spacing:.01em}
.topbar{display:flex;align-items:center;gap:14px;padding:12px 20px;border-bottom:1px solid var(--line);background:var(--panel);flex-wrap:wrap}
.logo{font-weight:800;color:var(--brand);font-size:17px;letter-spacing:-.01em}.logo small{font-weight:600;color:var(--muted);font-size:12px;letter-spacing:0}
.spacer{flex:1}
.tsel{display:flex;align-items:center;gap:7px;font-size:12.5px;color:var(--muted)}
select#tenant{font:inherit;font-size:13px;padding:5px 8px;border:1px solid var(--line);border-radius:8px;background:var(--panel);color:var(--ink)}
.wl-note{font-size:11.5px;color:var(--muted);max-width:230px;line-height:1.35}
button{font:inherit;cursor:pointer}
.btn{border:1px solid var(--line);background:var(--panel);color:var(--ink);border-radius:9px;padding:7px 13px;font-size:13px;font-weight:600}
.btn.play.on{background:var(--green);color:#fff;border-color:var(--green)}
.btn:hover{border-color:var(--brand2)}
#app{display:grid;grid-template-columns:290px 1fr;gap:0;min-height:calc(100vh - 84px)}
#app.editing{grid-template-columns:290px 1fr 380px}
.rail{border-right:1px solid var(--line);padding:14px 12px;overflow-y:auto;max-height:calc(100vh - 84px)}
.phase{margin-bottom:14px}.ph-name{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);font-weight:700;margin:0 4px 6px}
.chip{display:flex;align-items:center;gap:8px;width:100%;text-align:left;border:1px solid var(--line);background:var(--panel);color:var(--ink);
  border-radius:9px;padding:7px 9px;margin-bottom:5px;font-size:13px}
.chip:hover{border-color:var(--brand2);background:var(--chip)}
.chip.active{border-color:var(--brand);box-shadow:inset 3px 0 0 var(--brand);background:var(--chip)}
.chip.edited .c-name::after{content:" ·edited";color:var(--amber);font-size:10px;font-weight:700}
.c-seq{background:var(--brand);color:#fff;min-width:20px;height:20px;border-radius:6px;display:grid;place-items:center;font-size:11px;font-weight:700;font-variant-numeric:tabular-nums}
.c-name{flex:1;text-transform:capitalize}
.dot{width:8px;height:8px;border-radius:50%}.dot.clinical{background:#8b5cf6}.dot.won{background:var(--green)}.dot.end{background:#9aa7b6}
.stage-main{display:flex;flex-direction:column;align-items:center;padding:22px 16px;overflow-y:auto;max-height:calc(100vh - 84px)}
.phone{width:390px;max-width:100%;background:var(--panel);border:1px solid var(--line);border-radius:26px;box-shadow:var(--shadow);overflow:hidden;display:flex;flex-direction:column}
.wa-top{background:var(--brand);color:#fff;padding:12px 15px;display:flex;align-items:center;gap:11px}
.wa-av{width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.22);display:grid;place-items:center;font-weight:700}
.wa-top b{font-size:15px}.wa-top .on{font-size:11.5px;opacity:.85}
#thread{background:var(--wa);padding:14px 12px;height:460px;overflow-y:auto;display:flex;flex-direction:column;gap:9px}
.row{display:flex}.row.out{justify-content:flex-start}.row.in{justify-content:flex-end}
.msg{max-width:90%}
.tpl-tag{font-size:10.5px;color:var(--muted);margin:0 0 3px 2px;display:flex;align-items:center;gap:5px;flex-wrap:wrap}
.tpl-tag .seq{background:var(--brand);color:#fff;border-radius:5px;padding:0 5px;font-weight:700}
.edit-link{border:none;background:none;color:var(--brand2);font-weight:700;font-size:10.5px;text-decoration:underline;padding:0}
.bubble{background:var(--wa-out);border-radius:3px 13px 13px 13px;box-shadow:0 1px 1px rgba(0,0,0,.12);overflow:hidden;color:#0c1b2e}
@media (prefers-color-scheme:dark){.bubble{color:var(--ink)}}
:root[data-theme=dark] .bubble{color:var(--ink)}
.row.in .bubble{border-radius:13px 3px 13px 13px;background:#d9fdd3;color:#0c1b2e}
.bubble .txt{padding:9px 12px;font-size:13.5px}.bubble .v{background:#eef4fb;color:var(--brand);border-radius:3px;padding:0 3px;font-weight:600}
@media (prefers-color-scheme:dark){.bubble .v{background:rgba(90,160,238,.18)}}
.hdr{background:linear-gradient(135deg,#0b4a8b,#1f6fd6);color:#fff}.hdr img{width:100%;display:block}
.hdr-ph{display:flex;flex-direction:column;padding:16px;gap:2px}.hdr-ic{font-size:20px;opacity:.9}.hdr-ph em{font-size:11.5px;opacity:.9;font-style:normal}
.qrs{display:flex;flex-direction:column;border-top:1px solid var(--line)}
.qr{padding:9px;text-align:center;color:var(--brand2);font-weight:600;font-size:12.5px;border-top:1px solid var(--line)}
.qr:first-child{border-top:none}
.reply{padding:8px 12px;font-size:13px;font-weight:600}
.sys{align-self:center;font-size:11.5px;color:var(--muted);background:var(--chip);padding:4px 12px;border-radius:20px}
.tag{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:1px 6px;border-radius:5px;background:#dbe4ef;color:#5a6b80}
.tag.utility{background:rgba(28,139,80,.16);color:#1c8b50}.tag.marketing{background:rgba(229,161,58,.22);color:#9a6a12}
.tag.session{background:rgba(31,111,214,.14);color:#1f6fd6}.tag.template{background:rgba(90,90,120,.14);color:#6a6a8a}
.tag.clinical{background:rgba(139,92,246,.16);color:#7c4ddb}.tag.review{background:rgba(229,161,58,.2);color:#9a6a12}
.controls{width:390px;max-width:100%;margin-top:14px}
.ctl-head{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:12.5px;color:var(--muted);margin-bottom:8px}
.advance{border:1px solid var(--green);background:rgba(28,139,80,.1);color:var(--green);border-radius:8px;padding:6px 11px;font-weight:700;font-size:12.5px}
.ctl-row{display:flex;flex-wrap:wrap;gap:7px}
.act{border:1px solid var(--line);background:var(--panel);color:var(--ink);border-radius:8px;padding:7px 11px;font-size:12.5px;font-weight:600}
.act:hover{border-color:var(--brand);background:var(--chip)}
.ctl-wait{margin-top:9px;font-size:11.5px;color:var(--muted);display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.wait{border:1px dashed var(--line);background:none;color:var(--muted);border-radius:7px;padding:4px 9px;font-size:11.5px}
.ended{padding:13px;border-radius:11px;text-align:center;font-weight:700;font-size:13.5px}
.ended.won{background:rgba(28,139,80,.12);color:var(--green)}.ended.closed{background:var(--chip);color:var(--muted)}
.ghost{border:1px solid var(--line);background:none;color:var(--brand2);border-radius:8px;padding:5px 11px;font-weight:600;font-size:12.5px}
.ghost.sm{font-size:11.5px;padding:4px 9px;margin-top:6px}
.drawer{border-left:1px solid var(--line);background:var(--panel);padding:16px;overflow-y:auto;max-height:calc(100vh - 84px)}
#app:not(.editing) .drawer{display:none}
.dr-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:10px}
.dr-title{font-weight:700;font-size:15px;text-transform:capitalize;color:var(--brand)}
.dr-sub{display:flex;gap:5px;align-items:center;flex-wrap:wrap;margin-top:4px}.dr-sub code{font-size:11px;color:var(--muted)}
.x{border:none;background:var(--chip);color:var(--ink);border-radius:7px;width:28px;height:28px;font-size:14px}
.warn{background:rgba(139,92,246,.1);border:1px solid rgba(139,92,246,.3);color:#7c4ddb;font-size:11.5px;border-radius:9px;padding:8px 10px;margin-bottom:11px}
.fld{display:block;margin-bottom:13px}.fld>span{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:700;margin-bottom:5px}
textarea,.b-in{width:100%;font:inherit;font-size:13px;border:1px solid var(--line);border-radius:9px;padding:9px;background:var(--bg);color:var(--ink);resize:vertical}
.varchips{display:flex;flex-wrap:wrap;gap:6px}.varchip{border:1px solid var(--line);background:var(--chip);color:var(--brand2);border-radius:7px;padding:4px 8px;font-size:11.5px;font-weight:600}
.btn-edit{display:flex;gap:6px;margin-bottom:6px}.b-del{border:1px solid var(--line);background:none;color:var(--muted);border-radius:7px;width:32px}
.preview{margin:6px 0 13px;background:var(--wa);padding:12px;border-radius:11px}.pv-label{font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:700;margin-bottom:7px}
.dr-foot{border-top:1px solid var(--line);padding-top:12px}.gate{font-size:11.5px;color:var(--muted);display:block;margin-bottom:9px}
.dr-actions{display:flex;justify-content:flex-end;gap:8px}
.primary{background:var(--brand);color:#fff;border:none;border-radius:9px;padding:8px 15px;font-weight:700;font-size:13px}
.muted{color:var(--muted);font-size:12px}
#toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%) translateY(20px);background:var(--ink);color:var(--bg);
  padding:11px 18px;border-radius:11px;font-size:13px;font-weight:600;opacity:0;pointer-events:none;transition:.25s;z-index:50;box-shadow:var(--shadow)}
#toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
@media(max-width:900px){#app,#app.editing{grid-template-columns:1fr}.rail{max-height:none;border-right:none;border-bottom:1px solid var(--line)}
  .drawer{border-left:none;border-top:1px solid var(--line)}.phone,.controls{width:100%}}
`;

function bodyHtml() {
  return `<div class="ribbon">SANDBOX — a safe, editable walk-through of the patient journey. Nothing is sent. Reset anytime.</div>
<div class="topbar">
  <div class="logo">CanopusCare <small>· patient-journey studio</small></div>
  <div class="spacer"></div>
  <div class="tsel">Viewing as
    <select id="tenant" aria-label="brand"></select>
    <span class="wl-note" id="wl-note">CanopusCare’s own acquisition brand.</span>
  </div>
  <button class="btn play" id="play">▶ Auto-play</button>
  <button class="btn" id="reset">Reset</button>
</div>
<div id="app">
  <aside class="rail" id="rail"></aside>
  <main class="stage-main">
    <div class="phone">
      <div class="wa-top"><div class="wa-av">C</div><div><b id="wa-brand">CanopusCare</b><div class="on">online · typical reply in minutes</div></div></div>
      <div id="thread"></div>
    </div>
    <div class="controls" id="controls"></div>
  </main>
  <aside class="drawer" id="drawer"></aside>
</div>
<div id="toast"></div>`;
}

export function renderSandbox(db) {
  const data = buildSandboxData(db);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CanopusCare — Patient Journey Sandbox</title><style>${CSS}</style></head>
<body>${bodyHtml()}
<script>window.__SANDBOX__=${JSON.stringify(data)};window.__LIVE__=true;</script>
<script>${CLIENT()}</script></body></html>`;
}

// For the shareable customer artifact: body-only content (the Artifact wrapper adds doctype/head/body),
// data embedded statically, edits persist to localStorage (LIVE=false).
export function renderSandboxArtifact(db) {
  const data = buildSandboxData(db);
  // Embed the (downscaled) infographic headers inline so the shareable artifact is fully self-contained
  // — the CSP blocks external hosts. Generated by data-core/gen_header_datauris.mjs; optional.
  try { data.assets = JSON.parse(readFileSync(join(HERE, "..", "outputs", "comms", "img", "header-datauris.json"), "utf8")); }
  catch { data.assets = {}; }
  return `<title>CanopusCare — Patient Journey Sandbox</title>
<style>${CSS}</style>
${bodyHtml()}
<script>window.__SANDBOX__=${JSON.stringify(data)};window.__LIVE__=false;</script>
<script>${CLIENT()}</script>`;
}
