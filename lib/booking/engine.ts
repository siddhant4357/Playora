/**
 * lib/booking/engine.ts
 *
 * The one write path for court bookings. Web, front desk, WhatsApp agent and
 * voice agent all call book()/cancel() here, so every rule lives in one place:
 *
 *  - slot aligned to the club's step, inside opening hours, not in the past
 *  - within the plan's advance window
 *  - member cap of N sessions per day
 *  - price quoted from pricing bands + plan discount
 *  - money recorded in the single Transaction ledger
 *  - double-booking rejected by the Postgres exclusion constraint, which
 *    makes concurrent requests safe without application-level locks
 *
 * Throws BookingError with a user-safe message; callers map it to UI.
 */

import { Prisma } from "@/generated/prisma/client";
import type { BookingKind, BookingSource, PaymentMode } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { dayStart, hhmmToMinutes, toDateKey, toLocalParts } from "@/lib/time";
import { creditPctForCancellation, policyFrom } from "./policy";
import { quote } from "./price";

export class BookingError extends Error {
  constructor(
    public code:
      | "SLOT_TAKEN"
      | "INVALID_SLOT"
      | "OUTSIDE_HOURS"
      | "IN_PAST"
      | "TOO_FAR_AHEAD"
      | "DAILY_CAP"
      | "NOT_FOUND"
      | "FORBIDDEN"
      | "ALREADY_CANCELLED"
      | "MEMBER_INACTIVE",
    message: string
  ) {
    super(message);
    this.name = "BookingError";
  }
}

export interface BookInput {
  clubId: string;
  courtId: string;
  startsAt: Date;
  /** Exactly one of memberId or walkIn. */
  memberId?: string | null;
  walkIn?: { name: string; phone?: string | null } | null;
  kind?: BookingKind;
  source: BookingSource;
  /** Staff may override how the money was taken; members pay ONLINE/CREDIT. */
  paymentMode?: PaymentMode;
  createdById?: string | null;
  now?: Date;
}

export interface BookResult {
  bookingId: string;
  priceCharged: number;
  priceReason: string;
  startsAt: Date;
  endsAt: Date;
  courtName: string;
}

export async function book(input: BookInput): Promise<BookResult> {
  const now = input.now ?? new Date();
  const kind: BookingKind = input.kind ?? "PRIVATE";

  const [club, court, member] = await Promise.all([
    prisma.club.findUniqueOrThrow({
      where: { id: input.clubId },
      select: { timezone: true, opensAt: true, closesAt: true, settings: true },
    }),
    prisma.court.findFirst({
      where: { id: input.courtId, clubId: input.clubId, isActive: true },
      include: { pricing: true },
    }),
    input.memberId
      ? prisma.member.findFirst({
          where: { id: input.memberId, clubId: input.clubId },
          include: { plan: true },
        })
      : Promise.resolve(null),
  ]);

  if (!court) throw new BookingError("NOT_FOUND", "That court does not exist.");
  if (input.memberId && !member) throw new BookingError("NOT_FOUND", "Member not found.");
  if (member && (member.status === "CANCELLED" || member.status === "FROZEN")) {
    throw new BookingError("MEMBER_INACTIVE", `Membership is ${member.status.toLowerCase()}.`);
  }

  const policy = policyFrom(club.settings);
  const tz = club.timezone;
  const startsAt = input.startsAt;
  const endsAt = new Date(startsAt.getTime() + policy.sessionMinutes * 60_000);

  // ── Slot geometry ────────────────────────────────────────────────────
  const local = toLocalParts(startsAt, tz);
  const minuteOfDay = local.hour * 60 + local.minute;
  if (local.second !== 0 || startsAt.getTime() % 60_000 !== 0) {
    throw new BookingError("INVALID_SLOT", "Slot must start on a whole minute.");
  }
  if ((minuteOfDay - hhmmToMinutes(club.opensAt)) % policy.slotStepMinutes !== 0) {
    throw new BookingError("INVALID_SLOT", `Slots start every ${policy.slotStepMinutes} minutes.`);
  }
  if (minuteOfDay < hhmmToMinutes(club.opensAt) || minuteOfDay + policy.sessionMinutes > hhmmToMinutes(club.closesAt)) {
    throw new BookingError("OUTSIDE_HOURS", `The club is open ${club.opensAt}–${club.closesAt}.`);
  }
  if (startsAt.getTime() <= now.getTime() && kind !== "MAINTENANCE") {
    throw new BookingError("IN_PAST", "That slot has already started.");
  }

  // ── Advance window ───────────────────────────────────────────────────
  const advanceDays = member?.plan?.advanceBookingDays ?? policy.defaultAdvanceDays;
  const isStaff = input.source === "FRONT_DESK" || input.source === "PHONE";
  if (!isStaff) {
    const lastAllowedDay = dayStart(toDateKey(now, tz), tz).getTime() + (advanceDays + 1) * 86_400_000;
    if (startsAt.getTime() >= lastAllowedDay) {
      throw new BookingError("TOO_FAR_AHEAD", `Your plan allows booking up to ${advanceDays} days ahead.`);
    }
  }

  // ── Price ────────────────────────────────────────────────────────────
  const listQuote = quote(court.pricing, member?.plan, startsAt, tz);
  const price =
    kind === "TRIAL"
      ? { ...listQuote, discountPct: 100, priceCharged: 0, reason: "Trial session — on the house" }
      : listQuote;
  const paymentMode: PaymentMode =
    input.paymentMode ?? (price.priceCharged === 0 ? "COMPLIMENTARY" : member ? "CREDIT" : "CASH");

  // ── Write (daily cap check + insert + ledger in one transaction) ─────
  try {
    const result = await prisma.$transaction(async (tx) => {
      if (member && kind === "PRIVATE") {
        const dayKey = toDateKey(startsAt, tz);
        const from = dayStart(dayKey, tz);
        const to = new Date(from.getTime() + 86_400_000);
        const cap = member.plan?.maxBookingsPerDay ?? policy.defaultMaxPerDay;
        const countToday = await tx.booking.count({
          where: {
            memberId: member.id,
            status: "CONFIRMED",
            kind: "PRIVATE",
            startsAt: { gte: from, lt: to },
          },
        });
        if (countToday >= cap) {
          throw new BookingError("DAILY_CAP", `Members can book ${cap} sessions per day.`);
        }
      }

      let transactionId: string | null = null;
      if (price.priceCharged > 0 || paymentMode === "COMPLIMENTARY") {
        // Pay from credit balance first if the member has any.
        let mode = paymentMode;
        if (member && mode === "CREDIT") {
          if (member.creditBalance >= price.priceCharged) {
            await tx.member.update({
              where: { id: member.id },
              data: { creditBalance: { decrement: price.priceCharged } },
            });
          } else {
            mode = "ONLINE";
          }
        }
        const t = await tx.transaction.create({
          data: {
            clubId: input.clubId,
            memberId: member?.id ?? null,
            source: "COURT",
            direction: "IN",
            amount: price.priceCharged,
            paymentMode: mode,
            refType: "Booking",
            description: `${court.name} · ${price.reason}`,
            byUserId: input.createdById ?? null,
          },
        });
        transactionId = t.id;
      }

      const booking = await tx.booking.create({
        data: {
          clubId: input.clubId,
          courtId: court.id,
          memberId: member?.id ?? null,
          walkInName: member ? null : input.walkIn?.name ?? "Walk-in",
          walkInPhone: member ? null : input.walkIn?.phone ?? null,
          startsAt,
          endsAt,
          kind,
          status: "CONFIRMED",
          source: input.source,
          listPrice: price.listPrice,
          discountPct: price.discountPct,
          priceCharged: price.priceCharged,
          priceReason: price.reason,
          transactionId,
          createdById: input.createdById ?? null,
        },
      });

      if (transactionId) {
        await tx.transaction.update({ where: { id: transactionId }, data: { refId: booking.id } });
      }

      await tx.activityLog.create({
        data: {
          clubId: input.clubId,
          userId: input.createdById ?? null,
          action: "BOOKING_CREATED",
          entity: "Booking",
          entityId: booking.id,
          newData: {
            court: court.name,
            startsAt: startsAt.toISOString(),
            member: member ? `${member.firstName} ${member.lastName}` : input.walkIn?.name,
            priceCharged: price.priceCharged,
            source: input.source,
          },
        },
      });

      return booking;
    });

    return {
      bookingId: result.id,
      priceCharged: result.priceCharged,
      priceReason: result.priceReason ?? price.reason,
      startsAt,
      endsAt,
      courtName: court.name,
    };
  } catch (err) {
    if (isExclusionViolation(err)) {
      throw new BookingError("SLOT_TAKEN", "Someone just took that slot. Pick another time.");
    }
    throw err;
  }
}

