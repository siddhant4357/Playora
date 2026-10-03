import "server-only";
import type { LeadStage } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { getSlotGrid } from "@/lib/booking/slots";
import { addDaysToKey, todayKey, toLocalParts } from "@/lib/time";

export const leadCardSelect = {
  id: true,
  name: true,
  phone: true,
  email: true,
  interest: true,
  source: true,
  stage: true,
  nextFollowUp: true,
  quoteAmount: true,
  quoteBilling: true,
  createdAt: true,
  updatedAt: true,
  memberId: true,
  trialBookingId: true,
} as const;

export async function getPipeline(clubId: string) {
  const since = new Date(Date.now() - 30 * 86_400_000);
  const leads = await prisma.lead.findMany({
    where: { clubId, OR: [{ stage: { in: ["NEW", "CONTACTED", "QUOTE_SENT", "TRIAL_BOOKED"] } }, { updatedAt: { gte: since } }] },
    select: leadCardSelect,
    orderBy: [{ nextFollowUp: "asc" }, { createdAt: "desc" }],
  });
  const byStage = new Map<LeadStage, typeof leads>();
  for (const l of leads) byStage.set(l.stage, [...(byStage.get(l.stage) ?? []), l]);
  const now = Date.now();
  return {
    byStage,
    counts: {
      open: leads.filter((l) => l.stage !== "CONVERTED" && l.stage !== "LOST").length,
      overdue: leads.filter((l) => l.nextFollowUp && l.nextFollowUp.getTime() < now && l.stage !== "CONVERTED" && l.stage !== "LOST").length,
      converted30d: leads.filter((l) => l.stage === "CONVERTED").length,
    },
  };
}

export async function getLeadDetail(clubId: string, leadId: string) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, clubId },
    include: {
      activities: { orderBy: { createdAt: "desc" }, take: 50 },
      member: { select: { id: true, memberCode: true, firstName: true, lastName: true } },
    },
  });
  if (!lead) return null;
  const [trial, plan, userIds] = await Promise.all([
    lead.trialBookingId ? prisma.booking.findUnique({ where: { id: lead.trialBookingId }, select: { id: true, startsAt: true, endsAt: true, status: true, court: { select: { name: true } } } }) : null,
    lead.quotePlanId ? prisma.membershipPlan.findUnique({ where: { id: lead.quotePlanId }, select: { id: true, name: true, tier: true } }) : null,
    prisma.user.findMany({ where: { id: { in: Array.from(new Set(lead.activities.map((a) => a.byUserId).filter((x): x is string => Boolean(x)))) } }, select: { id: true, name: true } }),
  ]);
  const names = new Map(userIds.map((u) => [u.id, u.name]));
  return { ...lead, trial, quotePlan: plan, activities: lead.activities.map((a) => ({ ...a, byName: a.byUserId ? names.get(a.byUserId) ?? "Staff" : "Website" })) };
}

export async function getFollowUpsDue(clubId: string, limit = 5) {
  return prisma.lead.findMany({
    where: { clubId, stage: { in: ["NEW", "CONTACTED", "QUOTE_SENT", "TRIAL_BOOKED"] }, nextFollowUp: { lte: new Date() } },
    select: leadCardSelect,
    orderBy: { nextFollowUp: "asc" },
    take: limit,
  });
}

// ───────────────────────── Public website ─────────────────────────

export interface FreeSlotCard {
  dateKey: string;
  dayLabel: string;
  time: string;
  courtId: string;
  courtName: string;
  courtType: string;
  startsAt: string;
  listPrice: number;
}

/**
 * Evening slots that are genuinely free over the next seven days, for the
 * landing strip and the /courts page. Reads the same slot grid the desk uses.
 */
export async function getFreeThisWeek(clubId: string, opts: { days?: number; perDay?: number; fromMinute?: number; dedupeTimes?: boolean } = {}): Promise<FreeSlotCard[]> {
  const club = await prisma.club.findUniqueOrThrow({ where: { id: clubId }, select: { timezone: true } });
  const tz = club.timezone;
  const days = opts.days ?? 7;
  const perDay = opts.perDay ?? 2;
  const fromMinute = opts.fromMinute ?? 17 * 60;
  const dedupe = opts.dedupeTimes ?? true;
  const nowMin = nowMinuteOfDay(tz);
  const start = todayKey(tz);
  const keys = Array.from({ length: days }, (_, i) => addDaysToKey(start, i));
  const grids = await Promise.all(keys.map((dateKey) => getSlotGrid({ clubId, dateKey })));

  const out: FreeSlotCard[] = [];
  const fmtDay = new Intl.DateTimeFormat("en-IN", { weekday: "short", timeZone: tz });
  for (const grid of grids) {
    let taken = 0;
    const seenTimes = new Set<number>();
    const isToday = grid.dateKey === start;
    const candidates = grid.courts
      .flatMap((court) => court.slots.map((s) => ({ court, s })))
      .sort((a, b) => a.s.minuteOfDay - b.s.minuteOfDay || a.court.name.localeCompare(b.court.name));
    for (const { court, s } of candidates) {
      if (taken >= perDay) break;
      if (s.state !== "free" || s.minuteOfDay < fromMinute || (isToday && s.minuteOfDay <= nowMin)) continue;
      if (dedupe && seenTimes.has(s.minuteOfDay)) continue;
      seenTimes.add(s.minuteOfDay);
      taken += 1;
      out.push({
        dateKey: grid.dateKey,
        dayLabel: isToday ? "Today" : grid.dateKey === keys[1] ? "Tomorrow" : fmtDay.format(s.startsAt),
        time: s.label,
        courtId: court.id,
        courtName: court.name,
        courtType: court.type,
        startsAt: s.startsAt.toISOString(),
        listPrice: s.price.listPrice,
      });
    }
  }
  return out;
}

export async function getPublicCourts(clubId: string) {
  return prisma.court.findMany({ where: { clubId, isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, type: true, surface: true, isIndoor: true, pricing: { select: { dayType: true, startHour: true, endHour: true, walkInPrice: true, label: true } } } });
}

export async function getPublicPlans(clubId: string) {
  return prisma.membershipPlan.findMany({ where: { clubId, isActive: true }, orderBy: { priceMonthly: "desc" } });
}

export async function getPublicCatalogue(clubId: string) {
  return prisma.product.findMany({
    where: { clubId, isActive: true, isForShop: true, isService: false },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    select: { id: true, sku: true, name: true, description: true, category: true, price: true, stockQty: true, imageUrl: true, taxRatePct: true },
  });
}

export function nowMinuteOfDay(tz: string) {
  const p = toLocalParts(new Date(), tz);
  return p.hour * 60 + p.minute;
}
