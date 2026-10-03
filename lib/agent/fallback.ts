/**
 * lib/agent/fallback.ts
 *
 * Deterministic WhatsApp front desk used when the language model is
 * unavailable (no Gateway credentials, quota, network). It understands the
 * four things members actually type — "what's free tomorrow", "book padel
 * 7pm", "my bookings", "cancel" — and calls the SAME kernel tools the LLM
 * agent uses, so bookings made this way are indistinguishable in the ledger.
 */

import { bookCourt, cancelBooking, checkAvailability, myBookings, type AgentContext } from "@/lib/agent/tools";

export type Intent =
  | { kind: "availability"; date?: string; sport?: string; fromTime?: string }
  | { kind: "book"; date?: string; time: string; sport?: string; court?: string; guestName?: string }
  | { kind: "myBookings" }
  | { kind: "cancel"; bookingId?: string }
  | { kind: "help" };

const DATE_WORDS = /\b(today|tomorrow|day after(?: tomorrow)?|mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?|\d{4}-\d{2}-\d{2})\b/i;
const TIME_WORDS = /\b(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b|\b(\d{1,2}:\d{2})\b|\bat\s+(\d{1,2})\b/i;
const SPORT_WORDS = /\b(badminton|shuttle|tennis|cricket|net|padel|pickle(?:ball)?)\b/i;
const COURT_WORDS = /\bcourt\s*(\d{1,2})\b/i;
const NAME_WORDS = /\b(?:i am|i'm|this is|my name is|name[:\s]+)\s*([a-z][a-z .'-]{1,40})/i;

export function parseIntent(text: string): Intent {
  const s = text.trim().toLowerCase();
  if (!s) return { kind: "help" };

  const date = s.match(DATE_WORDS)?.[1];
  const timeMatch = s.match(TIME_WORDS);
  const time = timeMatch ? (timeMatch[1] ?? timeMatch[2] ?? timeMatch[3]) : undefined;
  const sport = s.match(SPORT_WORDS)?.[1];
  const courtNo = s.match(COURT_WORDS)?.[1];
  const court = courtNo ? `Court ${courtNo}` : undefined;
  const guestName = text.match(NAME_WORDS)?.[1]?.trim();

  if (/\b(cancel|drop|scrap|remove)\b/.test(s)) {
    const id = s.match(/\b(c[a-z0-9]{20,})\b/)?.[1];
    return { kind: "cancel", bookingId: id };
  }
  if (/\b(my bookings?|upcoming|what (do|have) i (have|got)|show (me )?my|my slots?|my sessions?)\b/.test(s)) {
    return { kind: "myBookings" };
  }
  if (/\b(book|reserve|grab|take|want|need)\b/.test(s) && time) {
    return { kind: "book", date, time: time.replace(/\s+/g, ""), sport, court, guestName };
  }
  if (/\b(free|available|availability|open|slots?|empty|anything|what's on|whats on)\b/.test(s) || date || sport) {
    return { kind: "availability", date, sport, fromTime: time?.replace(/\s+/g, "") };
  }
  if (/\b(hi|hello|hey|yo|namaste|help|menu|start)\b/.test(s)) return { kind: "help" };
  return { kind: "help" };
}

function helpText(ctx: AgentContext) {
  const hi = ctx.member ? `Hi ${ctx.member.firstName}!` : `Hi! This is ${ctx.clubName}.`;
  return [hi, "I can help with courts. Try:", "• free padel tomorrow", "• book tennis 7pm", "• my bookings", "• cancel"].join("\n");
}

export async function runRuleBasedAgent(ctx: AgentContext, text: string): Promise<string> {
  const intent = parseIntent(text);

  switch (intent.kind) {
    case "availability": {
      const res = await checkAvailability(ctx, { date: intent.date, sport: intent.sport, fromTime: intent.fromTime });
      if (res.courts.length === 0) return `${res.date}: ${res.note ?? "nothing free."}`;
      const lines = res.courts.slice(0, 4).map((c) => `${c.court} (${c.sport}): ${c.freeSlots.slice(0, 5).map((f) => `${f.time} ${f.price}`).join(", ")}${c.moreFree ? ` +${c.moreFree} more` : ""}`);
      return [`Free on ${res.date}:`, ...lines, `Reply "book <court or sport> <time>" to grab one.`].join("\n");
    }

    case "book": {
      const res = await bookCourt(ctx, { date: intent.date, time: intent.time, sport: intent.sport, court: intent.court, guestName: intent.guestName });
      if (!res.ok) return res.error;
      const pay = res.payAtDesk ? " Pay at the desk when you arrive." : res.priceReason ? ` (${res.priceReason})` : "";
      return `Booked ✔ ${res.court}, ${res.date} ${res.time} — ${res.price}.${pay}\nReply "cancel" if your plans change.`;
    }

    case "myBookings": {
      const res = await myBookings(ctx);
      if (res.bookings.length === 0) return `No upcoming bookings. Say "free tomorrow" to see what's open.`;
      const lines = res.bookings.map((b, i) => `${i + 1}. ${b.court} · ${b.when}`);
      return [`Your upcoming bookings:`, ...lines].join("\n");
    }

    case "cancel": {
      const res = await cancelBooking(ctx, { bookingId: intent.bookingId });
      if (!res.ok) {
        if ("options" in res && res.options) {
          const lines = res.options.map((b, i) => `${i + 1}. ${b.court} · ${b.when}`);
          return [res.error, ...lines, `Reply "cancel" followed by the booking's court and time, or call the desk.`].join("\n");
        }
        return res.error;
      }
      if (!ctx.member) return `Cancelled. Nothing to pay — the slot is free again.`;
      return res.creditPct > 0 ? `Cancelled. ${res.creditIssued} (${res.creditPct}%) credited back to your account.` : `Cancelled. No credit was due this close to start.`;
    }

    case "help":
    default:
      return helpText(ctx);
  }
}
