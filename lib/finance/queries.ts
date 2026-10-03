import "server-only";
import type { PaymentMode, Prisma, TxDirection, TxSource } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { addDaysToKey, dayStart, hhmmToMinutes, toDateKey, toLocalParts, todayKey } from "@/lib/time";

export type Period = "today" | "week" | "month";

export interface PeriodRange {
  period: Period;
  from: Date;
  to: Date;
  prevFrom: Date;
  prevTo: Date;
  label: string;
  prevLabel: string;
  days: number;
}

/** Club-local calendar periods: today, Monday-to-now, 1st-to-now, each with the equivalent previous window. */
export function periodRange(period: Period, tz: string, now = new Date()): PeriodRange {
  const today = todayKey(tz);
  const todayStart = dayStart(today, tz);
  const tomorrow = dayStart(addDaysToKey(today, 1), tz);
  const parts = toLocalParts(now, tz);

  if (period === "today") {
    return { period, from: todayStart, to: tomorrow, prevFrom: dayStart(addDaysToKey(today, -1), tz), prevTo: todayStart, label: "Today", prevLabel: "yesterday", days: 1 };
  }
  if (period === "week") {
    const dow = (parts.weekday + 6) % 7; // Monday = 0
    const weekStartKey = addDaysToKey(today, -dow);
    const from = dayStart(weekStartKey, tz);
    return { period, from, to: tomorrow, prevFrom: dayStart(addDaysToKey(weekStartKey, -7), tz), prevTo: from, label: "This week", prevLabel: "last week", days: dow + 1 };
  }
  const monthStartKey = `${parts.year}-${String(parts.month).padStart(2, "0")}-01`;
  const from = dayStart(monthStartKey, tz);
  const prevMonth = parts.month === 1 ? { y: parts.year - 1, m: 12 } : { y: parts.year, m: parts.month - 1 };
  const prevFrom = dayStart(`${prevMonth.y}-${String(prevMonth.m).padStart(2, "0")}-01`, tz);
  return { period, from, to: tomorrow, prevFrom, prevTo: from, label: "This month", prevLabel: "last month", days: parts.day };
}

// ───────────────────────── Revenue ─────────────────────────

export const SOURCE_LABEL: Record<TxSource, string> = {
  COURT: "Courts",
  SHOP: "Shop",
  BAR: "Bar & café",
  MEMBERSHIP: "Memberships",
  COACHING: "Coaching",
  EVENT: "Events",
  CORPORATE: "Corporate",
  REFUND: "Refunds",
  PAYROLL: "Payroll",
  SUPPLIER: "Suppliers",
  OTHER: "Other",
};

export const MODE_LABEL: Record<PaymentMode, string> = { CASH: "Cash", CARD: "Card", UPI: "UPI", ONLINE: "Online", CREDIT: "Credit", COMPLIMENTARY: "Comp" };

export interface RevenueSummary {
  revenue: number;
  tax: number;
  outgoings: number;
  net: number;
  count: number;
  bySource: { source: TxSource; amount: number; count: number }[];
  byMode: { mode: PaymentMode; amount: number; count: number }[];
  matrix: Record<string, Record<string, number>>; // source → mode → amount
}

export async function getRevenueSummary(clubId: string, from: Date, to: Date): Promise<RevenueSummary> {
  const rows = await prisma.transaction.groupBy({
    by: ["source", "paymentMode", "direction"],
    where: { clubId, createdAt: { gte: from, lt: to } },
    _sum: { amount: true, tax: true },
    _count: { _all: true },
  });

  const bySource = new Map<TxSource, { amount: number; count: number }>();
  const byMode = new Map<PaymentMode, { amount: number; count: number }>();
  const matrix: Record<string, Record<string, number>> = {};
  let revenue = 0;
  let tax = 0;
  let outgoings = 0;
  let count = 0;

  for (const r of rows) {
    const amt = r._sum.amount ?? 0;
    if (r.direction === "OUT") {
      outgoings += amt;
      continue;
    }
    // Complimentary rows are zero-value; they still count as activity but never as money.
    revenue += amt;
    tax += r._sum.tax ?? 0;
    count += r._count._all;
    const s = bySource.get(r.source) ?? { amount: 0, count: 0 };
    bySource.set(r.source, { amount: s.amount + amt, count: s.count + r._count._all });
    const m = byMode.get(r.paymentMode) ?? { amount: 0, count: 0 };
    byMode.set(r.paymentMode, { amount: m.amount + amt, count: m.count + r._count._all });
    matrix[r.source] ??= {};
    matrix[r.source][r.paymentMode] = (matrix[r.source][r.paymentMode] ?? 0) + amt;
  }

  return {
    revenue,
    tax,
    outgoings,
    net: revenue - outgoings,
    count,
    bySource: Array.from(bySource, ([source, v]) => ({ source, ...v })).sort((a, b) => b.amount - a.amount),
    byMode: Array.from(byMode, ([mode, v]) => ({ mode, ...v })).sort((a, b) => b.amount - a.amount),
    matrix,
  };
}

