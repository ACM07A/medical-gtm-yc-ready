// Sales Comms Agent (/build-os/09) — drafts the post-lead WhatsApp sequence as APPROVAL-READY templates:
// minimal, kosher body text (what Meta scrutinizes) + an infographic IMAGE HEADER that carries the value.
// Renders the paired infographics from real data. Human-gated: drafted here → submitted to Meta → sent by a
// human (lib/publishers dry-run unless POST_LIVE=1 + approval). Reusable templates use {{n}} variables.
//   node --experimental-sqlite data-core/gen_comms.mjs
import { open, logRun, j, comparator } from "./db.mjs";
import { welcomeHtml, howItWorksHtml, renderInfographic, renderCostComparison } from "../lib/infographic.mjs";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const db = open();
const O = (s, ...p) => db.prepare(s).get(...p);
const A = (s, ...p) => db.prepare(s).all(...p);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const IMG = join(ROOT, "outputs", "comms", "img");
mkdirSync(IMG, { recursive: true });

const rel = (p) => p.replace(ROOT + "\\", "").replace(ROOT + "/", "").replace(/\\/g, "/");

// --- 1) Render the shared infographic headers -----------------------------------------------------
const welcomeImg = join(IMG, "welcome.png");
const howImg = join(IMG, "how-it-works.png");
try { await renderInfographic(welcomeHtml({}), welcomeImg); } catch (e) { console.log(`  ⚠ welcome render failed (browser) — retry when available`); }
try { await renderInfographic(howItWorksHtml(), howImg); } catch (e) { console.log(`  ⚠ how-it-works render failed (browser) — retry when available`); }
// per-category estimate (cost comparison) headers — LIKE-FOR-LIKE via comparator(), with the guard.
const cats = A(`SELECT * FROM category WHERE status='launch' ORDER BY rank`);
const estImg = {};
for (const c of cats) {
  const cmp = comparator(db, c.id);
  if (cmp && cmp.valid) {
    const out = join(IMG, `estimate-${c.id}.png`);
    await renderCostComparison({ category: c.id, treatment: cmp.label, market: "your country", india_low: cmp.india_low, india_high: cmp.india_high, west_low: cmp.west_low, west_high: cmp.west_high }, out);
    estImg[c.id] = rel(out);
  } else if (cmp) {
    console.log(`  ⚠ estimate-${c.id} skipped — savings ${cmp.savings}% failed the sanity guard (data/mapping review needed)`);
    logRun(db, "Comms", `Infographic guard · ${c.id}`, `savings ${cmp.savings}% invalid — not rendered`, null, "fail");
  }
}
const flagship = O(`SELECT id FROM category WHERE flagship=1`)?.id || cats[0].id;

