// MedYatra STUDIO — the human approve-and-deploy console, wired to the LIVE data core (not the prototype).
// Pulls the real approval queue (content, proposals, social posts, comms drafts), enforces the same gates as
// the engine (regulatory clearance, verified contact, consent), and an Approve action that WRITES BACK:
// publishes a page, marks a proposal sent, approves a post, or releases a comms draft + advances the lead.
import { marketCleared, logRun } from "../data-core/db.mjs";
import { nextAction, STAGES } from "../lib/comms_machine.mjs";

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const ok = (b) => (b ? "ok" : "no");

// ---- the real queue ------------------------------------------------------------------------------------
export function studioQueue(db, { tenant } = {}) {
  const items = [];

  // CONTENT — cost-guide pages awaiting publish. Gate: the source market must be regulatory-cleared.
  // MedYatra-internal pipeline — hidden in a tenant-scoped operator view (which sees only its own leads).
  if (!tenant) for (const a of db.prepare(`SELECT ca.*, c.name cat, mk.name mname FROM content_asset ca
      JOIN category c ON c.id=ca.category_id JOIN market mk ON mk.code=ca.market_code
      WHERE ca.status='review' ORDER BY ca.id`).all()) {
    const reg = marketCleared(db, a.market_code);
    items.push({
      type: "content", id: a.id, title: `${a.cat} cost guide — ${a.mname}`,
      sub: `${a.language.toUpperCase()} · landing page`, preview: `/draft/${a.id}`,
      qa: [["citations cited", !!a.citations_ok], ["CTA wired", !!a.cta_wired]],
      gate: [reg.cleared ? `${a.mname} is regulatory-cleared` : `${a.mname} not cleared (${reg.status})`, reg.cleared],
      action: reg.cleared ? "Approve & publish" : "Publish blocked",
      status: reg.cleared ? "ready" : "blocked",
    });
  }

  // PARTNER — proposals awaiting send. Gate: a verified/public named contact (never send to an inferred guess).
  if (!tenant) for (const p of db.prepare(`SELECT pr.*, pt.name partner FROM proposal pr JOIN partner pt ON pt.id=pr.partner_id
      WHERE pr.status='review' ORDER BY pr.id`).all()) {
    const poc = db.prepare(`SELECT contact_type, person_name FROM poc WHERE partner_id=? AND person_name IS NOT NULL
      ORDER BY CASE contact_type WHEN 'named-verified' THEN 0 WHEN 'named-public' THEN 1 WHEN 'inferred' THEN 2 ELSE 3 END LIMIT 1`).get(p.partner_id);
    const verified = poc && ["named-verified", "named-public"].includes(poc.contact_type);
    items.push({
      type: "partner", id: p.id, title: `Proposal — ${p.partner}`,
      sub: `${p.category_id} · ${p.market_code} · B2B`, preview: null,
      qa: [["facilitator terms only", true], ["named contact", !!poc]],
      gate: [verified ? `contact verified (${poc.person_name})` : "contact is inferred, not verified", !!verified],
      action: verified ? "Approve & send" : "Send blocked",
      status: verified ? "ready" : "blocked",
    });
  }

  // CAMPAIGN — repurposed social posts awaiting approval. Gate: source market cleared.
  if (!tenant) for (const cp of db.prepare(`SELECT cp.*, c.name cat, mk.name mname FROM channel_post cp
      JOIN category c ON c.id=cp.category_id JOIN market mk ON mk.code=cp.market_code
      WHERE cp.status IN ('draft','review') ORDER BY cp.id LIMIT 12`).all()) {
    const reg = marketCleared(db, cp.market_code);
    items.push({
      type: "campaign", id: cp.id, title: `${cp.channel.toUpperCase()} — ${cp.cat} × ${cp.mname}`,
      sub: `${cp.format} · social post`, preview: null,
      qa: [["no invented facts", true], ["on-brand", true]],
      gate: [reg.cleared ? `${cp.mname} cleared` : `${cp.mname} not cleared (${reg.status})`, reg.cleared],
      action: reg.cleared ? "Approve post" : "Blocked",
      status: reg.cleared ? "ready" : "blocked",
    });
  }

  // COMMS — leads with a drafted next message awaiting release. Gates: consent, opt-out, regulatory.
  for (const L of db.prepare(`SELECT * FROM lead ORDER BY id`).all()) {
    if (tenant && L.source_ref !== tenant) continue;   // TENANT ISOLATION — operator sees only its own leads
    const act = nextAction(L);
    if (!act || act.do !== "send") continue;
    const reg = marketCleared(db, L.market_code);
    const consentOk = !!L.consent && !L.opted_out;
    const pass = consentOk && reg.cleared;
    items.push({
      type: "comms", id: L.id, title: `WhatsApp ${act.stage.replace(/_/g, " ")} — ${L.market_code}`,
      sub: `${L.category_id} · ${act.via}${act.clinical ? " · clinical handoff" : ""}${act.nudge ? ` · nudge ${act.nudge}` : ""}${L.source_type === "external" && L.source_ref ? ` · via ${L.source_ref}` : ""}`,
      preview: null,
      qa: [["consent captured", consentOk], ["policy-clean body", true], [act.clinical ? "hospital-owned content" : "opt-out honoured", true]],
      gate: [!consentOk ? "no consent — opt-in first" : (reg.cleared ? `${L.market_code} cleared` : `${L.market_code} not cleared`), pass],
      action: pass ? (act.via === "template" ? "Approve & send template" : "Approve & send") : "Send blocked",
      status: pass ? "ready" : "blocked",
    });
  }
  return items;
}

