// THE CONCIERGE BOT — one conversational point of contact for the patient and their family, across the
// whole journey. The founding insight (Hussain, 2026-07-26): the family shouldn't have to learn our pages —
// they should just ask. "Where are we?" "What's still missing?" "What will it cost?" — every answer comes
// from the SAME case record the operator surfaces read (os_pages.apiCase), so the bot can never drift from
// the truth the hospital and agent see.
//
// Deliberately DETERMINISTIC: intent-matching + the live case record, no LLM call, no key. A demo answer
// about someone's father must be exactly right, never plausible. Clinical and emergency questions are
// deflected, not answered — the same boundary lib/safety.mjs enforces everywhere else.
//
// The bot's name is configurable (BOT_NAME, default "Suhail" — the Arabic name for the star Canopus, a warm
// human name across the Gulf) because the brand is not frozen yet; nothing else about it changes with the name.
import { apiCase, apiCases } from "./os_pages.mjs";
import { appShell } from "./canopus_ui.mjs";

export const BOT_NAME = process.env.BOT_NAME || "Suhail";

// The bot reads as the read-only role: it can see every synthetic case, and can change nothing. A bot that
// could mutate state would need the same human gates as everything else — so it simply doesn't get the pen.
const BOT_SESSION = { role: "read_only", organization_id: null, user: { name: BOT_NAME } };

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ── Safety boundaries: checked BEFORE any intent, in this order. ─────────────────────────────────────────
const EMERGENCY = /\b(chest pain|can'?t breathe|cannot breathe|unconscious|collapsed|bleeding heavily|severe pain|emergency|suicid)/i;
const CLINICAL = /\b(diagnos|prescri|dosage|dose|medicin|medication advice|side effect|is it safe|should (he|she|i|we) take|symptom|treatment (option|advice|recommend)|cure|prognosis|survival)/i;

// ── Intents: first match wins. Each answers ONLY from the case record. ───────────────────────────────────
const INTENTS = [
  { key: "status", re: /\b(status|update|where are we|progress|how (is|are) (it|things)|what('s| is) happening|stage)\b/i },
  { key: "next", re: /\b(next|what (do|should) (i|we) do|what now|action|remaining)\b/i },
  { key: "documents", re: /\b(document|report|paper|upload|passport|missing|checklist|file)\b/i },
  { key: "cost", re: /\b(cost|price|estimate|pay|money|expensive|how much|bill|fee)\b/i },
  { key: "travel", re: /\b(travel|visa|flight|ticket|hotel|stay|accommodation|airport|pickup|interpreter|translator|arrive)\b/i },
  { key: "hospital", re: /\b(hospital|doctor|surgeon|where.*(treat|operat)|which (hospital|place))\b/i },
  { key: "timeline", re: /\b(when|how long|date|timeline|schedule|wait)\b/i },
  { key: "help", re: /\b(help|what can you|who are you|hi|hello|salaam|salam|hey)\b/i },
];

function detectIntent(text) {
  for (const i of INTENTS) if (i.re.test(text)) return i.key;
  return "fallback";
}

// One place for the money disclaimer, so no cost answer can ever ship without it.
const INDICATIVE = "Every figure is indicative until the hospital confirms it in writing — the hospital's own confirmed package price is the only final number, and you pay the hospital directly, never a markup to us.";

export function answerConcierge(db, { caseId, text }) {
  const q = String(text || "").trim();
  if (!q) return { reply: `I'm ${BOT_NAME}. Ask me anything about the journey — status, documents, costs, travel — and I'll answer from the live case record.`, intent: "help" };

  // Emergencies outrank everything, including a missing case.
  if (EMERGENCY.test(q)) return {
    intent: "emergency", escalated: true,
    reply: "If this is a medical emergency, please contact your local emergency services or go to the nearest hospital right now — I coordinate planned travel and cannot help in an emergency. Once things are safe, message me again and I'll pick the journey back up with you.",
  };

  const c = apiCase(db, BOT_SESSION, caseId || "case_ibrahim_musa");
  if (!c) return { reply: "I can't find that case. In this demo, try the seeded golden case.", intent: "fallback" };

  // The consent gate applies to the BOT too: a case without captured consent gets process information only.
  // This is the same refusal the approval queue shows — demonstrated here from the family's side of it.
  if ((c.consent_status || "").toLowerCase() === "missing") return {
    intent: "blocked", blocked: true,
    reply: `I'm sorry — I can't discuss the details of this case yet. We need ${esc(c.synthetic_name)}'s explicit consent on file before I can share medical or personal information with anyone, including family. It protects ${esc(c.synthetic_name)}, and it's the same rule our whole system enforces. The one thing I can tell you: completing the consent form is the only step blocking everything else.`,
  };

  if (CLINICAL.test(q)) return {
    intent: "clinical_deflect",
    reply: `That's a medical question, and the honest answer is that only ${esc(c.synthetic_name)}'s treating doctors can answer it — I'm the coordination side, not the clinical side, and guessing would be wrong of me. I can arrange for the question to reach the hospital's team, and I can help gather the reports they'd need to answer it properly. Shall I note it for the next hospital review?`,
  };

  const intent = detectIntent(q);
  const missingDocs = c.documents.filter((d) => /missing|requested|needs review/i.test(d.status || ""));
  const released = c.estimates.find((e) => /released/i.test(e.status || ""));

  const answers = {
    status: () =>
      `Here's where things stand for ${esc(c.synthetic_name)}: the case is at "${esc(c.current_stage)}". ` +
      (c.next_best_action ? `The next step on our side is: ${esc(c.next_best_action)}. ` : "") +
      (missingDocs.length ? `We're still waiting on ${missingDocs.length} document${missingDocs.length > 1 ? "s" : ""} — ask me "what documents are missing" and I'll list them. ` : `All documents we asked for are in. `) +
      `Nothing is stuck without a reason; ask me about any piece of it.`,
    next: () =>
      c.next_best_action
        ? `The very next step: ${esc(c.next_best_action)}. ` + (c.warnings ? `One thing to know: ${esc(c.warnings)} ` : "") + `I'll keep everything else moving in the background.`
        : `There's no action waiting on you right now — the next move is on our side, and I'll have an answer here whenever you check in.`,
    documents: () =>
      c.documents.length
        ? `Documents on file for ${esc(c.synthetic_name)}:\n` + c.documents.map((d) => `• ${esc(d.doc_type)} — ${esc(d.status)}`).join("\n") +
          (missingDocs.length ? `\n\nThe ones marked missing or requested are what we need next. Photos from a phone are fine to start — I'll tell you if the hospital needs originals.` : `\n\nEverything requested so far is in. Well done — this is usually the hardest part.`)
        : `No documents recorded yet. The first ones are usually the passport and the existing medical reports.`,
    cost: () =>
      released
        ? `The hospital has released an indicative estimate: ${esc(released.currency)} ${Number(released.indicative_total).toLocaleString()} for "${esc(released.procedure)}", valid ${esc(released.validity)}.\n` +
          released.items.map((i) => `• ${esc(i.label)} — ${esc(released.currency)} ${Number(i.amount).toLocaleString()}${i.note ? ` (${esc(i.note)})` : ""}`).join("\n") +
          `\n\n${esc(released.caveats || "")} ${INDICATIVE}`
        : `The hospital hasn't released an estimate yet — it's prepared by their team and human-approved before I'm allowed to show it. ${INDICATIVE}`,
    travel: () =>
      c.services.length
        ? `Travel and stay arrangements in motion:\n` + c.services.map((s) => `• ${esc(s.category)} — ${esc(s.status)}${s.mock_quote ? ` (${esc(s.mock_quote)})` : ""}`).join("\n") +
          `\n\nNothing is booked for real until you approve it — every booking has a human confirmation step.`
        : `Travel planning starts once the estimate is accepted: visa invitation letter from the hospital, then flights, a place to stay near the hospital, an interpreter if needed, and the airport pickup. I'll walk you through each one when it's time.`,
    hospital: () =>
      c.matches.length
        ? `${c.matches.length} hospital option${c.matches.length > 1 ? "s were" : " was"} evaluated for this case:\n` +
          c.matches.map((m) => `• ${esc(m.hospital_name)} (${esc(m.location)}) — ${esc(m.clinical_acceptance || m.partner_status)}`).join("\n") +
          `\n\nThe match is operational — languages, response time, price band. Whether treatment is clinically right is always the hospital's doctors' call, made from the actual reports.`
        : `Hospital matching hasn't run yet for this case — it starts once the case file is complete enough for a hospital to review properly.`,
    timeline: () =>
      `${c.travel_window ? `The travel window we're working toward: ${esc(c.travel_window)}. ` : ""}` +
      (c.tasks.length ? `Open items and where they stand:\n` + c.tasks.map((t) => `• ${esc(t.title)} — ${esc(t.status)}${t.due_date ? ` (due ${esc(t.due_date)})` : ""}`).join("\n") : `No scheduled items yet.`) +
      `\n\nDates firm up as the hospital confirms each step — I'd rather tell you "not fixed yet" than guess.`,
    help: () =>
      `I'm ${BOT_NAME} — the one point of contact for this whole journey, for ${esc(c.synthetic_name)} and for family. Ask me in your own words: "what's the status", "what documents are missing", "what will it cost", "how does travel work", "which hospitals". I answer from the live case record — the same one the hospital and coordinator see. What I never do: give medical advice (that's the doctors'), or share anything without consent on file.`,
    fallback: () =>
      `I want to get this right rather than guess. I can tell you about: the case status, documents, costs and the estimate, travel and visa steps, the hospitals being considered, and timelines. Ask about any of those — or if it's a medical question, I'll pass it to the hospital's team instead of answering it myself.`,
  };

  return { intent, reply: answers[intent](), caseId: c.id, stage: c.current_stage };
}

// ── The page: a chat surface inside the OS shell, golden case + blocked case selectable. ────────────────
export function renderConciergePage(db) {
  const cases = apiCases(db, BOT_SESSION).map((c) => `<option value="${esc(c.id)}">${esc(c.synthetic_name)} — ${esc(c.treatment_request)} (${esc(c.source_market)})</option>`).join("");
  const chips = ["What's the status?", "What documents are missing?", "What will it cost?", "How does travel work?", "Which hospitals?", "Is the surgery safe?"]
    .map((t) => `<button class="chip" onclick="ask('${t.replace(/'/g, "\\'")}')">${t}</button>`).join("");
  const inner = `
  <div class="head"><div><div class="eyebrow">One point of contact · patient &amp; family</div>
    <h1>Ask ${esc(BOT_NAME)}</h1>
    <p class="lede">The whole journey, answerable in plain words. ${esc(BOT_NAME)} reads the live case record —
    the same one the hospital and coordinator see — and never answers a clinical question (that's the doctors')
    or discusses a case without consent on file. Try the blocked case to watch it refuse. <em>(Bot name is a
    working name; deterministic demo — no model key needed.)</em></p></div></div>
  <div class="panel" style="max-width:760px">
    <div class="field" style="margin-bottom:10px"><label>Case</label><select id="cb-case">${cases}</select></div>
    <div id="cb-log" style="display:flex;flex-direction:column;gap:8px;min-height:120px;margin-bottom:10px"></div>
    <div style="display:flex;gap:8px"><input id="cb-q" placeholder="Ask in your own words…" onkeydown="if(event.key==='Enter')ask()">
    <button class="btn primary" onclick="ask()">Ask</button></div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">${chips}</div>
  </div>
  <style>.chip{border:1px solid var(--line-strong);background:#fff;border-radius:999px;padding:6px 11px;font-size:11px;cursor:pointer}.chip:hover{border-color:#9ea49b}
  .cb-me{align-self:flex-end;background:var(--violet-soft);border-radius:10px 10px 2px 10px;padding:8px 11px;font-size:12.5px;max-width:85%}
  .cb-bot{align-self:flex-start;background:var(--surface-soft);border:1px solid var(--line);border-radius:10px 10px 10px 2px;padding:8px 11px;font-size:12.5px;max-width:85%;white-space:pre-wrap}
  .cb-bot.blocked{border-color:var(--coral);background:#fff5ef}</style>
  <script>
  async function ask(preset){
    const input=document.getElementById('cb-q'), log=document.getElementById('cb-log');
    const text=preset||input.value.trim(); if(!text)return; input.value='';
    log.insertAdjacentHTML('beforeend','<div class="cb-me"></div>'); log.lastChild.textContent=text;
    const r=await fetch('/api/concierge/ask',{method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({caseId:document.getElementById('cb-case').value,text})});
    const d=await r.json();
    log.insertAdjacentHTML('beforeend','<div class="cb-bot'+((d.blocked||d.escalated)?' blocked':'')+'"></div>');
    log.lastChild.textContent=d.reply; log.lastChild.scrollIntoView({behavior:'smooth',block:'end'});
  }
  </script>`;
  return appShell(`Ask ${BOT_NAME}`, inner, { active: "concierge", userName: "Family member", userRole: "Patient & family view" });
}