export interface DayPoint {
  dateKey: string;
  label: string;
  total: number;
  [source: string]: number | string;
}

/** Daily revenue by source for a line/area chart. Always returns every day in range, zero-filled. */
export async function getDailyRevenue(clubId: string, from: Date, to: Date, tz: string): Promise<DayPoint[]> {
  const txns = await prisma.transaction.findMany({ where: { clubId, direction: "IN", createdAt: { gte: from, lt: to } }, select: { amount: true, source: true, createdAt: true } });
  const byDay = new Map<string, DayPoint>();
  const fmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: tz });
  for (let k = toDateKey(from, tz); dayStart(k, tz) < to; k = addDaysToKey(k, 1)) {
    byDay.set(k, { dateKey: k, label: fmt.format(dayStart(k, tz)), total: 0 });
  }
  for (const t of txns) {
    const k = toDateKey(t.createdAt, tz);
    const p = byDay.get(k);
    if (!p) continue;
    p.total += t.amount;
    p[t.source] = ((p[t.source] as number) ?? 0) + t.amount;
  }
  return Array.from(byDay.values());
}

// ───────────────────────── KPIs ─────────────────────────

export interface Kpis {
  bookings: number;
  utilisationPct: number;
  newMembers: number;
  barCovers: number;
  avgTicket: number;
}

export async function getKpis(clubId: string, from: Date, to: Date): Promise<Kpis> {
  const now = new Date();
  const measureTo = to < now ? to : now;
  const [club, courts, bookings, newMembers, tabs, inCount] = await Promise.all([
    prisma.club.findUniqueOrThrow({ where: { id: clubId }, select: { opensAt: true, closesAt: true } }),
    prisma.court.count({ where: { clubId, isActive: true } }),
    prisma.booking.findMany({ where: { clubId, status: { in: ["CONFIRMED", "COMPLETED"] }, startsAt: { gte: from, lt: to } }, select: { startsAt: true, endsAt: true } }),
    prisma.member.count({ where: { clubId, createdAt: { gte: from, lt: to }, status: { in: ["ACTIVE", "TRIAL"] } } }),
    prisma.barTab.count({ where: { clubId, status: "SETTLED", settledAt: { gte: from, lt: to } } }),
    prisma.transaction.aggregate({ where: { clubId, direction: "IN", amount: { gt: 0 }, createdAt: { gte: from, lt: to } }, _avg: { amount: true } }),
  ]);
  const openMinutes = Math.max(0, hhmmToMinutes(club.closesAt) - hhmmToMinutes(club.opensAt));
  const elapsedDays = Math.max(1 / 24, (measureTo.getTime() - from.getTime()) / 86_400_000);
  const availableHours = (courts * openMinutes * Math.min(elapsedDays, Math.ceil(elapsedDays))) / 60;
  const bookedHours = bookings.filter((b) => b.startsAt < measureTo).reduce((s, b) => s + (b.endsAt.getTime() - b.startsAt.getTime()) / 3_600_000, 0);
  return {
    bookings: bookings.length,
    utilisationPct: availableHours > 0 ? Math.min(100, Math.round((bookedHours / availableHours) * 100)) : 0,
    newMembers,
    barCovers: tabs,
    avgTicket: Math.round(inCount._avg.amount ?? 0),
  };
}

// ───────────────────────── Heatmap ─────────────────────────

export interface HeatmapRow {
  courtId: string;
  courtName: string;
  hours: { hour: number; count: number; pct: number }[];
}

