/**
 * Channel-agnostic booking tools. WhatsApp (Twilio) and voice (Vapi) both
 * call these exact functions — the channel only differs in how the caller is
 * identified (phone number) and how the reply is rendered.
 *
 * Every function returns a plain, speakable object: no Dates, no paise.
 */
import { prisma } from "@/lib/db";
import { book, cancel, BookingError } from "@/lib/booking/engine";
import { getSlotGrid } from "@/lib/booking/slots";
import { listMemberBookings } from "@/lib/booking/queries";
import { formatPaise } from "@/lib/money";
import { addDaysToKey, formatDayLabel, formatTime, localToUtc, parseDateKey, toDateKey, todayKey } from "@/lib/time";
import { normalisePhone } from "@/lib/whatsapp";
import type { BookingSource, CourtType } from "@/generated/prisma/client";

export interface AgentContext {
  clubId: string;
  timezone: string;
  clubName: string;
  /** E.164 of the person we're talking to. */
  phone: string;
  /** Resolved from phone when they're a member. */
  member: { id: string; firstName: string; lastName: string; planId: string | null; planName: string | null } | null;
  source: BookingSource; // WHATSAPP | PHONE
}

export async function resolveContext(clubId: string, rawPhone: string, source: BookingSource): Promise<AgentContext> {
  const phone = normalisePhone(rawPhone);
  const club = await prisma.club.findUniqueOrThrow({ where: { id: clubId }, select: { name: true, timezone: true } });
  const last10 = phone.slice(-10);
  // Stored phones are formatted ("+91 98200 00105"); compare digits only.
  const matches = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM members
    WHERE "clubId" = ${clubId}
      AND status IN ('ACTIVE', 'TRIAL', 'EXPIRED')
      AND regexp_replace(phone, '[^0-9]', '', 'g') LIKE ${"%" + last10}
    ORDER BY CASE status WHEN 'ACTIVE' THEN 0 WHEN 'TRIAL' THEN 1 ELSE 2 END
    LIMIT 1`;
  const member = matches[0]
    ? await prisma.member.findUnique({
        where: { id: matches[0].id },
        select: { id: true, firstName: true, lastName: true, planId: true, plan: { select: { name: true } } },
      })
    : null;
  return {
    clubId,
    timezone: club.timezone,
    clubName: club.name,
    phone,
    member: member ? { id: member.id, firstName: member.firstName, lastName: member.lastName, planId: member.planId, planName: member.plan?.name ?? null } : null,
    source,
  };
}

/** "today" | "tomorrow" | "2026-10-05" | "sunday" → YYYY-MM-DD, club-local. */
export function resolveDate(input: string | undefined, tz: string): string {
  const today = todayKey(tz);
  if (!input) return today;
  const s = input.trim().toLowerCase();
  if (s === "today") return today;
  if (s === "tomorrow") return addDaysToKey(today, 1);
  if (s === "day after" || s === "day after tomorrow") return addDaysToKey(today, 2);
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const idx = days.findIndex((d) => s.startsWith(d.slice(0, 3)));
  if (idx >= 0) {
    const todayDow = new Date(`${today}T12:00:00Z`).getUTCDay();
    const delta = (idx - todayDow + 7) % 7 || 7;
    return addDaysToKey(today, delta);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s) && parseDateKey(s)) return s;
  return today;
}

/** "6pm" | "6:30 pm" | "18:00" → minutes from midnight, or null. */
export function resolveTime(input: string): number | null {
  const s = input.trim().toLowerCase().replace(/\s+/g, "");
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  if (m[3] === "pm" && h < 12) h += 12;
  if (m[3] === "am" && h === 12) h = 0;
  if (!m[3] && h <= 7) h += 12; // "6" with no suffix at a sports club means evening
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

const COURT_TYPE_WORDS: Record<string, CourtType> = { badminton: "BADMINTON", shuttle: "BADMINTON", tennis: "TENNIS", cricket: "CRICKET", net: "CRICKET", padel: "PADEL", pickle: "PICKLEBALL" };

export function resolveCourtType(input?: string | null): CourtType | null {
  if (!input) return null;
  const s = input.toLowerCase();
  for (const [word, type] of Object.entries(COURT_TYPE_WORDS)) if (s.includes(word)) return type;
  return null;
}

// ───────────────────────── Tools ─────────────────────────

export async function checkAvailability(ctx: AgentContext, args: { date?: string; sport?: string; fromTime?: string }) {
  const dateKey = resolveDate(args.date, ctx.timezone);
  const courtType = resolveCourtType(args.sport);
  const grid = await getSlotGrid({ clubId: ctx.clubId, dateKey, viewerMemberId: ctx.member?.id, planId: ctx.member?.planId, courtType });
  const fromMin = args.fromTime ? resolveTime(args.fromTime) : null;

  const courts = grid.courts
    .map((c) => {
      const free = c.slots.filter((s) => s.state === "free" && (fromMin === null || s.minuteOfDay >= fromMin));
      return { courtId: c.id, court: c.name, sport: c.type.toLowerCase().replace("_", " "), indoor: c.isIndoor, freeSlots: free.slice(0, 8).map((s) => ({ time: s.label, price: formatPaise(s.price.priceCharged) })), moreFree: Math.max(0, free.length - 8) };
    })
    .filter((c) => c.freeSlots.length > 0);

  let note: string | undefined;
  if (courts.length === 0) {
    const sports = await prisma.court.findMany({ where: { clubId: ctx.clubId, isActive: true }, select: { type: true }, distinct: ["type"] });
    const have = sports.map((s) => s.type.toLowerCase()).join(", ");
    note = courtType && !sports.some((s) => s.type === courtType) ? `We don't have ${courtType.toLowerCase()} courts. We have: ${have}.` : "Nothing free matches. Try another day or time.";
  }
  return { date: formatDayLabel(dateKey, ctx.timezone), dateKey, courts, note };
}

