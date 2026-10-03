/**
 * Twilio WhatsApp — outbound send + inbound signature check.
 * Uses the REST API over fetch so there is no SDK to install.
 *
 * Env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM (e.g. "whatsapp:+14155238886")
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export function whatsappConfigured() {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM);
}

/** Normalise "+91 98200 00001" / "whatsapp:+919820000001" → "+919820000001". */
export function normalisePhone(raw: string) {
  const digits = raw.replace(/^whatsapp:/, "").replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`;
}

export async function sendWhatsApp(to: string, body: string): Promise<boolean> {
  if (!whatsappConfigured()) return false;
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const auth = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");
  const form = new URLSearchParams({ From: process.env.TWILIO_WHATSAPP_FROM!, To: `whatsapp:${normalisePhone(to)}`, Body: body });
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    if (!res.ok) console.error("[whatsapp] send failed", res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error("[whatsapp] send error", e);
    return false;
  }
}

/**
 * Twilio signs webhooks with HMAC-SHA1 over (url + sorted form params).
 * https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */
export function verifyTwilioSignature(url: string, params: Record<string, string>, signature: string | null) {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token || !signature) return false;
  const data = Object.keys(params)
    .sort()
    .reduce((acc, k) => acc + k + params[k], url);
  const expected = createHmac("sha1", token).update(data).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function twiml(message: string) {
  const escaped = message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`;
}
