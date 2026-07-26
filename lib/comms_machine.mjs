// COMMS STATE MACHINE — the engine behind design/patient-journey-flow.html. Pure logic (no DB, no I/O):
// given a lead's journey position + timing, it decides the next comms action, honouring the WhatsApp
// 24-hour session rule (free-form only ≤24h after the patient's last message; otherwise an approved
// template), the no-reply nudge cadence + cap, human gates, and which steps are clinical HOSPITAL handoffs.
//
// Everything outbound is human-gated by design; `clinical:true` means it must route to the hospital's
// medical team (Canopus Care never advises). The driver (data-core/comms_run.mjs) applies these decisions.

export const SESSION_MS = 24 * 60 * 60 * 1000;
const H = (n) => n * 60 * 60 * 1000;

// Is the 24h WhatsApp session open? (their last inbound within 24h). Determines template vs free-form.
export function sessionOpen(lead, now = Date.now()) {
  if (!lead.last_inbound_at) return false;
  return now - Date.parse(lead.last_inbound_at) < SESSION_MS;
}

// via(): resolve msg_type. 'auto' = session if the window is open, else an approved template.
function via(msgType, lead, now) {
  if (msgType === "auto") return sessionOpen(lead, now) ? "session" : "template";
  return msgType;
}

// The journey. Each stage: the comms to send on entry, whether it can be free-form, whether it's a clinical
// hospital handoff, the no-reply follow-up cadence (hours from last outbound) + cap, and where events lead.
//   waits:true  → we're waiting on the patient; nudge on the cadence, then fall to `onSilent`.
//   handoff:'hospital' → the *hospital* owes the next artifact (opinion, quote, slot, letter, discharge).
// SCOPE (build-os/09): Canopus Care does LIGHT coordination only — demand-gen, qualification, relaying reports to
// the hospital, and SUPPORTING DOCUMENTS (orchestrating the hospital invitation letter + a visa checklist).
// The patient applies for their OWN visa and books their OWN tickets. Interpreter / transfers / accommodation
// are partner- (and, with a tenant, operator-) provided — never heavy Canopus Care logistics.
export const STAGES = {
  intake:            { template: "first_touch",     msgType: "template", onReply: "qualifying", advance: "awaiting_reply", desc: "First touch — infographic header, policy-clean body" },
  awaiting_reply:    { template: "nudge",           msgType: "template", waits: true, cadenceH: [48, 120, 216], cap: 3, onReply: "qualifying", onSilent: "channel_fallback", desc: "No-reply nudge loop (D2/D5/D9)" },
  channel_fallback:  { template: "channel_fallback", msgType: "template", waits: true, cadenceH: [72], cap: 1, onReply: "qualifying", onSilent: "dormant", desc: "One value touch via email/SMS, then dormant" },

  qualifying:        { template: "qualify",          msgType: "auto", branch: true, onKnownProcedure: "product_selection", onSymptoms: "triage", onNotFit: "off_ramp", waits: true, cadenceH: [48, 120], cap: 2, onSilent: "dormant", desc: "Fork: knows the procedure vs needs diagnosing" },
  triage:            { template: "collect_reports",  msgType: "auto", waits: true, cadenceH: [48, 120], cap: 2, onDocs: "awaiting_opinion", onSilent: "dormant", desc: "Collect reports for a remote opinion" },
  awaiting_opinion:  { template: "opinion_pending",  msgType: "auto", handoff: "hospital", clinical: true, onOpinion: "product_selection", onNotFit: "off_ramp", desc: "Hospital's doctor reviews → diagnosis + path(s)" },
  off_ramp:          { template: "off_ramp",         msgType: "auto", terminal: true, desc: "Not surgical / out of network — honest referral" },

  product_selection: { template: "estimate",         msgType: "auto", branch: true, onPick: "booking", onObjection: "objection", onDocsNeeded: "awaiting_docs", waits: true, cadenceH: [48, 168], cap: 2, onSilent: "dormant", desc: "Options + indicative quote; patient picks the product" },
  awaiting_docs:     { template: "doc_reminder",     msgType: "auto", waits: true, cadenceH: [48, 120], cap: 2, onDocs: "product_selection", onSilent: "dormant", desc: "Doc-reminder loop before the quote firms up" },
  objection:         { template: "objection",        msgType: "auto", branch: true, onResolved: "product_selection", onLost: "lost", waits: true, cadenceH: [48, 168], cap: 2, onSilent: "dormant", desc: "Route by objection (price/trust/safety/timing) → back to decision" },

  // STRESS-HARDENED: booking + visa + travel now all WAIT on the patient with a nudge cadence + a silent
  // fallback (no more infinite stall), plus off-ramps for reschedule and visa-denied/unfit-to-fly.
  booking:           { template: "booking",          msgType: "auto", waits: true, cadenceH: [48, 120], cap: 3, onConfirm: "visa", onReschedule: "booking", onStall: "product_selection", onSilent: "dormant", desc: "Patient confirms the hospital slot they want held (Canopus Care relays; hospital owns the calendar)" },
  visa:              { template: "visa_start",        msgType: "auto", waits: true, cadenceH: [72, 168, 336], cap: 3, onReady: "travel", onDenied: "cant_travel", onSilent: "dormant", desc: "SUPPORTING DOCS ONLY — hospital issues the invitation letter, we supply the checklist; the PATIENT applies" },
  travel:            { template: "stay_options",     msgType: "auto", waits: true, cadenceH: [72, 168], cap: 3, onBooked: "pre_op", onSilent: "dormant", desc: "Patient books their OWN tickets + visa (with our docs); partner stay options; light coordination only" },
  cant_travel:       { template: "cant_travel",      msgType: "auto", waits: true, cadenceH: [720], cap: 2, onReply: "booking", onSilent: "dormant", desc: "Travel blocked (visa denied / not fit to fly) — honest hold, revisit later" },

  pre_op:            { template: "pre_op",            msgType: "auto", handoff: "hospital", clinical: true, onArrive: "in_treatment", onNoShow: "dormant", desc: "Pre-op instructions from the hospital; patient arrived on their own arrangements" },
  in_treatment:      { template: "in_treatment",      msgType: "auto", handoff: "hospital", clinical: true, onDischarge: "post_op", onComplication: "complication", desc: "On-site consult, any re-eval, the procedure" },
  complication:      { template: "complication",      msgType: "auto", handoff: "hospital", clinical: true, onResolved: "post_op", desc: "Clinical escalation — hospital-led; Canopus Care keeps the family informed only" },

  post_op:           { template: "post_op",           msgType: "auto", waits: true, cadenceH: [72, 336], cap: 2, onRecoverUpsell: "recovery_bundle", onReferral: "referral", onSilent: "referral", desc: "Recovery check-ins + wellness recovery-bundle upsell" },
  recovery_bundle:   { template: "recovery_bundle",   msgType: "auto", onReferral: "referral", desc: "Naturopathy recovery stay (bundleable product)" },
  referral:          { template: "review_referral",   msgType: "auto", terminal: true, won: true, desc: "Review + referral → re-enters intake as a new own lead" },

  dormant:           { template: "reengage",          msgType: "template", waits: true, cadenceH: [2160], cap: 4, onReply: "qualifying", desc: "Quarterly value touch only, unless opted out" },
  lost:              { template: null,                msgType: null, terminal: true, desc: "Closed — reason logged for calibration" },
};