export interface CancelInput {
  clubId: string;
  bookingId: string;
  reason?: string | null;
  /** Member cancelling their own booking; staff pass null and may cancel any. */
  actingMemberId?: string | null;
  actingUserId?: string | null;
  now?: Date;
}

export interface CancelResult {
  creditIssued: number;
  creditPct: number;
}

export async function cancel(input: CancelInput): Promise<CancelResult> {
  const now = input.now ?? new Date();

  const booking = await prisma.booking.findFirst({
    where: { id: input.bookingId, clubId: input.clubId },
    include: { court: { select: { name: true } }, club: { select: { settings: true } } },
  });
  if (!booking) throw new BookingError("NOT_FOUND", "Booking not found.");
  if (input.actingMemberId && booking.memberId !== input.actingMemberId) {
    throw new BookingError("FORBIDDEN", "You can only cancel your own bookings.");
  }
  if (booking.status !== "CONFIRMED") {
    throw new BookingError("ALREADY_CANCELLED", "This booking is no longer active.");
  }

  const policy = policyFrom(booking.club.settings);
  const creditPct = creditPctForCancellation(booking.startsAt, now, policy);
  const creditIssued = Math.round((booking.priceCharged * creditPct) / 100);

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: "CANCELLED",
        cancelledAt: now,
        cancelReason: input.reason ?? null,
        creditIssued,
      },
    });

    if (creditIssued > 0 && booking.memberId) {
      await tx.member.update({
        where: { id: booking.memberId },
        data: { creditBalance: { increment: creditIssued } },
      });
      await tx.transaction.create({
        data: {
          clubId: input.clubId,
          memberId: booking.memberId,
          source: "REFUND",
          direction: "OUT",
          amount: creditIssued,
          paymentMode: "CREDIT",
          refType: "Booking",
          refId: booking.id,
          description: `Credit for cancelled ${booking.court.name} (${creditPct}%)`,
          byUserId: input.actingUserId ?? null,
        },
      });
    }

    await tx.activityLog.create({
      data: {
        clubId: input.clubId,
        userId: input.actingUserId ?? null,
        action: "BOOKING_CANCELLED",
        entity: "Booking",
        entityId: booking.id,
        oldData: { status: "CONFIRMED" },
        newData: { status: "CANCELLED", reason: input.reason, creditIssued, creditPct },
      },
    });
  });

  return { creditIssued, creditPct };
}

function isExclusionViolation(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2004 is a constraint violation; the driver message names our constraint.
    return err.code === "P2004" || /booking_no_overlap/i.test(err.message);
  }
  if (err instanceof Error) return /booking_no_overlap|exclusion constraint/i.test(err.message);
  return false;
}