// --- 2) The sequence (reusable templates; {{1}} name, {{2}} treatment, {{3}} city) ----------------
const QR = (...labels) => j(labels.map((text) => ({ type: "quick_reply", text })));
const WELCOME = rel(welcomeImg), HOW = rel(howImg), EST = estImg[flagship] || rel(welcomeImg);
// FULL journey library — one template per state in lib/comms_machine.mjs (name = medyatra_<stage>). Bodies
// stay minimal/Utility-flavoured (what Meta scrutinizes); persuasion rides in the image header. msg_type is
// the canonical send mode; the machine may downgrade a template to a free-form send inside an open session.
// clinical:true marks a HOSPITAL handoff (their medical team owns the content). marketing = needs opt-in+STOP.
const SEQ = [
  { stage: "first_touch", seq: 1, msg_type: "template", category: "utility", header: WELCOME,
    body: "Hi {{1}}, thanks for reaching out to MedYatra about {{2}} in India. A care coordinator will share accredited-hospital options shortly. Reply YES to continue.",
    variables: { "1": "first name", "2": "treatment" }, buttons: QR("Yes, tell me more", "Not now") },
  { stage: "nudge", seq: 2, msg_type: "template", category: "utility", header: EST,
    body: "Hi {{1}}, still exploring {{2}} in India? Accredited hospitals, no waiting list, English-speaking care. Options whenever you're ready.",
    variables: { "1": "first name", "2": "treatment" }, buttons: QR("Show me options", "Not now") },
  { stage: "channel_fallback", seq: 3, msg_type: "template", category: "utility", header: null,
    body: "Hi {{1}}, we tried reaching you about {{2}}. If it's easier, reply here or email us — no pressure, we're here when you need us.",
    variables: { "1": "first name", "2": "treatment" }, buttons: QR("I'm ready", "Stop messages") },

  { stage: "qualify", seq: 4, msg_type: "session", category: "utility", header: HOW,
    body: "To tailor your options, could you share your recent medical reports, your preferred timing, and the city you'll travel from?",
    variables: {}, buttons: QR("Send reports", "Ask a question") },
  { stage: "collect_reports", seq: 5, msg_type: "session", category: "utility", header: null,
    body: "Thanks {{1}}. Please share your latest reports or scans (or a doctor's summary). An accredited hospital's specialist will review and recommend the right path.",
    variables: { "1": "first name" }, buttons: QR("Uploaded", "Need help") },
  { stage: "opinion_pending", seq: 6, msg_type: "session", category: "utility", header: null, clinical: true,
    body: "Your reports are with the hospital's specialist for review. You'll have their opinion and recommended options within {{1}}. We'll message you the moment it's back.",
    variables: { "1": "turnaround, e.g. 2–3 days" }, buttons: QR("Okay", "Ask a question") },
  { stage: "off_ramp", seq: 7, msg_type: "session", category: "utility", header: null, clinical: true,
    body: "Hi {{1}}, based on the doctor's review, travelling for surgery isn't the right step now — this is better managed locally. We've summarised their guidance for you, no charge. We're here if things change.",
    variables: { "1": "first name" }, buttons: QR("Thank you") },

  { stage: "estimate", seq: 8, msg_type: "template", category: "utility", header: EST,
    body: "Hi {{1}}, here's the indicative cost range for {{2}} — a package estimate, not a final quote. Your coordinator will confirm details for your case.",
    variables: { "1": "first name", "2": "treatment" }, buttons: QR("Discuss my estimate", "See hospitals"),
    note: "Header is the per-treatment cost infographic — savings live in the image, not the body." },
  { stage: "doc_reminder", seq: 9, msg_type: "session", category: "utility", header: null,
    body: "Hi {{1}}, we're ready to firm up your quote — we just need {{2}} to complete it. Whenever you can.",
    variables: { "1": "first name", "2": "the pending document" }, buttons: QR("Sending now", "Need help") },
  { stage: "objection", seq: 10, msg_type: "session", category: "utility", header: null,
    body: "Great questions, {{1}} — happy to help. Whether it's cost, choosing the hospital, or safety, I can share accreditation, a free second opinion, or a call with the doctor. What matters most?",
    variables: { "1": "first name" }, buttons: QR("Cost & payment", "Hospital & safety", "Talk to a doctor") },

  { stage: "booking", seq: 11, msg_type: "template", category: "utility", header: null, clinical: true,
    body: "Good news {{1}} — the hospital can offer an admission slot around {{2}}. Shall we hold it and start your visa invitation letter?",
    variables: { "1": "first name", "2": "date window" }, buttons: QR("Hold my slot", "Discuss dates") },
  { stage: "visa_start", seq: 12, msg_type: "template", category: "utility", header: HOW,
    body: "To start your India medical visa, the hospital will issue your official invitation letter. Here's your document checklist. Up to {{1}} attendant(s) can travel with you.",
    variables: { "1": "attendant count" }, buttons: QR("See my checklist", "Ask about visa"),
    note: "Invitation letter is a HOSPITAL handoff (system-generated, mandatory since Apr-2025). See lib/visa.mjs." },
  { stage: "stay_options", seq: 13, msg_type: "template", category: "utility", header: HOW,
    body: "Here are near-hospital stay options for you and your family — for before and after treatment. Walkable, family-friendly, extended-stay. Want me to hold one?",
    variables: {}, buttons: QR("See stays", "Hold a room"),
    note: "Options come from lib/stay.mjs (curated near-hospital until a booking provider is keyed)." },
  { stage: "pre_op", seq: 14, msg_type: "session", category: "utility", header: null, clinical: true,
    body: "Hi {{1}}, your pre-op instructions from the hospital are ready (fasting, medicines, what to bring). Your coordinator will meet you on arrival. Safe travels.",
    variables: { "1": "first name" }, buttons: QR("Got it", "Ask a question") },
  { stage: "in_treatment", seq: 15, msg_type: "session", category: "utility", header: null, clinical: true,
    body: "Wishing you a smooth procedure, {{1}}. Your coordinator is on hand for anything non-medical; the hospital team is with you for care. We'll keep your family updated.",
    variables: { "1": "first name" }, buttons: QR("Thank you") },

  { stage: "post_op", seq: 16, msg_type: "session", category: "utility", header: null,
    body: "Hi {{1}}, glad you're through it. Your discharge summary and follow-up plan are saved for you. How are you feeling today?",
    variables: { "1": "first name" }, buttons: QR("Doing okay", "Need help") },
  { stage: "recovery_bundle", seq: 17, msg_type: "template", category: "marketing", header: HOW,
    body: "Hi {{1}}, many patients add a short naturopathy recovery stay before flying home — restful, supervised, well-priced. Want options? Reply STOP to opt out.",
    variables: { "1": "first name" }, buttons: QR("Show recovery stays", "No thanks"),
    note: "Marketing — the wellness bundleable product. Requires opt-in; includes opt-out." },
  { stage: "review_referral", seq: 18, msg_type: "template", category: "marketing", header: null,
    body: "Hi {{1}}, we hope your treatment and recovery went well. If we helped, a short review means a lot — and if a friend or relative ever needs care in India, we're here. Reply STOP to opt out.",
    variables: { "1": "first name" }, buttons: QR("Leave a review", "Refer someone") },
  { stage: "reengage", seq: 19, msg_type: "template", category: "marketing", header: WELCOME,
    body: "Hi {{1}}, still considering treatment in India? Your MedYatra coordinator is here whenever you're ready — no pressure. Reply STOP to opt out.",
    variables: { "1": "first name" }, buttons: QR("I'm ready", "Not now"),
    note: "Marketing category — requires prior opt-in; includes opt-out." },
];