export async function bookCourt(ctx: AgentContext, args: { date?: string; time: string; court?: string; sport?: string; guestName?: string }) {
  const dateKey = resolveDate(args.date, ctx.timezone);
  const startMin = resolveTime(args.time);
  if (startMin === null) return { ok: false as const, error: `I couldn't read the time "${args.time}". Try something like "6pm" or "18:30".` };

  const courtType = resolveCourtType(args.sport) ?? resolveCourtType(args.court);
  const courts = await prisma.court.findMany({ where: { clubId: ctx.clubId, isActive: true, ...(courtType ? { type: courtType } : {}) }, orderBy: { name: "asc" } });
  let court = args.court ? courts.find((c) => c.name.toLowerCase() === args.court!.toLowerCase() || c.name.toLowerCase().endsWith(args.court!.toLowerCase().replace(/^court\s*/, ""))) : undefined;

  if (!court) {
    // Pick the first court that's actually free at that time.
    const grid = await getSlotGrid({ clubId: ctx.clubId, dateKey, viewerMemberId: ctx.member?.id, planId: ctx.member?.planId, courtType });
    const freeCourt = grid.courts.find((c) => c.slots.some((s) => s.minuteOfDay === startMin && s.state === "free"));
    if (!freeCourt) return { ok: false as const, error: `No ${courtType ? courtType.toLowerCase() : ""} court is free at ${args.time} on ${formatDayLabel(dateKey, ctx.timezone)}. Ask me what's available.` };
    court = courts.find((c) => c.id === freeCourt.id);
  }
  if (!court) return { ok: false as const, error: "I couldn't find that court." };

  const p = parseDateKey(dateKey)!;
  const startsAt = localToUtc(ctx.timezone, p.year, p.month, p.day, Math.floor(startMin / 60), startMin % 60);

  try {
    const res = await book({
      clubId: ctx.clubId,
      courtId: court.id,
      startsAt,
      memberId: ctx.member?.id ?? null,
      walkIn: ctx.member ? null : { name: args.guestName?.trim() || "Guest (phone)", phone: ctx.phone },
      source: ctx.source,
      paymentMode: ctx.member ? "CREDIT" : "CASH",
    });
    return {
      ok: true as const,
      bookingId: res.bookingId,
      court: res.courtName,
      date: formatDayLabel(dateKey, ctx.timezone),
      time: `${formatTime(res.startsAt, ctx.timezone)}–${formatTime(res.endsAt, ctx.timezone)}`,
      price: formatPaise(res.priceCharged),
      priceReason: res.priceReason,
      payAtDesk: !ctx.member,
    };
  } catch (e) {
    if (e instanceof BookingError) return { ok: false as const, error: e.message };
    throw e;
  }
}

