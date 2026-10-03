import "server-only";
import { prisma } from "@/lib/db";

export async function getMenu(clubId: string, opts: { includeUnavailable?: boolean } = {}) {
  return prisma.product.findMany({
    where: { clubId, isForBar: true, isActive: true, ...(opts.includeUnavailable ? {} : { isAvailable: true }) },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    select: { id: true, name: true, description: true, category: true, price: true, isAvailable: true, stockQty: true, trackStock: true, lowStockAt: true, imageUrl: true, taxRatePct: true, costPrice: true },
  });
}

export type MenuItem = Awaited<ReturnType<typeof getMenu>>[number];

export async function getFloor(clubId: string) {
  const [tables, openTabs] = await Promise.all([
    prisma.barTable.findMany({ where: { clubId, isActive: true }, orderBy: [{ zone: "asc" }, { sortOrder: "asc" }] }),
    prisma.barTab.findMany({
      where: { clubId, status: "OPEN" },
      include: {
        member: { select: { firstName: true, lastName: true } },
        items: { where: { kitchenStatus: { not: "CANCELLED" } }, select: { id: true, kitchenStatus: true, needsKitchen: true } },
      },
      orderBy: { openedAt: "asc" },
    }),
  ]);
  return { tables, openTabs };
}

export async function getTab(clubId: string, tabId: string) {
  return prisma.barTab.findFirst({
    where: { id: tabId, clubId },
    include: {
      table: true,
      member: { select: { id: true, firstName: true, lastName: true, memberCode: true, creditBalance: true, plan: { select: { name: true, tier: true } } } },
      items: { orderBy: { sentToKitchenAt: "asc" }, include: { product: { select: { category: true } } } },
      payments: true,
    },
  });
}

export type TabDetail = NonNullable<Awaited<ReturnType<typeof getTab>>>;

/** A member's own tabs: the one running now (if any) plus recent settled ones. */
export async function getMemberTabs(memberId: string) {
  const [open, history] = await Promise.all([
    prisma.barTab.findFirst({
      where: { memberId, status: "OPEN" },
      orderBy: { openedAt: "desc" },
      include: {
        table: { select: { name: true } },
        items: { where: { voidReason: null }, orderBy: { sentToKitchenAt: "asc" } },
      },
    }),
    prisma.barTab.findMany({
      where: { memberId, status: "SETTLED" },
      orderBy: { settledAt: "desc" },
      take: 12,
      include: {
        table: { select: { name: true } },
        items: { where: { voidReason: null }, select: { name: true, qty: true } },
        payments: { select: { mode: true, amount: true } },
      },
    }),
  ]);
  return { open, history };
}
export type MemberOpenTab = NonNullable<Awaited<ReturnType<typeof getMemberTabs>>["open"]>;
export type MemberSettledTab = Awaited<ReturnType<typeof getMemberTabs>>["history"][number];

export async function getKitchenTickets(clubId: string) {
  const items = await prisma.barTabItem.findMany({
    where: { tab: { clubId, status: "OPEN" }, needsKitchen: true, kitchenStatus: { in: ["NEW", "PREPARING", "READY"] } },
    include: { tab: { select: { id: true, tabNo: true, guestName: true, table: { select: { name: true } }, member: { select: { firstName: true } } } } },
    orderBy: { sentToKitchenAt: "asc" },
  });
  // Group by tab → one ticket per tab, oldest first.
  const map = new Map<string, { tabId: string; label: string; tabNo: string; firstAt: Date; items: typeof items }>();
  for (const it of items) {
    const key = it.tab.id;
    const label = it.tab.table?.name ?? it.tab.member?.firstName ?? it.tab.guestName ?? it.tab.tabNo;
    if (!map.has(key)) map.set(key, { tabId: key, label, tabNo: it.tab.tabNo, firstAt: it.sentToKitchenAt, items: [] });
    map.get(key)!.items.push(it);
  }
  return [...map.values()];
}

export async function getCurrentShift(clubId: string) {
  return prisma.shift.findFirst({ where: { clubId, area: "BAR", endsAt: null }, orderBy: { startsAt: "desc" } });
}

export async function getRecentShifts(clubId: string, take = 10) {
  return prisma.shift.findMany({ where: { clubId, area: "BAR", endsAt: { not: null } }, orderBy: { startsAt: "desc" }, take });
}

export async function getTableByToken(token: string) {
  return prisma.barTable.findUnique({ where: { qrToken: token }, include: { club: { select: { id: true, name: true, slug: true, phone: true } } } });
}

export async function searchMembers(clubId: string, q: string) {
  if (q.trim().length < 2) return [];
  return prisma.member.findMany({
    where: { clubId, OR: [{ firstName: { contains: q, mode: "insensitive" } }, { lastName: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }, { memberCode: { contains: q, mode: "insensitive" } }] },
    select: { id: true, firstName: true, lastName: true, memberCode: true, creditBalance: true, plan: { select: { name: true, shopDiscountPct: true, barDiscountPct: true } } },
    take: 8,
  });
}
