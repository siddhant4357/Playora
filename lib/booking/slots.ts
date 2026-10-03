/**
 * lib/booking/slots.ts
 *
 * Builds the availability grid for one club-local day. Read-only; the write
 * path lives in lib/actions/booking.ts. Used by /me/book, /desk, /display and
 * the agents' getAvailability tool.
 */

import { prisma } from "@/lib/db";
import { dayStart, hhmmToMinutes, minutesToLabel } from "@/lib/time";
import { policyFrom } from "./policy";
import { quote, type PriceQuote } from "./price";
import type { BookingKind, CourtType } from "@/generated/prisma/client";

export type SlotState = "free" | "booked" | "mine" | "past" | "social";

export interface Slot {
  startsAt: Date;
  endsAt: Date;
  /** Minutes since club-local midnight, for stable column keys. */
  minuteOfDay: number;
  label: string; // "6pm", "6:30pm"
  state: SlotState;
  price: PriceQuote;
  booking?: {
    id: string;
    kind: BookingKind;
    label: string; // member name or walk-in name, for staff views
    memberId: string | null;
    checkedIn: boolean;
    priceCharged: number;
  };
}

export interface CourtRow {
  id: string;
  name: string;
  type: CourtType;
  isIndoor: boolean;
  slots: Slot[];
}

export interface SlotGrid {
  dateKey: string;
  timezone: string;
  /** Column headers shared by every court row. */
  times: { minuteOfDay: number; label: string }[];
  courts: CourtRow[];
}

interface GridOptions {
  clubId: string;
  dateKey: string;
  /** Session viewer's member id, so their own bookings render as "mine". */
  viewerMemberId?: string | null;
  /** Quote prices for this plan (viewer's plan or a desk-selected member's). */
  planId?: string | null;
  courtType?: CourtType | null;
  /** Staff views see names on booked slots; members only see "booked". */
  revealNames?: boolean;
  now?: Date;
}

export async function getSlotGrid(opts: GridOptions): Promise<SlotGrid> {
  const [grid] = await getSlotGrids({ ...opts, dateKeys: [opts.dateKey] });
  return grid;
}

type MultiDayOptions = Omit<GridOptions, "dateKey"> & { dateKeys: string[] };

const bookingSelect = {
  id: true,
  courtId: true,
  startsAt: true,
  endsAt: true,
  kind: true,
  memberId: true,
  walkInName: true,
  checkedInAt: true,
  priceCharged: true,
  member: { select: { firstName: true, lastName: true } },
} as const;

/**
 * Builds grids for several days with one round of reads: club + courts + plan
 * in parallel, then a single bookings query spanning the whole window.
 * Round-trip count stays constant no matter how many days are requested.
 */
export async function getSlotGrids(opts: MultiDayOptions): Promise<SlotGrid[]> {
  const now = opts.now ?? new Date();
  if (opts.dateKeys.length === 0) return [];

  const [club, courts, plan] = await Promise.all([
    prisma.club.findUniqueOrThrow({
      where: { id: opts.clubId },
      select: { timezone: true, opensAt: true, closesAt: true, settings: true },
    }),
    prisma.court.findMany({
      where: {
        clubId: opts.clubId,
        isActive: true,
        ...(opts.courtType ? { type: opts.courtType } : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { pricing: true },
    }),
    opts.planId
      ? prisma.membershipPlan.findUnique({ where: { id: opts.planId } })
      : Promise.resolve(null),
  ]);

  const policy = policyFrom(club.settings);
  const tz = club.timezone;
  const openMin = hhmmToMinutes(club.opensAt);
  const closeMin = hhmmToMinutes(club.closesAt);

  const times: SlotGrid["times"] = [];
  for (let m = openMin; m + policy.sessionMinutes <= closeMin; m += policy.slotStepMinutes) {
    times.push({ minuteOfDay: m, label: minutesToLabel(m) });
  }

  const dayStarts = opts.dateKeys.map((k) => dayStart(k, tz));
  const windowStart = new Date(Math.min(...dayStarts.map((d) => d.getTime())));
  const windowEnd = new Date(Math.max(...dayStarts.map((d) => d.getTime())) + 24 * 60 * 60_000);
  const allBookings = await prisma.booking.findMany({
    where: {
      clubId: opts.clubId,
      courtId: { in: courts.map((c) => c.id) },
      status: { in: ["CONFIRMED", "COMPLETED"] },
      startsAt: { lt: windowEnd },
      endsAt: { gt: windowStart },
    },
    select: bookingSelect,
  });

  return opts.dateKeys.map((dateKey, i) => {
    const start = dayStarts[i];
    const dayEnd = new Date(start.getTime() + 24 * 60 * 60_000);
    const bookings = allBookings.filter((b) => b.startsAt < dayEnd && b.endsAt > start);
    return buildDayGrid({ ...opts, dateKey }, { tz, policy, times, start, courts, plan, bookings, now });
  });
}

type DayBooking = {
  id: string;
  courtId: string;
  startsAt: Date;
  endsAt: Date;
  kind: BookingKind;
  memberId: string | null;
  walkInName: string | null;
  checkedInAt: Date | null;
  priceCharged: number;
  member: { firstName: string; lastName: string } | null;
};

function buildDayGrid(
  opts: GridOptions,
  ctx: {
    tz: string;
    policy: ReturnType<typeof policyFrom>;
    times: SlotGrid["times"];
    start: Date;
    courts: Awaited<ReturnType<typeof prisma.court.findMany<{ include: { pricing: true } }>>>;
    plan: Awaited<ReturnType<typeof prisma.membershipPlan.findUnique>>;
    bookings: DayBooking[];
    now: Date;
  },
): SlotGrid {
  const { tz, policy, times, start, courts, plan, bookings, now } = ctx;

  const rows: CourtRow[] = courts.map((court) => {
    const courtBookings = bookings.filter((b) => b.courtId === court.id);
    const slots: Slot[] = times.map((t) => {
      const startsAt = new Date(start.getTime() + t.minuteOfDay * 60_000);
      const endsAt = new Date(startsAt.getTime() + policy.sessionMinutes * 60_000);
      const price = quote(court.pricing, plan, startsAt, tz);

      const overlapping = courtBookings.find((b) => b.startsAt < endsAt && b.endsAt > startsAt);

      let state: SlotState = "free";
      let booking: Slot["booking"];
      if (overlapping) {
        const isMine = !!opts.viewerMemberId && overlapping.memberId === opts.viewerMemberId;
        state = isMine ? "mine" : overlapping.kind === "SOCIAL" ? "social" : "booked";
        const name = overlapping.member
          ? `${overlapping.member.firstName} ${overlapping.member.lastName}`.trim()
          : overlapping.walkInName ?? "Walk-in";
        booking = {
          id: overlapping.id,
          kind: overlapping.kind,
          label: opts.revealNames || isMine ? name : "",
          memberId: overlapping.memberId,
          checkedIn: !!overlapping.checkedInAt,
          priceCharged: overlapping.priceCharged,
        };
      } else if (startsAt.getTime() < now.getTime()) {
        state = "past";
      }

      return { startsAt, endsAt, minuteOfDay: t.minuteOfDay, label: t.label, state, price, booking };
    });

    return { id: court.id, name: court.name, type: court.type, isIndoor: court.isIndoor, slots };
  });

  return { dateKey: opts.dateKey, timezone: tz, times, courts: rows };
}
