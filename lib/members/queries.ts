import "server-only";
import type { MemberStatus, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export type MemberFilter = "ALL" | "ACTIVE" | "EXPIRING" | "EXPIRED" | "TRIAL" | "LEAD";

export function daysUntil(date: Date | null, now = new Date()) {
  if (!date) return null;
  return Math.ceil((date.getTime() - now.getTime()) / 86_400_000);
}

export async function listMembers(clubId: string, opts: { q?: string; filter?: MemberFilter; take?: number }) {
  const now = new Date();
  const in14 = new Date(now.getTime() + 14 * 86_400_000);
  const where: Prisma.MemberWhereInput = { clubId };

  if (opts.q) {
    const q = opts.q.trim();
    where.OR = [
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
      { memberCode: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }
  switch (opts.filter) {
    case "ACTIVE":
      where.status = "ACTIVE";
      break;
    case "EXPIRING":
      where.status = "ACTIVE";
      where.expiryDate = { gte: now, lte: in14 };
      break;
    case "EXPIRED":
      where.OR = [{ status: "EXPIRED" }, { status: "ACTIVE", expiryDate: { lt: now } }];
      break;
    case "TRIAL":
      where.status = "TRIAL";
      break;
    case "LEAD":
      where.status = "LEAD";
      break;
  }

  const [rows, counts] = await Promise.all([
    prisma.member.findMany({
      where,
      include: { plan: { select: { name: true, tier: true } }, _count: { select: { bookings: true, checkIns: true } } },
      orderBy: [{ status: "asc" }, { expiryDate: "asc" }, { lastName: "asc" }],
      take: opts.take ?? 200,
    }),
    prisma.member.groupBy({ by: ["status"], where: { clubId }, _count: { _all: true } }),
  ]);
  const expiring = await prisma.member.count({ where: { clubId, status: "ACTIVE", expiryDate: { gte: now, lte: in14 } } });

  const byStatus = Object.fromEntries(counts.map((c) => [c.status, c._count._all])) as Partial<Record<MemberStatus, number>>;
  return { rows, counts: { total: rows.length, byStatus, expiring } };
}

export async function getMember360(clubId: string, memberId: string) {
  const now = new Date();
  const member = await prisma.member.findFirst({
    where: { id: memberId, clubId },
    include: {
      plan: true,
      user: { select: { id: true, email: true } },
      bookings: {
        include: { court: { select: { name: true, type: true } } },
        orderBy: { startsAt: "desc" },
        take: 12,
      },
      transactions: { orderBy: { createdAt: "desc" }, take: 20 },
      checkIns: { orderBy: { createdAt: "desc" }, take: 10 },
      memberNotes: { orderBy: { createdAt: "desc" }, take: 20 },
      orders: { orderBy: { createdAt: "desc" }, take: 5, select: { id: true, orderNo: true, total: true, status: true, createdAt: true } },
      tabs: { orderBy: { openedAt: "desc" }, take: 5, select: { id: true, tabNo: true, total: true, status: true, openedAt: true } },
      serviceJobs: { orderBy: { createdAt: "desc" }, take: 5 },
      lead: { select: { id: true, source: true, createdAt: true } },
    },
  });
  if (!member) return null;

  const [spend, visitsThisMonth, upcomingCount] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["source"],
      where: { memberId, direction: "IN" },
      _sum: { amount: true },
    }),
    prisma.checkIn.count({ where: { memberId, createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } } }),
    prisma.booking.count({ where: { memberId, status: "CONFIRMED", startsAt: { gte: now } } }),
  ]);
  const lifetimeSpend = spend.reduce((s, r) => s + (r._sum.amount ?? 0), 0);
  const spendBySource = Object.fromEntries(spend.map((r) => [r.source, r._sum.amount ?? 0]));

  return { member, lifetimeSpend, spendBySource, visitsThisMonth, upcomingCount, daysLeft: daysUntil(member.expiryDate, now) };
}

export async function getTodayCheckIns(clubId: string, dayStart: Date) {
  return prisma.checkIn.findMany({
    where: { clubId, createdAt: { gte: dayStart } },
    include: { member: { select: { id: true, firstName: true, lastName: true, memberCode: true, plan: { select: { name: true, tier: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function listPlans(clubId: string) {
  return prisma.membershipPlan.findMany({ where: { clubId, isActive: true }, orderBy: { priceMonthly: "desc" } });
}

export async function nextMemberCode(clubId: string) {
  const last = await prisma.member.findFirst({ where: { clubId }, orderBy: { hashId: "desc" }, select: { memberCode: true } });
  const n = last ? parseInt(last.memberCode.replace(/\D/g, ""), 10) + 1 : 1;
  return `CC-${String(n).padStart(4, "0")}`;
}