// nextAction: what should happen for this lead right now? Returns null when we're correctly idle (waiting
// inside the cadence window, or on the hospital, or terminal). Otherwise the recommended, human-gated action.
export function nextAction(lead, now = Date.now()) {
  const s = STAGES[lead.journey_stage] || STAGES.intake;
  if (lead.opted_out) return { do: "suppress", reason: "opted out — honour immediately", terminal: true };
  if (s.terminal) return null;

  // Waiting on the hospital (clinical handoff): Canopus Care chases, but the ball is theirs.
  if (s.handoff === "hospital" && !s.cadenceH) {
    return { do: "await_hospital", stage: lead.journey_stage, clinical: !!s.clinical,
      reason: `${s.desc} — hospital owes the next step`, humanGate: true };
  }

  const lastOut = lead.last_outbound_at ? Date.parse(lead.last_outbound_at) : 0;
  const replied = lead.last_inbound_at && Date.parse(lead.last_inbound_at) > lastOut;

  // Fresh entry to a stage (nothing sent yet, or they just replied): send the stage's primary message.
  if (!lastOut || replied) {
    return primary(lead, s, now);
  }

  // We've sent and are waiting. If the stage has a follow-up cadence, see if a nudge is due.
  if (s.waits && s.cadenceH) {
    const n = lead.nudge_count || 0;
    if (s.cap && n >= s.cap) {
      return { do: "advance", stage: lead.journey_stage, to: s.onSilent || "dormant",
        reason: `no reply after ${s.cap} touch(es) → ${s.onSilent || "dormant"}`, humanGate: true };
    }
    const dueAt = lastOut + H(s.cadenceH[Math.min(n, s.cadenceH.length - 1)]);
    if (now >= dueAt) {
      return { do: "send", stage: lead.journey_stage, template: `medyatra_${s.template}`,
        via: via(s.msgType, lead, now), nudge: n + 1, clinical: !!s.clinical, humanGate: true,
        reason: `follow-up ${n + 1}/${s.cap} due (${s.desc})` };
    }
    return null; // inside the window — correctly idle
  }
  return null;
}

function primary(lead, s, now) {
  if (!s.template) return null;
  return { do: "send", stage: lead.journey_stage, template: `medyatra_${s.template}`,
    via: via(s.msgType, lead, now), clinical: !!s.clinical, handoff: s.handoff || null,
    humanGate: true, reason: s.desc };
}

// Apply a real-world event to compute the next journey_stage. Events map to the STAGES transition keys
// (onReply, onPick, onObjection, onConfirm, onDischarge, …). Unknown events are a no-op (stay put).
const EVENT_KEY = {
  reply: "onReply", known_procedure: "onKnownProcedure", symptoms: "onSymptoms", not_fit: "onNotFit",
  docs: "onDocs", opinion: "onOpinion", pick: "onPick", objection: "onObjection", docs_needed: "onDocsNeeded",
  resolved: "onResolved", lost: "onLost", confirm: "onConfirm", stall: "onStall",
  ready: "onReady", denied: "onDenied", reschedule: "onReschedule", noshow: "onNoShow", complication: "onComplication",
  booked: "onBooked", arrive: "onArrive", discharge: "onDischarge", upsell: "onRecoverUpsell",
  referral: "onReferral", silent: "onSilent",
};
export function onEvent(stage, event) {
  const s = STAGES[stage]; if (!s) return stage;
  const to = s[EVENT_KEY[event]];
  return to || stage;
}

// The ordered stage list (for docs / UI).
export const JOURNEY = Object.keys(STAGES);