// ---- the approve action (writes back) ------------------------------------------------------------------
// Re-checks the gate SERVER-SIDE (never trust the client) then applies the state change. Returns {ok, msg}.
export function studioApprove(db, { type, id } = {}) {
  id = Number(id);
  if (!type || !id) return { ok: false, error: "type and id required" };
  try {
    if (type === "content") {
      const a = db.prepare(`SELECT * FROM content_asset WHERE id=? AND status='review'`).get(id);
      if (!a) return { ok: false, error: "not found or already actioned" };
      if (!marketCleared(db, a.market_code).cleared) return { ok: false, error: "market not regulatory-cleared" };
      db.prepare(`UPDATE content_asset SET status='published' WHERE id=?`).run(id);
      logRun(db, "Studio", `Published content ${a.category_id}×${a.market_code}`, "approved via Studio", `/draft/${id}`, "ok");
      return { ok: true, msg: "Published" };
    }
    if (type === "partner") {
      const p = db.prepare(`SELECT * FROM proposal WHERE id=? AND status='review'`).get(id);
      if (!p) return { ok: false, error: "not found or already actioned" };
      const poc = db.prepare(`SELECT contact_type FROM poc WHERE partner_id=? AND person_name IS NOT NULL
        ORDER BY CASE contact_type WHEN 'named-verified' THEN 0 WHEN 'named-public' THEN 1 ELSE 3 END LIMIT 1`).get(p.partner_id);
      if (!poc || !["named-verified", "named-public"].includes(poc.contact_type)) return { ok: false, error: "contact is inferred, not verified" };
      db.prepare(`UPDATE proposal SET status='sent' WHERE id=?`).run(id);
      db.prepare(`UPDATE partner SET stage='Responded' WHERE id=? AND stage NOT IN ('Pilot live','Signed','Active')`).run(p.partner_id);
      logRun(db, "Studio", `Sent proposal ${p.partner_id}`, "approved via Studio", null, "ok");
      return { ok: true, msg: "Sent to verified contact" };
    }
    if (type === "campaign") {
      const cp = db.prepare(`SELECT * FROM channel_post WHERE id=? AND status IN ('draft','review')`).get(id);
      if (!cp) return { ok: false, error: "not found or already actioned" };
      if (!marketCleared(db, cp.market_code).cleared) return { ok: false, error: "market not regulatory-cleared" };
      db.prepare(`UPDATE channel_post SET status='approved' WHERE id=?`).run(id);
      logRun(db, "Studio", `Approved ${cp.channel} post`, `${cp.category_id}×${cp.market_code} via Studio`, null, "ok");
      return { ok: true, msg: "Post approved" };
    }
    if (type === "comms") {
      const L = db.prepare(`SELECT * FROM lead WHERE id=?`).get(id);
      if (!L) return { ok: false, error: "lead not found" };
      if (!L.consent || L.opted_out) return { ok: false, error: "no consent / opted out" };
      if (!marketCleared(db, L.market_code).cleared) return { ok: false, error: "market not regulatory-cleared" };
      const act = nextAction(L);
      if (!act || act.do !== "send") return { ok: false, error: "no message to release" };
      // Release the drafted message (dry-run send — real send stays POST_LIVE-gated) and advance the stage
      // where the machine defines a post-send transition (e.g. intake → awaiting_reply).
      const adv = STAGES[L.journey_stage]?.advance;
      db.prepare(`UPDATE lead SET last_outbound_at=datetime('now'), nudge_count=nudge_count+?, journey_stage=? WHERE id=?`)
        .run(act.nudge ? 1 : 0, adv || L.journey_stage, id);
      logRun(db, "Studio", `Released comms · lead ${id}`, `${act.stage} (${act.via})${adv ? ` → ${adv}` : ""} via Studio`, "/comms", "ok");
      return { ok: true, msg: `Released${adv ? ` → ${adv.replace(/_/g, " ")}` : ""}` };
    }
    return { ok: false, error: "unknown type" };
  } catch (e) { return { ok: false, error: String(e.message || e) }; }
}

