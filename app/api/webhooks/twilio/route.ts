import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runWhatsAppAgent } from "@/lib/agent/run";
import { twiml, verifyTwilioSignature } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Twilio → WhatsApp inbound. Configure the sandbox/number's
 * "When a message comes in" webhook to POST here.
 */
export async function POST(req: Request) {
  const form = await req.formData();
  const params: Record<string, string> = {};
  form.forEach((v, k) => (params[k] = String(v)));

  // Twilio signs the public URL it POSTed to; behind proxies rebuild it from forwarded headers.
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const url = process.env.TWILIO_WEBHOOK_URL ?? `${proto}://${host}/api/webhooks/twilio`;
  if (process.env.NODE_ENV === "production" && !verifyTwilioSignature(url, params, req.headers.get("x-twilio-signature"))) {
    return new NextResponse("Bad signature", { status: 403 });
  }

  const from = params.From ?? "";
  const body = (params.Body ?? "").trim();
  if (!from || !body) return new NextResponse(twiml("Hi! Ask me to check court availability, book, or cancel."), { headers: { "Content-Type": "text/xml" } });

  const club = await prisma.club.findFirst({ select: { id: true } });
  if (!club) return new NextResponse("No club", { status: 500 });

  try {
    const reply = await runWhatsAppAgent(club.id, from, body);
    return new NextResponse(twiml(reply), { headers: { "Content-Type": "text/xml" } });
  } catch (e) {
    console.error("[twilio webhook]", e);
    return new NextResponse(twiml("Sorry, something went wrong on our side. Please call the front desk."), { headers: { "Content-Type": "text/xml" } });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, channel: "whatsapp", hint: "POST Twilio form params here." });
}
