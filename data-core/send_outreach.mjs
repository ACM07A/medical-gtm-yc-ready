// Outreach Sender (FREE/local by default) — "sends" draft outreach to a local outbox (.eml) so it's
// autonomous + zero-cost; a human dispatches the .eml. With RESEND_API_KEY set, actually sends.
//   node --experimental-sqlite data-core/send_outreach.mjs
import { open, logRun } from "./db.mjs";
import { sendEmail } from "../lib/mailer.mjs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUTBOX = join(ROOT, "outputs", "outbox");
const db = open();

const rows = db.prepare(`SELECT o.*, p.ips_channel_public chan, p.name partner FROM outreach o
  JOIN partner p ON p.id=o.partner_id WHERE o.status='draft'`).all();
let done = 0, skipped = 0;
for (const o of rows) {
  const email = (o.chan || "").match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  if (!email) { logRun(db, "Outreach Sender", `skip ${o.partner}`, "no public email — run sourcing research first", `/outreach/${o.id}`, "pending"); skipped++; continue; }
  const raw = readFileSync(join(ROOT, o.file_ref), "utf8").replace(/<!--[\s\S]*?-->/g, "").trim();
  const body = raw.replace(/^Subject:.*(\r?\n)+/i, "").trim();
  const res = await sendEmail({ to: email[0], subject: o.subject, text: body }, OUTBOX);
  db.prepare(`UPDATE outreach SET status=? WHERE id=?`).run(res.status, o.id);
  db.prepare(`UPDATE partner SET stage=? WHERE id=?`).run(res.status === "sent" ? "Outreach sent" : "Outreach queued", o.partner_id);
  logRun(db, "Outreach Sender", `${res.status} ${o.partner}`, `${res.mode} → ${email[0]}`, `/outreach/${o.id}`, "ok");
  done++;
}
logRun(db, "Outreach Sender", "Send batch complete", `${done} ${process.env.RESEND_API_KEY ? "sent (Resend)" : "queued to local outbox"}, ${skipped} skipped`);
console.log(`outreach: ${done} ${process.env.RESEND_API_KEY ? "sent" : "queued(outbox)"}, ${skipped} skipped (no email)`);
db.close();
