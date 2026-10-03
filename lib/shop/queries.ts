import { prisma } from "@/lib/db";

const productSelect = { id: true, sku: true, name: true, description: true, category: true, price: true, costPrice: true, taxRatePct: true, imageUrl: true, isService: true, trackStock: true, stockQty: true, lowStockAt: true, isActive: true, isForShop: true, isForBar: true } as const;

export async function getCatalogue(clubId: string, opts: { includeInactive?: boolean; includeServices?: boolean } = {}) {
  return prisma.product.findMany({
    where: { clubId, isForShop: true, ...(opts.includeInactive ? {} : { isActive: true }), ...(opts.includeServices ? {} : { isService: false }) },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    select: productSelect,
  });
}
export type CatalogueItem = Awaited<ReturnType<typeof getCatalogue>>[number];

export async function getInventory(clubId: string) {
  const products = await prisma.product.findMany({ where: { clubId, isActive: true, trackStock: true }, orderBy: [{ category: "asc" }, { name: "asc" }], select: productSelect });
  const low = products.filter((p) => p.stockQty <= p.lowStockAt);
  const value = products.reduce((s, p) => s + (p.costPrice ?? 0) * Math.max(p.stockQty, 0), 0);
  return { products, low, value };
}

export async function getMovements(clubId: string, take = 40) {
  return prisma.stockMovement.findMany({ where: { clubId }, orderBy: { createdAt: "desc" }, take, include: { product: { select: { name: true, sku: true } } } });
}

const orderInclude = { items: true, member: { select: { firstName: true, lastName: true, phone: true, memberCode: true } } } as const;

export async function getOrderQueue(clubId: string) {
  const [active, recent] = await Promise.all([
    prisma.shopOrder.findMany({ where: { clubId, channel: "ONLINE", status: { in: ["PAID", "PREPARING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY"] } }, orderBy: { createdAt: "asc" }, include: orderInclude }),
    prisma.shopOrder.findMany({ where: { clubId, status: { in: ["COMPLETED", "CANCELLED"] } }, orderBy: { updatedAt: "desc" }, take: 12, include: orderInclude }),
  ]);
  return { active, recent };
}
export type QueueOrder = Awaited<ReturnType<typeof getOrderQueue>>["active"][number];

export async function getMemberOrders(memberId: string) {
  return prisma.shopOrder.findMany({ where: { memberId }, orderBy: { createdAt: "desc" }, take: 30, include: { items: true } });
}
export type MemberOrder = Awaited<ReturnType<typeof getMemberOrders>>[number];

export async function getServiceQueue(clubId: string) {
  const [open, done] = await Promise.all([
    prisma.serviceJob.findMany({ where: { clubId, status: { not: "COLLECTED" } }, orderBy: { dueAt: "asc" } }),
    prisma.serviceJob.findMany({ where: { clubId, status: "COLLECTED" }, orderBy: { collectedAt: "desc" }, take: 8 }),
  ]);
  const services = await prisma.product.findMany({ where: { clubId, isService: true, isActive: true }, select: { id: true, name: true, price: true } });
  return { open, done, services };
}
export type ServiceJobRow = Awaited<ReturnType<typeof getServiceQueue>>["open"][number];

export async function getTodayShopStats(clubId: string, dayStart: Date) {
  const [sales, orders] = await Promise.all([
    prisma.transaction.aggregate({ where: { clubId, source: "SHOP", direction: "IN", createdAt: { gte: dayStart } }, _sum: { amount: true }, _count: true }),
    prisma.shopOrder.count({ where: { clubId, channel: "ONLINE", status: { in: ["PAID", "PREPARING"] } } }),
  ]);
  return { revenue: sales._sum.amount ?? 0, txns: sales._count, pendingOnline: orders };
}

export async function getMemberShopContext(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { clubId: true, member: { select: { id: true, firstName: true, lastName: true, phone: true, plan: { select: { name: true, shopDiscountPct: true } } } } } });
  if (!user) return null;
  return { clubId: user.clubId, member: user.member, discountPct: user.member?.plan?.shopDiscountPct ?? 0 };
}