export async function getUtilisationHeatmap(clubId: string, from: Date, to: Date, tz: string): Promise<{ rows: HeatmapRow[]; hours: number[]; days: number }> {
  const [club, courts, bookings] = await Promise.all([
    prisma.club.findUniqueOrThrow({ where: { id: clubId }, select: { opensAt: true, closesAt: true } }),
    prisma.court.findMany({ where: { clubId, isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.booking.findMany({ where: { clubId, status: { in: ["CONFIRMED", "COMPLETED"] }, startsAt: { gte: from, lt: to } }, select: { courtId: true, startsAt: true } }),
  ]);
  const openH = Math.floor(hhmmToMinutes(club.opensAt) / 60);
  const closeH = Math.ceil(hhmmToMinutes(club.closesAt) / 60);
  const hours = Array.from({ length: closeH - openH }, (_, i) => openH + i);
  const days = Math.max(1, Math.round((Math.min(to.getTime(), Date.now()) - from.getTime()) / 86_400_000));
  const counts = new Map<string, number>();
  for (const b of bookings) {
    const h = toLocalParts(b.startsAt, tz).hour;
    const k = `${b.courtId}:${h}`;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return {
    hours,
    days,
    rows: courts.map((c) => ({
      courtId: c.id,
      courtName: c.name,
      hours: hours.map((hour) => {
        const count = counts.get(`${c.id}:${hour}`) ?? 0;
        return { hour, count, pct: Math.min(100, Math.round((count / days) * 100)) };
      }),
    })),
  };
}

// ───────────────────────── Alerts ─────────────────────────

export async function getOwnerAlerts(clubId: string) {
  const now = new Date();
  const in14 = new Date(now.getTime() + 14 * 86_400_000);
  const in7 = new Date(now.getTime() + 7 * 86_400_000);
  const [expiring, lowStock, payablesDue, overdueInvoices, followUps, openTabs] = await Promise.all([
    prisma.member.count({ where: { clubId, status: "ACTIVE", expiryDate: { gte: now, lte: in14 } } }),
    prisma.product.findMany({ where: { clubId, isActive: true, trackStock: true }, select: { stockQty: true, lowStockAt: true } }).then((ps) => ps.filter((p) => p.stockQty <= p.lowStockAt).length),
    prisma.payable.aggregate({ where: { clubId, status: "PENDING", dueDate: { lte: in7 } }, _sum: { amount: true }, _count: { _all: true } }),
    prisma.invoice.aggregate({ where: { clubId, status: "ISSUED", dueDate: { lt: now } }, _sum: { total: true }, _count: { _all: true } }),
    prisma.lead.count({ where: { clubId, stage: { in: ["NEW", "CONTACTED", "QUOTE_SENT", "TRIAL_BOOKED"] }, nextFollowUp: { lte: now } } }),
    prisma.barTab.count({ where: { clubId, status: "OPEN" } }),
  ]);
  return {
    expiring,
    lowStock,
    payablesDue: { count: payablesDue._count._all, amount: payablesDue._sum.amount ?? 0 },
    overdueInvoices: { count: overdueInvoices._count._all, amount: overdueInvoices._sum.total ?? 0 },
    followUps,
    openTabs,
  };
}

// ───────────────────────── Ledger ─────────────────────────

export interface LedgerFilter {
  from?: Date;
  to?: Date;
  source?: TxSource;
  mode?: PaymentMode;
  direction?: TxDirection;
  q?: string;
  take?: number;
}

export async function listLedger(clubId: string, f: LedgerFilter) {
  const where: Prisma.TransactionWhereInput = {
    clubId,
    ...(f.from || f.to ? { createdAt: { ...(f.from ? { gte: f.from } : {}), ...(f.to ? { lt: f.to } : {}) } } : {}),
    ...(f.source ? { source: f.source } : {}),
    ...(f.mode ? { paymentMode: f.mode } : {}),
    ...(f.direction ? { direction: f.direction } : {}),
    ...(f.q ? { OR: [{ description: { contains: f.q, mode: "insensitive" } }, { reference: { contains: f.q, mode: "insensitive" } }] } : {}),
  };
  const [rows, agg] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: f.take ?? 200,
      select: { id: true, hashId: true, createdAt: true, source: true, direction: true, amount: true, tax: true, paymentMode: true, reference: true, refType: true, refId: true, description: true, member: { select: { firstName: true, lastName: true, memberCode: true } }, byUser: { select: { name: true } } },
    }),
    prisma.transaction.groupBy({ by: ["direction"], where, _sum: { amount: true, tax: true }, _count: { _all: true } }),
  ]);
  const inAgg = agg.find((a) => a.direction === "IN");
  const outAgg = agg.find((a) => a.direction === "OUT");
  return {
    rows,
    totals: { in: inAgg?._sum.amount ?? 0, tax: inAgg?._sum.tax ?? 0, out: outAgg?._sum.amount ?? 0, count: (inAgg?._count._all ?? 0) + (outAgg?._count._all ?? 0) },
  };
}

// ───────────────────────── Tax ─────────────────────────

export interface TaxCell {
  ratePct: number;
  taxable: number;
  tax: number;
  count: number;
}

/**
 * GST collected, grouped by effective rate and source. The ledger stores the
 * tax amount per transaction; the rate is recovered from tax ÷ taxable and
 * snapped to the nearest standard slab (0/5/12/18/28).
 */