export async function myBookings(ctx: AgentContext) {
  if (!ctx.member) {
    const walkIns = await prisma.booking.findMany({
      where: { clubId: ctx.clubId, walkInPhone: { endsWith: ctx.phone.slice(-10) }, status: "CONFIRMED", endsAt: { gte: new Date() } },
      include: { court: { select: { name: true } } },
      orderBy: { startsAt: "asc" },
      take: 5,
    });
    return { member: false, bookings: walkIns.map((b) => ({ bookingId: b.id, court: b.court.name, when: `${formatDayLabel(toDateKey(b.startsAt, ctx.timezone), ctx.timezone)} ${formatTime(b.startsAt, ctx.timezone)}`, status: b.status })) };
  }
  const { upcoming } = await listMemberBookings(ctx.member.id);
  return { member: true, name: ctx.member.firstName, bookings: upcoming.slice(0, 5).map((b) => ({ bookingId: b.id, court: b.court.name, when: `${formatDayLabel(toDateKey(b.startsAt, ctx.timezone), ctx.timezone)} ${formatTime(b.startsAt, ctx.timezone)}`, status: b.status })) };
}

export async function cancelBooking(ctx: AgentContext, args: { bookingId?: string; when?: string }) {
  let id: string | undefined = args.bookingId;
  if (!id) {
    const mine = await myBookings(ctx);
    if (mine.bookings.length === 1) id = mine.bookings[0].bookingId;
    else if (mine.bookings.length === 0) return { ok: false as const, error: "You have no upcoming bookings to cancel." };
    else return { ok: false as const, error: "You have several bookings. Which one?", options: mine.bookings };
  }
  if (!id) return { ok: false as const, error: "No booking selected." };
  try {
    const res = await cancel({ clubId: ctx.clubId, bookingId: id, actingMemberId: ctx.member?.id ?? null, reason: `Cancelled via ${ctx.source.toLowerCase()}` });
    return { ok: true as const, creditIssued: formatPaise(res.creditIssued), creditPct: res.creditPct };
  } catch (e) {
    if (e instanceof BookingError) return { ok: false as const, error: e.message };
    throw e;
  }
}

/** Raw schema shared by the WhatsApp agent and the Vapi tool definitions. */
export const TOOL_DEFS = {
  checkAvailability: { description: "List free court slots for a date. Use before booking when the caller hasn't given an exact court+time.", params: { date: "today | tomorrow | weekday name | YYYY-MM-DD", sport: "badminton | tennis | cricket | padel | pickleball (optional)", fromTime: "earliest time of interest like 6pm (optional)" } },
  book: { description: "Book a court. Needs a time; date defaults to today. If court is omitted, the first free court of that sport is chosen.", params: { date: "today | tomorrow | weekday | YYYY-MM-DD", time: "e.g. 6pm, 18:30", court: "court name like 'Court 2' (optional)", sport: "sport if court not given (optional)", guestName: "caller's name if they're not a member (optional)" } },
  myBookings: { description: "List the caller's upcoming bookings.", params: {} },
  cancel: { description: "Cancel a booking. If bookingId is unknown and the caller has one upcoming booking, that one is cancelled.", params: { bookingId: "id from myBookings (optional)" } },
} as const;
