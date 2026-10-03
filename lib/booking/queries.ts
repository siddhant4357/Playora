/**
 * lib/booking/queries.ts
 *
 * Read helpers for booking screens. Server-only.
 */

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { addDaysToKey, dayStart, todayKey } from "@/lib/time";
import { policyFrom } from "./policy";

export async function getMemberContext(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      memberId: true,
      club: { select: { id: true, timezone: true, settings: true, opensAt: true, closesAt: true } },
      member: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          memberCode: true,
          status: true,
          creditBalance: true,
          expiryDate: true,
          plan: {
            select: {
              id: true,
              name: true,
              tier: true,
              courtDiscountPct: true,
              maxBookingsPerDay: true,
              advanceBookingDays: true,
            },
          },
        },
      },
    },
  });
  if (!user) return null;
  const policy = policyFrom(user.club.settings);
  return {
    club: user.club,
    member: user.member,
    policy,
    advanceDays: user.member?.plan?.advanceBookingDays ?? policy.defaultAdvanceDays,
    maxPerDay: user.member?.plan?.maxBookingsPerDay ?? policy.defaultMaxPerDay,
  };
}

export async function countMemberBookingsOnDay(memberId: string, dateKey: string, tz: string) {
  const from = dayStart(dateKey, tz);
  const to = new Date(from.getTime() + 86_400_000);
  return prisma.booking.count({
    where: { memberId, status: "CONFIRMED", kind: "PRIVATE", startsAt: { gte: from, lt: to } },
  });
}

export const bookingListSelect = {
  id: true,
  startsAt: true,
  endsAt: true,
  kind: true,
  status: true,
  source: true,
  priceCharged: true,
  listPrice: true,
  priceReason: true,
  checkedInAt: true,
  cancelledAt: true,
  creditIssued: true,
  walkInName: true,
  court: { select: { id: true, name: true, type: true, isIndoor: true } },
  member: { select: { id: true, firstName: true, lastName: true, memberCode: true, plan: { select: { tier: true, name: true } } } },
} as const;

export async function listMemberBookings(memberId: string) {
  const now = new Date();
  const [upcoming, past] = await Promise.all([
    prisma.booking.findMany({
      where: { memberId, status: "CONFIRMED", endsAt: { gte: now } },
      orderBy: { startsAt: "asc" },
      select: bookingListSelect,
    }),
    prisma.booking.findMany({
      where: { memberId, OR: [{ status: { not: "CONFIRMED" } }, { endsAt: { lt: now } }] },
      orderBy: { startsAt: "desc" },
      take: 20,
      select: bookingListSelect,
    }),
  ]);
  return { upcoming, past };
}

export async function getNextMemberBooking(memberId: string) {
  return prisma.booking.findFirst({
    where: { memberId, status: "CONFIRMED", endsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
    select: bookingListSelect,
  });
}

/** Desk: everything happening today, for the "who's here" and summary strips. */
export type BookingRange = "today" | "upcoming" | "past";
export type BookingStatusFilter = "ALL" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

export interface DeskBookingFilters {
  range: BookingRange;
  status: BookingStatusFilter;
  q: string;
}

/** Paged list behind /desk/bookings. Scoped to the club; never leaks across tenants. */
export async function listDeskBookings(clubId: string, filters: DeskBookingFilters, tz: string) {
  const now = new Date();
  const today = todayKey(tz);
  const start = dayStart(today, tz);
  const end = dayStart(addDaysToKey(today, 1), tz);

  const timeWhere: Prisma.BookingWhereInput =
    filters.range === "today"
      ? { startsAt: { gte: start, lt: end } }
      : filters.range === "upcoming"
        ? { startsAt: { gte: now } }
        : { startsAt: { lt: now, gte: new Date(now.getTime() - 30 * 86_400_000) } };

  const q = filters.q.trim();
  const qWhere: Prisma.BookingWhereInput = q
    ? {
        OR: [
          { walkInName: { contains: q, mode: "insensitive" } },
          { member: { firstName: { contains: q, mode: "insensitive" } } },
          { member: { lastName: { contains: q, mode: "insensitive" } } },
          { member: { memberCode: { contains: q, mode: "insensitive" } } },
          { court: { name: { contains: q, mode: "insensitive" } } },
        ],
      }
    : {};

  const base: Prisma.BookingWhereInput = { clubId, ...timeWhere, ...qWhere };
  const where: Prisma.BookingWhereInput = filters.status === "ALL" ? base : { ...base, status: filters.status };

  const [rows, grouped] = await Promise.all([
    prisma.booking.findMany({
      where,
      select: { ...bookingListSelect, source: true, walkInPhone: true },
      orderBy: { startsAt: filters.range === "past" ? "desc" : "asc" },
      take: 200,
    }),
    prisma.booking.groupBy({ by: ["status"], where: base, _count: { _all: true } }),
  ]);

  const counts: Record<string, number> = {};
  for (const g of grouped) counts[g.status] = g._count._all;
  counts.ALL = grouped.reduce((n, g) => n + g._count._all, 0);
  return { rows, counts };
}

export async function getDeskDaySummary(clubId: string, dateKey: string, tz: string) {
  const from = dayStart(dateKey, tz);
  const to = new Date(from.getTime() + 86_400_000);
  const now = new Date();

  const bookings = await prisma.booking.findMany({
    where: { clubId, startsAt: { gte: from, lt: to }, status: { in: ["CONFIRMED", "COMPLETED"] } },
    orderBy: { startsAt: "asc" },
    select: bookingListSelect,
  });

  const onCourtNow = bookings.filter((b) => b.startsAt <= now && b.endsAt > now);
  const checkedIn = bookings.filter((b) => !!b.checkedInAt);
  const revenue = bookings.reduce((sum, b) => sum + b.priceCharged, 0);
  const members = bookings.filter((b) => b.member).length;

  return {
    isToday: dateKey === todayKey(tz),
    total: bookings.length,
    members,
    walkIns: bookings.length - members,
    checkedIn: checkedIn.length,
    onCourtNow,
    revenue,
    upcoming: bookings.filter((b) => b.startsAt > now).slice(0, 8),
  };
}