export async function getTaxReport(clubId: string, from: Date, to: Date) {
  const txns = await prisma.transaction.findMany({ where: { clubId, direction: "IN", createdAt: { gte: from, lt: to }, amount: { gt: 0 } }, select: { amount: true, tax: true, source: true } });
  const byRate = new Map<number, TaxCell>();
  const bySource = new Map<TxSource, Map<number, TaxCell>>();
  let totalTax = 0;
  let totalTaxable = 0;
  for (const t of txns) {
    const taxable = t.amount - t.tax;
    const rate = snapRate(taxable > 0 ? (t.tax / taxable) * 100 : 0);
    totalTax += t.tax;
    totalTaxable += taxable;
    bump(byRate, rate, taxable, t.tax);
    const m = bySource.get(t.source) ?? new Map<number, TaxCell>();
    bump(m, rate, taxable, t.tax);
    bySource.set(t.source, m);
  }
  return {
    totalTax,
    totalTaxable,
    byRate: Array.from(byRate.values()).sort((a, b) => a.ratePct - b.ratePct),
    bySource: Array.from(bySource, ([source, m]) => ({ source, cells: Array.from(m.values()).sort((a, b) => a.ratePct - b.ratePct), tax: Array.from(m.values()).reduce((s, c) => s + c.tax, 0), taxable: Array.from(m.values()).reduce((s, c) => s + c.taxable, 0) })).sort((a, b) => b.tax - a.tax),
    count: txns.length,
  };
}

function bump(map: Map<number, TaxCell>, rate: number, taxable: number, tax: number) {
  const c = map.get(rate) ?? { ratePct: rate, taxable: 0, tax: 0, count: 0 };
  c.taxable += taxable;
  c.tax += tax;
  c.count += 1;
  map.set(rate, c);
}

const SLABS = [0, 5, 12, 18, 28];
function snapRate(r: number) {
  return SLABS.reduce((best, s) => (Math.abs(s - r) < Math.abs(best - r) ? s : best), SLABS[0]);
}

// ───────────────────────── Invoices & payables ─────────────────────────

export async function listInvoices(clubId: string, status?: "ISSUED" | "PAID" | "VOID") {
  const [rows, agg] = await Promise.all([
    prisma.invoice.findMany({ where: { clubId, ...(status ? { status } : {}) }, orderBy: { issueDate: "desc" }, take: 200, include: { member: { select: { memberCode: true } } } }),
    prisma.invoice.groupBy({ by: ["status"], where: { clubId }, _sum: { total: true }, _count: { _all: true } }),
  ]);
  const by = (s: string) => agg.find((a) => a.status === s);
  return {
    rows,
    summary: {
      outstanding: by("ISSUED")?._sum.total ?? 0,
      outstandingCount: by("ISSUED")?._count._all ?? 0,
      paid: by("PAID")?._sum.total ?? 0,
      overdue: await prisma.invoice.aggregate({ where: { clubId, status: "ISSUED", dueDate: { lt: new Date() } }, _sum: { total: true } }).then((a) => a._sum.total ?? 0),
    },
  };
}

export async function getInvoice(clubId: string, id: string) {
  return prisma.invoice.findFirst({ where: { id, clubId }, include: { items: { orderBy: { sortOrder: "asc" } }, member: { select: { id: true, memberCode: true, firstName: true, lastName: true, phone: true, email: true } }, transaction: { select: { reference: true, createdAt: true } } } });
}

export async function listPayables(clubId: string) {
  const now = new Date();
  const [pending, recent] = await Promise.all([
    prisma.payable.findMany({ where: { clubId, status: "PENDING" }, orderBy: { dueDate: "asc" }, include: { member: { select: { memberCode: true } } } }),
    prisma.payable.findMany({ where: { clubId, status: { in: ["PAID", "VOID"] } }, orderBy: { updatedAt: "desc" }, take: 30, include: { member: { select: { memberCode: true } } } }),
  ]);
  const sum = (rows: typeof pending) => rows.reduce((s, p) => s + p.amount, 0);
  const byKind = new Map<string, number>();
  for (const p of pending) byKind.set(p.kind, (byKind.get(p.kind) ?? 0) + p.amount);
  return {
    pending,
    recent,
    summary: {
      total: sum(pending),
      overdue: sum(pending.filter((p) => p.dueDate < now)),
      dueThisWeek: sum(pending.filter((p) => p.dueDate >= now && p.dueDate <= new Date(now.getTime() + 7 * 86_400_000))),
      byKind: Array.from(byKind, ([kind, amount]) => ({ kind, amount })).sort((a, b) => b.amount - a.amount),
    },
  };
}

export async function listReportShares(clubId: string) {
  return prisma.reportShare.findMany({ where: { clubId, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } });
}

export async function getReportShare(token: string) {
  return prisma.reportShare.findFirst({ where: { token, expiresAt: { gt: new Date() } }, include: { club: { select: { id: true, name: true, timezone: true } } } });
}

export function csvEscape(v: unknown) {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