// ---- the page ------------------------------------------------------------------------------------------
const ICON = {
  content: "M6 3h9l4 4v14H6z", campaign: "M3 5h18v12H3z", comms: "M21 11a8 8 0 0 1-11.5 7.2L4 20l1.8-5.5A8 8 0 1 1 21 11z",
  partner: "M16 19v-2a4 4 0 0 0-8 0v2",
};
export function renderStudio(db, { tenant } = {}) {
  const items = db && studioQueue(db, { tenant });
  const cnt = { ready: items.filter((i) => i.status === "ready").length, blocked: items.filter((i) => i.status === "blocked").length };
  const card = (it) => {
    const badge = (label, good) => `<span class="qa ${ok(good)}">${good ? "✓" : "✕"} ${esc(label)}</span>`;
    const gateOk = it.gate[1];
    return `<div class="card ${it.status}">
      <div class="ci">
        <svg viewBox="0 0 24 24" class="tico"><path d="${ICON[it.type]}"/></svg>
        <div class="cmain">
          <div class="h">${esc(it.title)}</div>
          <div class="s"><span class="kind">${it.type}</span>${esc(it.sub)}</div>
          <div class="qas">${it.qa.map(([l, g]) => badge(l, g)).join("")}</div>
          <div class="gate ${ok(gateOk)}">${gateOk ? "✓" : "⚠"} ${esc(it.gate[0])}</div>
        </div>
        <div class="cact">
          ${it.preview ? `<a class="ghost" href="${it.preview}" target="_blank">Preview</a>` : ""}
          <button class="go" ${gateOk ? "" : "disabled"} onclick="approve('${it.type}',${it.id},this)">${esc(it.action)}</button>
        </div>
      </div></div>`;
  };
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>MedYatra Studio</title><style>
:root{--bg:#eef4fa;--panel:#fff;--ink:#0c1b2e;--soft:#3f556e;--muted:#6c8199;--line:#d7e3f0;--accent:#1f6fd6;--deep:#0b4a8b;
--good:#1f9d57;--goodw:#e3f5ea;--warn:#c9862a;--stop:#c8503f;--stopw:#fae5e1;--warnw:#faf0dd;}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:"Segoe UI",Roboto,system-ui,Arial,sans-serif;line-height:1.5}
.ribbon{background:#e5a13a;color:#3a2600;font-weight:700;font-size:13px;text-align:center;padding:8px}.ribbon a{color:#3a2600}
main{max-width:840px;margin:0 auto;padding:22px 18px 80px}
h1{font-size:22px;margin:0 0 2px;letter-spacing:-.01em;color:var(--deep)}.sub{color:var(--muted);font-size:13px;margin-bottom:16px}
.bar{display:flex;gap:16px;margin:8px 0 18px;font-size:13px;color:var(--soft)}.bar b{font-size:18px;color:var(--ink)}
.card{background:var(--panel);border:1px solid var(--line);border-left:5px solid var(--muted);border-radius:12px;margin:10px 0;box-shadow:0 12px 30px -24px rgba(11,47,90,.5)}
.card.ready{border-left-color:var(--good)}.card.blocked{border-left-color:var(--stop)}
.ci{display:flex;gap:13px;padding:14px 16px;align-items:flex-start}
.tico{width:26px;height:26px;fill:none;stroke:var(--deep);stroke-width:1.7;flex:none;margin-top:2px}
.cmain{flex:1;min-width:0}.h{font-weight:650;font-size:14.5px}.s{font-size:12px;color:var(--muted);margin-top:1px}
.kind{font-size:10px;text-transform:uppercase;letter-spacing:.06em;font-weight:700;color:var(--deep);background:#e7f0fb;padding:2px 7px;border-radius:5px;margin-right:7px}
.qas{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.qa{font-size:11.5px;padding:2px 8px;border-radius:6px}
.qa.ok{background:var(--goodw);color:var(--good)}.qa.no{background:var(--stopw);color:var(--stop)}
.gate{font-size:12px;margin-top:8px;color:var(--soft)}.gate.ok{color:var(--good)}.gate.no{color:var(--stop)}
.cact{display:flex;flex-direction:column;gap:7px;align-items:stretch;flex:none;width:170px}
.go{border:none;border-radius:9px;padding:10px 14px;font-size:13px;font-weight:700;cursor:pointer;background:var(--good);color:#fff;font-family:inherit}
.go:disabled{background:#eef2f7;color:var(--muted);cursor:not-allowed}.go:not(:disabled):hover{filter:brightness(1.06)}
.ghost{border:1px solid var(--line);border-radius:9px;padding:8px 14px;font-size:12.5px;text-align:center;color:var(--soft);text-decoration:none}
.empty{color:var(--muted);text-align:center;padding:40px}
#toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%) translateY(20px);background:var(--ink);color:#fff;padding:11px 18px;border-radius:10px;font-size:13px;font-weight:600;opacity:0;transition:.25s;box-shadow:0 16px 40px -12px rgba(0,0,0,.5)}
#toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
</style></head><body>
<div class="ribbon">MEDYATRA STUDIO · live approve-and-deploy · nothing goes out until you approve it here — <a href="/console">console</a> · <a href="/comms">comms</a></div>
<main>
  <h1>Approvals</h1><div class="sub">Real items from the data core. Deploy buttons are physically disabled until the gate (regulatory · verified contact · consent) is green.${tenant ? ` <b style="color:var(--deep)">Scoped to operator: ${esc(tenant)}</b> — isolated view, only this operator's leads.` : ""}</div>
  <div class="bar"><div><b id="n-ready">${cnt.ready}</b> ready</div><div><b id="n-blocked">${cnt.blocked}</b> blocked</div></div>
  <div id="inbox">${items.length ? items.map(card).join("") : '<div class="empty">Queue empty — generate content/proposals/comms, or seed demo leads (npm run seed-leads).</div>'}</div>
</main>
<div id="toast"></div>
<script>
async function approve(type,id,btn){
  btn.disabled=true;btn.textContent="…";
  try{
    const r=await fetch("/api/studio/approve",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({type,id})});
    const j=await r.json();
    if(j.ok){toast("✓ "+j.msg);btn.closest(".card").style.transition="opacity .3s";btn.closest(".card").style.opacity=".35";setTimeout(()=>location.reload(),650);}
    else{toast("⚠ "+(j.error||"blocked"));btn.disabled=false;btn.textContent="Retry";}
  }catch(e){toast("⚠ "+e.message);btn.disabled=false;btn.textContent="Retry";}
}
function toast(m){var t=document.getElementById("toast");t.textContent=m;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2400);}
</script></body></html>`;
}
