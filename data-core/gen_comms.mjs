// Sales Comms Agent (/build-os/09) — drafts the post-lead WhatsApp sequence as APPROVAL-READY templates:
// minimal, kosher body text (what Meta scrutinizes) + an infographic IMAGE HEADER that carries the value.
// Renders the paired infographics from real data. Human-gated: drafted here → submitted to Meta → sent by a
// human (lib/publishers dry-run unless POST_LIVE=1 + approval). Reusable templates use {{n}} variables.
//   node --experimental-sqlite data-core/gen_comms.mjs
import { open, logRun, j } from "./db.mjs";
import { costComparisonHtml, welcomeHtml, howItWorksHtml, renderInfographic } from "../lib/infographic.mjs";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const db = open();
const O = (s, ...p) => db.prepare(s).get(...p);
const A = (s, ...p) => db.prepare(s).all(...p);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const IMG = join(ROOT, "outputs", "comms", "img");
mkdirSync(IMG, { recursive: true });

// Cited Western references (from /build-os/08) for the per-category estimate infographic.
const WEST = { cardiac: [90000, 120000], ortho: [35000, 50000], oncology: [150000, 400000], fertility: [12000, 25000], cosmetic: [20000, 30000], dental: [3000, 6000] };
const rel = (p) => p.replace(ROOT + "\\", "").replace(ROOT + "/", "").replace(/\\/g, "/");

// --- 1) Render the shared infographic headers -----------------------------------------------------
const welcomeImg = join(IMG, "welcome.png");
const howImg = join(IMG, "how-it-works.png");
await renderInfographic(welcomeHtml({}), welcomeImg);
await renderInfographic(howItWorksHtml(), howImg);
// per-category estimate (cost comparison) headers
const cats = A(`SELECT * FROM category WHERE status='launch' ORDER BY rank`);
const estImg = {};
for (const c of cats) {
  const pr = O(`SELECT min(india_low) lo, max(india_high) hi FROM category_price WHERE category_id=?`, c.id);
  const w = WEST[c.id];
  if (pr && pr.lo && w) {
    const out = join(IMG, `estimate-${c.id}.png`);
    await renderInfographic(costComparisonHtml({ treatment: c.name, market: "your country", india_low: pr.lo, india_high: pr.hi, west_low: w[0], west_high: w[1] }), out);
    estImg[c.id] = rel(out);
  }
}
const flagship = O(`SELECT id FROM category WHERE flagship=1`)?.id || cats[0].id;

// --- 2) The sequence (reusable templates; {{1}} name, {{2}} treatment, {{3}} city) ----------------
const QR = (...labels) => j(labels.map((text) => ({ type: "quick_reply", text })));
const SEQ = [
  { stage: "acknowledge", seq: 1, msg_type: "template", category: "utility", header: rel(welcomeImg),
    body: "Hi {{1}}, thanks for reaching out to MedYatra about {{2}} in India. Your care coordinator will share accredited hospital options with you shortly.",
    variables: { "1": "patient first name", "2": "treatment" }, buttons: QR("Talk to a coordinator", "Not now") },
  { stage: "qualify", seq: 2, msg_type: "session", category: "utility", header: rel(howImg),
    body: "To tailor your options, could you share your recent medical reports, your preferred timing, and the city you'll travel from?",
    variables: {}, buttons: QR("Send reports", "Ask a question") },
  { stage: "estimate", seq: 3, msg_type: "template", category: "utility", header: estImg[flagship] || rel(welcomeImg),
    body: "Hi {{1}}, here's the indicative cost range for {{2}} you asked about — a package estimate, not a final quote. Your coordinator will confirm the details for your case.",
    variables: { "1": "patient first name", "2": "treatment" }, buttons: QR("Discuss my estimate", "See hospitals"),
    note: "Header image is per-treatment (estimate-<category>.png) — the cost comparison + savings live in the image, not the body." },
  { stage: "hospital_options", seq: 4, msg_type: "template", category: "utility", header: rel(welcomeImg),
    body: "We've shortlisted accredited hospitals for your {{1}}. Tap below to see doctor profiles and what's included.",
    variables: { "1": "treatment" }, buttons: QR("See hospital options", "Talk to a coordinator") },
  { stage: "logistics", seq: 5, msg_type: "session", category: "utility", header: rel(howImg),
    body: "Here's how your medical trip works — visa invitation, travel, stay and support, step by step. Your coordinator arranges it all.",
    variables: {}, buttons: QR("Start planning", "Ask a question") },
  { stage: "reengage", seq: 6, msg_type: "template", category: "marketing", header: rel(welcomeImg),
    body: "Hi {{1}}, still considering treatment in India? Your MedYatra coordinator is here whenever you're ready — no pressure. Reply STOP to opt out.",
    variables: { "1": "patient first name" }, buttons: QR("I'm ready", "Not now"),
    note: "Marketing category — requires prior opt-in; includes opt-out." },
];

db.exec(`DELETE FROM comms_template`);
const ins = db.prepare(`INSERT INTO comms_template (stage,seq,name,channel,msg_type,category,language,header_type,header_asset,body,variables,buttons,status)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?, 'review')`);
for (const t of SEQ) {
  ins.run(t.stage, t.seq, `medyatra_${t.stage}`, "whatsapp", t.msg_type, t.category, "en", "image", t.header, t.body, j(t.variables), t.buttons);
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