db.exec(`DELETE FROM comms_template`);
const ins = db.prepare(`INSERT INTO comms_template (stage,seq,name,channel,msg_type,category,language,header_type,header_asset,body,variables,buttons,status)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?, 'review')`);
for (const t of SEQ) {
  ins.run(t.stage, t.seq, `medyatra_${t.stage}`, "whatsapp", t.msg_type, t.category, "en",
    t.header ? "image" : "none", t.header || null, t.body, j(t.variables), t.buttons);
}

// --- 3) A human-readable submission sheet (what a human files with Meta / uses in-session) ---------
let md = `# WhatsApp Sales Comms — approval-ready templates\n\n> Body kept minimal & Utility-flavoured (what Meta scrutinizes); the value rides in the image header (infographic). Human submits to Meta & sends. Variables: {{1}} name · {{2}} treatment · {{3}} city.\n\n`;
for (const t of SEQ) {
  md += `## ${t.seq}. ${t.stage} — \`medyatra_${t.stage}\`\n`;
  md += `- **Type:** ${t.msg_type} · **Category:** ${t.category}\n- **Image header:** \`${t.header}\`\n- **Body:** ${t.body}\n- **Buttons:** ${JSON.parse(t.buttons).map((b) => `[${b.text}]`).join(" ")}\n`;
  if (t.note) md += `- _${t.note}_\n`;
  md += `\n`;
}
md += `\n**Compliance:** consent required before outbound; no clinical claims/guarantees; prices indicative (shown in image, not body); facilitator voice; honor opt-out. See /build-os/09.\n`;
writeFileSync(join(ROOT, "outputs", "comms", "whatsapp-templates.md"), md);

logRun(db, "Comms", "Sales comms drafted", `${SEQ.length} WhatsApp templates + ${Object.keys(estImg).length + 2} infographic headers — review (human submits to Meta)`, "/comms", "ok");
console.log(`✓ ${SEQ.length} templates + ${Object.keys(estImg).length + 2} infographics → comms_template / outputs/comms/. View at /comms.`);
db.close();
