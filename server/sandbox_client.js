/* CanopusCare patient-journey sandbox — client SPA.
   Reads window.__SANDBOX__ (data) + window.__LIVE__ (bool). No build step, no deps.
   Same file powers the live /sandbox route (LIVE=true, edits POST to the DB) and the
   self-contained customer artifact (LIVE=false, edits persist to localStorage). */
(function () {
  "use strict";
  var D = window.__SANDBOX__ || { templates: [], stages: [], tenants: [], phases: [], happy: {} };
  var LIVE = !!window.__LIVE__;

  var byStage = {}; D.templates.forEach(function (t) { byStage[t.stage] = t; });
  var stageMap = {}; D.stages.forEach(function (s) { stageMap[s.id] = s; });

  // Sandbox-only: rehydrate any edits saved to this browser's localStorage.
  if (!LIVE) {
    D.templates.forEach(function (t) {
      try {
        var raw = localStorage.getItem("medyatra_tpl_" + t.id);
        if (raw) { var e = JSON.parse(raw); if (e.body != null) t.body = e.body; if (e.buttons) t.buttons = e.buttons; t.status = "review"; t._edited = true; }
      } catch (e) {}
    });
  }

  var state = {
    stageId: "intake",
    log: [{ dir: "out", stage: "intake" }],
    editing: null,
    brand: D.tenants[0] || { id: "medyatra", name: "CanopusCare", mode: "own" },
    auto: false
  };

  // ---- sample values so the {{n}} variables read like a real conversation ------------------------
  function sampleFor(desc) {
    desc = (desc || "").toLowerCase();
    if (desc.indexOf("name") >= 0) return "Aisha";
    if (desc.indexOf("treatment") >= 0) return "knee replacement";
    if (desc.indexOf("city") >= 0) return "Lagos";
    if (desc.indexOf("attendant") >= 0) return "2";
    if (desc.indexOf("turnaround") >= 0) return "2–3 days";
    if (desc.indexOf("date") >= 0) return "the week of 12 Aug";
    if (desc.indexOf("document") >= 0 || desc.indexOf("pending") >= 0) return "your latest MRI report";
    return "…";
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }
  function fillBody(t) {
    var vars = t.variables || {};
    return esc(t.body || "").replace(/\{\{(\d)\}\}/g, function (m, n) { return '<span class="v">' + esc(sampleFor(vars[n])) + "</span>"; });
  }

  // ---- header placeholder (real infographic in live mode; branded band otherwise) ---------------
  function headerBand(t) {
    if (t.header_type !== "image") return "";
    var label = t.stage === "estimate" || t.stage === "nudge" ? "Cost comparison — India vs. home"
      : t.stage === "first_touch" || t.stage === "reengage" ? "Welcome — accredited care in India"
      : "How it works — 4 simple steps";
    var src = "";
    if (t.header_asset) {
      if (D.assets && D.assets[t.header_asset]) src = D.assets[t.header_asset];   // artifact: inline data-URI
      else if (LIVE) src = "/" + String(t.header_asset).replace(/^\//, "");        // live: served from /outputs
    }
    var img = src ? '<img src="' + esc(src) + '" alt="" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">' : "";
    return '<div class="hdr">' + img + '<div class="hdr-ph"' + (src ? ' style="display:none"' : "") + '><span class="hdr-ic">▦</span> Infographic header<em>' + esc(label) + "</em></div></div>";
  }

  // ---- badges -----------------------------------------------------------------------------------
  function badges(s, t) {
    var out = [];
    out.push('<span class="tag ' + t.msg_type + '">' + t.msg_type + "</span>");
    out.push('<span class="tag ' + t.category + '">' + t.category + "</span>");
    if (s && s.clinical) out.push('<span class="tag clinical">hospital handoff</span>');
    if (t.status === "review" || t._edited) out.push('<span class="tag review">review</span>');
    return out.join("");
  }

  // ---- the phone thread -------------------------------------------------------------------------
  function bubbleOut(stage) {
    var t = byStage[stage]; if (!t) return "";
    var s = stageMap[stage] || {};
    var qrs = (t.buttons || []).map(function (b) { return '<span class="qr">' + esc(b.text) + "</span>"; }).join("");
    return '<div class="row out">'
      + '<div class="msg">'
      + '<div class="tpl-tag"><span class="seq">' + t.seq + "</span> " + esc(stage.replace(/_/g, " ")) + " " + badges(s, t)
      + ' <button class="edit-link" data-edit="' + stage + '">edit</button></div>'
      + '<div class="bubble">' + headerBand(t) + '<div class="txt">' + fillBody(t) + "</div>"
      + (qrs ? '<div class="qrs">' + qrs + "</div>" : "")
      + "</div></div></div>";
  }
  function bubbleIn(label) {
    return '<div class="row in"><div class="bubble reply">↩ ' + esc(label) + "</div></div>";
  }
  function sysLine(label) { return '<div class="sys">' + esc(label) + "</div>"; }

  function renderPhone() {
    var html = state.log.map(function (e) {
      if (e.dir === "out") return bubbleOut(e.stage);
      if (e.dir === "in") return bubbleIn(e.label);
      return sysLine(e.label);
    }).join("");
    var thread = document.getElementById("thread");
    thread.innerHTML = html;
    thread.scrollTop = thread.scrollHeight;
    document.getElementById("wa-brand").textContent = state.brand.name.replace(/\s*\(.*\)/, "");
  }

  // ---- the event control bar (drives the branches) ----------------------------------------------
  function renderControls() {
    var s = stageMap[state.stageId];
    var el = document.getElementById("controls");
    if (!s || s.terminal) {
      var kind = s && s.won ? "won" : "closed";
      el.innerHTML = '<div class="ended ' + kind + '">' + (s && s.won ? "✓ Journey complete — treated &amp; referred" : "Conversation ended — " + esc(state.stageId.replace(/_/g, " ")))
        + ' <button class="ghost" id="reset2">start over</button></div>';
      var r2 = document.getElementById("reset2"); if (r2) r2.onclick = reset;
      return;
    }
    var acts = (s.transitions || []).filter(function (x) { return x.kind !== "timeout"; });
    var waits = (s.transitions || []).filter(function (x) { return x.kind === "timeout"; });
    var happy = D.happy[state.stageId];
    var html = '<div class="ctl-head"><span>' + esc(s.desc || state.stageId) + "</span>"
      + (happy ? '<button class="advance" id="advance">▶ ' + esc(happy.label) + "</button>" : "") + "</div>";
    html += '<div class="ctl-row">';
    acts.forEach(function (x) { html += '<button class="act" data-to="' + x.to + '" data-label="' + esc(x.label) + '">' + esc(x.label) + "</button>"; });
    html += "</div>";
    if (waits.length) {
      html += '<div class="ctl-wait">If the patient goes quiet: ' + waits.map(function (x) {
        return '<button class="wait" data-to="' + x.to + '" data-label="' + esc(x.label) + '">' + esc(x.label) + "</button>";
      }).join("") + "</div>";
    }
    el.innerHTML = html;
    var adv = document.getElementById("advance"); if (adv) adv.onclick = function () { fire(happy.to, happy.label); };
  }

  function fire(to, label) {
    state.log.push({ dir: "in", label: label });
    state.stageId = to;
    if (byStage[to]) state.log.push({ dir: "out", stage: to });
    else state.log.push({ dir: "sys", label: "Closed — " + to.replace(/_/g, " ") });
    render();
  }

  function autoPlay() {
    state.auto = !state.auto;
    document.getElementById("play").classList.toggle("on", state.auto);
    step();
  }
  function step() {
    if (!state.auto) return;
    var h = D.happy[state.stageId];
    var s = stageMap[state.stageId];
    if (!h || (s && s.terminal)) { state.auto = false; document.getElementById("play").classList.remove("on"); return; }
    fire(h.to, h.label);
    setTimeout(step, 1100);
  }

  // ---- the journey rail (browse + jump + edit) --------------------------------------------------
  function renderRail() {
    var html = "";
    D.phases.forEach(function (p) {
      html += '<div class="phase"><div class="ph-name">' + esc(p.name) + "</div>";
      p.stages.forEach(function (sid) {
        var t = byStage[sid], s = stageMap[sid] || {};
        var cls = "chip" + (sid === state.stageId ? " active" : "") + (t && t._edited ? " edited" : "");
        var flags = (s.clinical ? '<span class="dot clinical" title="hospital handoff"></span>' : "")
          + (s.won ? '<span class="dot won" title="won"></span>' : "")
          + (s.terminal && !s.won ? '<span class="dot end" title="terminal"></span>' : "");
        html += '<button class="' + cls + '" data-jump="' + sid + '"><span class="c-seq">' + (t ? t.seq : "·") + "</span>"
          + '<span class="c-name">' + esc(sid.replace(/_/g, " ")) + "</span>" + flags + "</button>";
      });
      html += "</div>";
    });
    document.getElementById("rail").innerHTML = html;
  }

  // ---- the editor drawer ------------------------------------------------------------------------
  function openEditor(stage) { state.editing = stage; renderDrawer(); document.getElementById("app").classList.add("editing"); }
  function closeEditor() { state.editing = null; document.getElementById("app").classList.remove("editing"); }

  function renderDrawer() {
    var stage = state.editing; if (!stage) return;
    var t = byStage[stage], s = stageMap[stage] || {};
    var vars = t.variables || {};
    var varChips = Object.keys(vars).map(function (n) { return '<button class="varchip" data-var="' + n + '">{{' + n + "}} · " + esc(vars[n]) + "</button>"; }).join("") || '<span class="muted">no variables</span>';
    var btnRows = (t.buttons || []).map(function (b, i) {
      return '<div class="btn-edit"><input class="b-in" data-bi="' + i + '" value="' + esc(b.text) + '"><button class="b-del" data-bdel="' + i + '">✕</button></div>';
    }).join("");
    var clin = s.clinical ? '<div class="warn">Hospital handoff — the wording here is the hospital medical team’s responsibility; CanopusCare never advises clinically.</div>' : "";
    var d = document.getElementById("drawer");
    d.innerHTML = '<div class="dr-head"><div><div class="dr-title">' + t.seq + ". " + esc(stage.replace(/_/g, " ")) + "</div>"
      + '<div class="dr-sub">' + badges(s, t) + '<code>' + esc(t.name) + "</code></div></div>"
      + '<button class="x" id="dr-x">✕</button></div>'
      + clin
      + '<label class="fld"><span>Message body</span><textarea id="ed-body" rows="6">' + esc(t.body || "") + "</textarea></label>"
      + '<div class="fld"><span>Insert variable</span><div class="varchips">' + varChips + "</div></div>"
      + '<div class="fld"><span>Quick-reply buttons</span><div id="ed-btns">' + btnRows + '</div><button class="ghost sm" id="ed-addbtn">+ add button</button></div>'
      + '<div class="preview"><div class="pv-label">Live preview</div><div class="bubble">' + headerBand(t) + '<div class="txt">' + fillBody(t) + "</div>"
      + ((t.buttons || []).length ? '<div class="qrs">' + t.buttons.map(function (b) { return '<span class="qr">' + esc(b.text) + "</span>"; }).join("") + "</div>" : "") + "</div></div>"
      + '<div class="dr-foot"><span class="gate">' + (LIVE ? "Saving sets this template back to <b>Review</b> — a human approves before it can send." : "Sandbox — edits stay in this browser. Nothing is sent.")
      + '</span><div class="dr-actions"><button class="ghost" id="ed-revert">Revert</button><button class="primary" id="ed-save">Save draft</button></div></div>';

    document.getElementById("dr-x").onclick = closeEditor;
    var bodyEl = document.getElementById("ed-body");
    bodyEl.oninput = function () { t.body = bodyEl.value; livePreview(); };
    document.getElementById("ed-addbtn").onclick = function () { t.buttons = (t.buttons || []).concat([{ text: "New button" }]); renderDrawer(); livePreview(); };
    document.getElementById("ed-revert").onclick = function () { revert(stage); };
    document.getElementById("ed-save").onclick = function () { save(stage); };
    Array.prototype.forEach.call(d.querySelectorAll(".varchip"), function (c) {
      c.onclick = function () { insertAtCursor(bodyEl, "{{" + c.getAttribute("data-var") + "}}"); t.body = bodyEl.value; livePreview(); };
    });
    Array.prototype.forEach.call(d.querySelectorAll(".b-in"), function (inp) {
      inp.oninput = function () { t.buttons[+inp.getAttribute("data-bi")].text = inp.value; livePreview(); };
    });
    Array.prototype.forEach.call(d.querySelectorAll(".b-del"), function (btn) {
      btn.onclick = function () { t.buttons.splice(+btn.getAttribute("data-bdel"), 1); renderDrawer(); livePreview(); };
    });
  }
  function livePreview() {
    var t = byStage[state.editing]; if (!t) return;
    var pv = document.querySelector("#drawer .preview .bubble");
    if (pv) pv.innerHTML = headerBand(t) + '<div class="txt">' + fillBody(t) + "</div>"
      + ((t.buttons || []).length ? '<div class="qrs">' + t.buttons.map(function (b) { return '<span class="qr">' + esc(b.text) + "</span>"; }).join("") + "</div>" : "");
    renderPhone(); renderRail();
  }
  function insertAtCursor(el, text) {
    var s = el.selectionStart || el.value.length, e = el.selectionEnd || el.value.length;
    el.value = el.value.slice(0, s) + text + el.value.slice(e);
    el.focus(); el.selectionStart = el.selectionEnd = s + text.length;
  }

  var _orig = {};
  D.templates.forEach(function (t) { _orig[t.id] = { body: t.body, buttons: JSON.parse(JSON.stringify(t.buttons || [])) }; });
  function revert(stage) {
    var t = byStage[stage], o = _orig[t.id];
    t.body = o.body; t.buttons = JSON.parse(JSON.stringify(o.buttons)); t._edited = false;
    if (!LIVE) try { localStorage.removeItem("medyatra_tpl_" + t.id); } catch (e) {}
    renderDrawer(); render(); toast("Reverted to the original");
  }
  function save(stage) {
    var t = byStage[stage];
    t._edited = true; t.status = "review";
    if (LIVE) {
      fetch("/api/comms/save", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: t.id, body: t.body, buttons: t.buttons }) })
        .then(function (r) { return r.json(); })
        .then(function (r) { toast(r.ok ? "Saved — back to Review for human approval" : "Save failed: " + (r.error || "unknown")); })
        .catch(function () { toast("Save failed — is the server running?"); });
    } else {
      try { localStorage.setItem("medyatra_tpl_" + t.id, JSON.stringify({ body: t.body, buttons: t.buttons })); } catch (e) {}
      toast("Saved in this sandbox (demo — nothing sent)");
    }
    renderRail(); renderDrawer();
  }

  // ---- toast ------------------------------------------------------------------------------------
  var toastT;
  function toast(msg) {
    var el = document.getElementById("toast");
    el.textContent = msg; el.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(function () { el.classList.remove("show"); }, 2600);
  }

  // ---- reset / tenant switch --------------------------------------------------------------------
  function reset() {
    state.auto = false; document.getElementById("play").classList.remove("on");
    state.stageId = "intake"; state.log = [{ dir: "out", stage: "intake" }];
    render();
  }

  function render() { renderPhone(); renderControls(); renderRail(); }

  // ---- wire global events -----------------------------------------------------------------------
  document.addEventListener("click", function (ev) {
    var jump = ev.target.closest && ev.target.closest("[data-jump]");
    if (jump) { var sid = jump.getAttribute("data-jump"); openEditor(sid); return; }
    var edit = ev.target.closest && ev.target.closest("[data-edit]");
    if (edit) { openEditor(edit.getAttribute("data-edit")); return; }
    var act = ev.target.closest && ev.target.closest("[data-to]");
    if (act) { fire(act.getAttribute("data-to"), act.getAttribute("data-label")); return; }
  });
  document.getElementById("reset").onclick = reset;
  document.getElementById("play").onclick = autoPlay;
  var sel = document.getElementById("tenant");
  D.tenants.forEach(function (tn) { var o = document.createElement("option"); o.value = tn.id; o.textContent = tn.name; sel.appendChild(o); });
  sel.onchange = function () {
    state.brand = D.tenants.filter(function (x) { return x.id === sel.value; })[0] || state.brand;
    document.getElementById("wl-note").textContent = state.brand.mode === "operator"
      ? "White-labelled — patients see " + state.brand.name.replace(/\s*\(.*\)/, "") + "’s brand; CanopusCare runs the engine underneath."
      : "CanopusCare’s own acquisition brand.";
    renderPhone();
  };

  render();
})();
