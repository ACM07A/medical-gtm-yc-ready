// Mailer — FREE by default (writes .eml to a local outbox; a human dispatches). Resend if RESEND_API_KEY.
//
// CAN-SPAM / GDPR compliance is enforced here, not left to the copy: every message gets a compliance
// FOOTER (sender identity + physical postal address + why-you-got-this + how to opt out) and a
// List-Unsubscribe header (one-click). Real B2B cold outreach also needs, on the SENDING DOMAIN:
//   • SPF + DKIM + DMARC records (or it lands in spam regardless of content)
//   • domain warm-up (ramp volume slowly from a fresh domain)
//   • a maintained suppression/opt-out list (honor STOP immediately)
// These are ops steps (see /build-os/10); this module makes each message itself compliant.
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const SENDER_NAME = process.env.SENDER_NAME || "Canopus Care Partnerships";
const SENDER_ADDRESS = process.env.SENDER_ADDRESS || "[SET SENDER_ADDRESS — a real physical postal address is legally required]";
const UNSUB_EMAIL = process.env.UNSUBSCRIBE_EMAIL || "unsubscribe@medyatra.example";
const UNSUB_URL = process.env.UNSUBSCRIBE_URL || "";

function complianceFooter() {
  const optout = UNSUB_URL ? `unsubscribe: ${UNSUB_URL}` : `reply "STOP" or email ${UNSUB_EMAIL}`;
  return `\r\n\r\n—\r\n${SENDER_NAME} · ${SENDER_ADDRESS}\r\n` +
    `You received this one-time B2B partnership inquiry because your organisation's public business-development contact was identified for medical-value-travel partnerships (legitimate-interest basis). ` +
    `Not the right person? Reply and we'll update our records. To stop hearing from us: ${optout}.`;
}

export async function sendEmail({ to, subject, text, from = "partnerships@medyatra.example" }, outboxDir) {
  const body = text + complianceFooter();
  const unsubHeader = UNSUB_URL ? `<${UNSUB_URL}>, <mailto:${UNSUB_EMAIL}?subject=unsubscribe>` : `<mailto:${UNSUB_EMAIL}?subject=unsubscribe>`;

  if (process.env.RESEND_API_KEY) {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: `${SENDER_NAME} <${from}>`, to, subject, text: body,
          headers: { "List-Unsubscribe": unsubHeader, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } }),
      });
      return { mode: "resend", ok: r.ok, status: "sent" };
    } catch (e) { /* fall through to outbox */ }
  }
  mkdirSync(outboxDir, { recursive: true });
  const eml = `From: ${SENDER_NAME} <${from}>\r\nTo: ${to}\r\nSubject: ${subject}\r\n` +
    `List-Unsubscribe: ${unsubHeader}\r\nList-Unsubscribe-Post: List-Unsubscribe=One-Click\r\n` +
    `Date: ${new Date().toUTCString()}\r\n\r\n${body}\r\n`;
  const file = join(outboxDir, `${Date.now()}-${String(to).replace(/[^a-z0-9]/gi, "_").slice(0, 40)}.eml`);
  writeFileSync(file, eml);
  return { mode: "outbox", ok: true, status: "queued", file };
}
