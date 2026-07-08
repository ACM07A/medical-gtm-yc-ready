// Mailer — FREE by default. Writes to a local outbox (.eml) so outreach can be "sent" autonomously
// and locally at zero cost (a human dispatches the .eml). If RESEND_API_KEY is set, really sends
// via Resend (free tier ~100/day). No paid ESP required to run the factory.
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export async function sendEmail({ to, subject, text, from = "partnerships@medyatra.example" }, outboxDir) {
  if (process.env.RESEND_API_KEY) {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to, subject, text }),
      });
      return { mode: "resend", ok: r.ok, status: "sent" };
    } catch (e) { /* fall through to outbox */ }
  }
  mkdirSync(outboxDir, { recursive: true });
  const eml = `From: ${from}\r\nTo: ${to}\r\nSubject: ${subject}\r\nDate: ${new Date().toUTCString()}\r\n\r\n${text}\r\n`;
  const file = join(outboxDir, `${Date.now()}-${String(to).replace(/[^a-z0-9]/gi, "_").slice(0, 40)}.eml`);
  writeFileSync(file, eml);
  return { mode: "outbox", ok: true, status: "queued", file };
}
