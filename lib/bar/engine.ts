/**
 * lib/bar/engine.ts
 *
 * One write path for the bar: open tab → add items (fires kitchen tickets)
 * → settle with split payments → close shift. The guest QR menu, the POS and
 * a future WhatsApp order all call the same functions, so stock, kitchen and
 * ledger stay consistent no matter where the order came from.
 */

import type { PaymentMode } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { KernelError, docNumber, logActivity, moveStock, postTransaction, totalLines, type Tx } from "@/lib/kernel";

export { KernelError as BarError };

// Concurrent orders on the same product serialize on its row lock; with a
// remote Postgres that can exceed Prisma's 5s default under a rush.
const TX_OPTS = { timeout: 20_000, maxWait: 10_000 };

async function recalc(tx: Tx, tabId: string) {
  const tab = await tx.barTab.findUnique({ where: { id: tabId }, include: { items: { where: { kitchenStatus: { not: "CANCELLED" } }, include: { product: { select: { taxRatePct: true } } } } } });
  if (!tab) throw new KernelError("NOT_FOUND", "Tab not found.");
  const t = totalLines(tab.items.map((i) => ({ unitPrice: i.unitPrice, qty: i.qty, taxRatePct: i.product.taxRatePct })), tab.discountPct);
  return tx.barTab.update({ where: { id: tabId }, data: t });
}

async function currentShift(tx: Tx, clubId: string) {
  return tx.shift.findFirst({ where: { clubId, area: "BAR", endsAt: null }, orderBy: { startsAt: "desc" } });
}

// ───────────────────────── Tabs ─────────────────────────

export async function openTab(input: { clubId: string; tableId?: string | null; memberId?: string | null; guestName?: string | null; guestPhone?: string | null; source?: "POS" | "QR"; byUserId?: string | null }) {
  return prisma.$transaction(async (tx) => {
    if (input.tableId) {
      const existing = await tx.barTab.findFirst({ where: { tableId: input.tableId, status: "OPEN" }, select: { id: true } });
      if (existing) return existing.id; // one open tab per table — reuse it
    }
    const shift = await currentShift(tx, input.clubId);
    // tabNo is derived from the row's own autoincrement after insert: unique
    // under concurrency and immune to deletions, unlike count()+1.
    const created = await tx.barTab.create({
      data: {
        clubId: input.clubId,
        tabNo: `pending-${crypto.randomUUID()}`,
        tableId: input.tableId ?? null,
        memberId: input.memberId ?? null,
        guestName: input.guestName ?? null,
        guestPhone: input.guestPhone ?? null,
        source: input.source ?? "POS",
        openedById: input.byUserId ?? null,
        shiftId: shift?.id ?? null,
      },
    });
    const tab = await tx.barTab.update({ where: { id: created.id }, data: { tabNo: docNumber("TAB", created.hashId) } });
    return tab.id;
  });
}

export async function addItems(input: { clubId: string; tabId: string; lines: { productId: string; qty: number; modifiers?: string[]; notes?: string }[]; byUserId?: string | null }) {
  if (input.lines.length === 0) throw new KernelError("EMPTY", "Nothing to add.");
  return prisma.$transaction(async (tx) => {
    const tab = await tx.barTab.findFirst({ where: { id: input.tabId, clubId: input.clubId } });
    if (!tab) throw new KernelError("NOT_FOUND", "Tab not found.");
    if (tab.status !== "OPEN") throw new KernelError("CLOSED", "This tab is already settled.");

    const products = await tx.product.findMany({ where: { id: { in: input.lines.map((l) => l.productId) }, clubId: input.clubId, isForBar: true, isActive: true } });
    for (const line of input.lines) {
      const p = products.find((x) => x.id === line.productId);
      if (!p) throw new KernelError("NOT_FOUND", "Item is not on the menu.");
      if (!p.isAvailable) throw new KernelError("UNAVAILABLE", `${p.name} is 86'd right now.`);
      if (!Number.isInteger(line.qty) || line.qty < 1 || line.qty > 50) throw new KernelError("BAD_QTY", "Quantity must be 1–50.");
      const needsKitchen = p.category === "FOOD";
      await tx.barTabItem.create({
        data: {
          tabId: tab.id,
          productId: p.id,
          name: p.name,
          qty: line.qty,
          unitPrice: p.price,
          modifiers: line.modifiers ?? [],
          notes: line.notes ?? null,
          needsKitchen,
          kitchenStatus: needsKitchen ? "NEW" : "SERVED",
          servedAt: needsKitchen ? null : new Date(),
        },
      });
      // Bar stock is decremented at order time so the 86 list stays honest.
      await moveStock(tx, { clubId: input.clubId, productId: p.id, delta: -line.qty, reason: "SALE", refType: "BarTab", refId: tab.id, byUserId: input.byUserId });
    }
    await recalc(tx, tab.id);
    return tab.id;
  }, TX_OPTS);
}

export async function voidItem(input: { clubId: string; itemId: string; reason: string; byUserId?: string | null }) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.barTabItem.findFirst({ where: { id: input.itemId, tab: { clubId: input.clubId, status: "OPEN" } } });
    if (!item) throw new KernelError("NOT_FOUND", "Item not found on an open tab.");
    if (item.kitchenStatus === "CANCELLED") return item.tabId;
    await tx.barTabItem.update({ where: { id: item.id }, data: { kitchenStatus: "CANCELLED", voidReason: input.reason } });
    await moveStock(tx, { clubId: input.clubId, productId: item.productId, delta: item.qty, reason: "RETURN", refType: "BarTab", refId: item.tabId, note: `Void: ${input.reason}`, byUserId: input.byUserId, allowNegative: true });
    await recalc(tx, item.tabId);
    await logActivity(tx, { clubId: input.clubId, userId: input.byUserId, action: "BAR_ITEM_VOID", entity: "BarTabItem", entityId: item.id, meta: { reason: input.reason, name: item.name, qty: item.qty } });
    return item.tabId;
  });
}

export async function setDiscount(input: { clubId: string; tabId: string; discountPct: number; byUserId?: string | null }) {
  if (input.discountPct < 0 || input.discountPct > 100) throw new KernelError("BAD_DISCOUNT", "Discount must be 0–100%.");
  return prisma.$transaction(async (tx) => {
    const r = await tx.barTab.updateMany({ where: { id: input.tabId, clubId: input.clubId, status: "OPEN" }, data: { discountPct: input.discountPct } });
    if (r.count === 0) throw new KernelError("NOT_FOUND", "Open tab not found.");
    await recalc(tx, input.tabId);
  });
}

export async function moveTab(input: { clubId: string; tabId: string; tableId: string | null }) {
  const r = await prisma.barTab.updateMany({ where: { id: input.tabId, clubId: input.clubId, status: "OPEN" }, data: { tableId: input.tableId } });
  if (r.count === 0) throw new KernelError("NOT_FOUND", "Open tab not found.");
}

// ───────────────────────── Kitchen ─────────────────────────

export async function advanceKitchen(input: { clubId: string; itemId: string; to: "PREPARING" | "READY" | "SERVED" }) {
  const item = await prisma.barTabItem.findFirst({ where: { id: input.itemId, tab: { clubId: input.clubId } } });
  if (!item) throw new KernelError("NOT_FOUND", "Ticket not found.");
  const order = ["NEW", "PREPARING", "READY", "SERVED"];
  if (order.indexOf(input.to) <= order.indexOf(item.kitchenStatus)) return;
  await prisma.barTabItem.update({
    where: { id: item.id },
    data: { kitchenStatus: input.to, readyAt: input.to === "READY" ? new Date() : item.readyAt, servedAt: input.to === "SERVED" ? new Date() : null },
  });
}

/** Bump a whole ticket (all NEW/PREPARING food lines on a tab). */
export async function bumpTicket(input: { clubId: string; tabId: string; to: "PREPARING" | "READY" | "SERVED" }) {
  const from = input.to === "PREPARING" ? ["NEW"] : input.to === "READY" ? ["NEW", "PREPARING"] : ["READY"];
  await prisma.barTabItem.updateMany({
    where: { tabId: input.tabId, tab: { clubId: input.clubId }, needsKitchen: true, kitchenStatus: { in: from as never } },
    data: { kitchenStatus: input.to, ...(input.to === "READY" ? { readyAt: new Date() } : {}), ...(input.to === "SERVED" ? { servedAt: new Date() } : {}) },
  });
}

// ──��────────────────────── Settle ─────────────────────────

export async function settleTab(input: { clubId: string; tabId: string; payments: { mode: PaymentMode; amount: number; reference?: string }[]; byUserId?: string | null }) {
  return prisma.$transaction(async (tx) => {
    const tab = await recalc(tx, input.tabId);
    if (tab.clubId !== input.clubId) throw new KernelError("NOT_FOUND", "Tab not found.");
    if (tab.status !== "OPEN") throw new KernelError("CLOSED", "Already settled.");
    const paid = input.payments.reduce((s, p) => s + p.amount, 0);
    if (input.payments.some((p) => !Number.isInteger(p.amount) || p.amount <= 0)) throw new KernelError("BAD_AMOUNT", "Each payment must be a positive amount.");
    if (paid !== tab.total) throw new KernelError("UNBALANCED", `Payments (${paid}) must equal the tab total (${tab.total}).`);

    const credit = input.payments.filter((p) => p.mode === "CREDIT").reduce((s, p) => s + p.amount, 0);
    if (credit > 0) {
      if (!tab.memberId) throw new KernelError("NO_MEMBER", "Credit needs a member on the tab.");
      const r = await tx.member.updateMany({ where: { id: tab.memberId, creditBalance: { gte: credit } }, data: { creditBalance: { decrement: credit } } });
      if (r.count === 0) throw new KernelError("INSUFFICIENT_CREDIT", "Not enough member credit.");
    }

    for (const p of input.payments) {
      await tx.payment.create({ data: { tabId: tab.id, mode: p.mode, amount: p.amount, reference: p.reference ?? null, byUserId: input.byUserId ?? null } });
      await postTransaction(tx, {
        clubId: input.clubId,
        memberId: tab.memberId,
        source: "BAR",
        amount: p.amount,
        tax: input.payments.length === 1 ? tab.tax : Math.round((tab.tax * p.amount) / tab.total),
        paymentMode: p.mode,
        reference: p.reference,
        refType: "BarTab",
        refId: tab.id,
        description: `Bar tab ${tab.tabNo}${tab.guestName ? ` · ${tab.guestName}` : ""}`,
        byUserId: input.byUserId,
      });
    }
    const shift = tab.shiftId ? null : await currentShift(tx, input.clubId);
    await tx.barTab.update({ where: { id: tab.id }, data: { status: "SETTLED", settledAt: new Date(), shiftId: tab.shiftId ?? shift?.id ?? null } });
    await tx.barTabItem.updateMany({ where: { tabId: tab.id, kitchenStatus: { in: ["NEW", "PREPARING", "READY"] } }, data: { kitchenStatus: "SERVED", servedAt: new Date() } });
    return tab;
  }, TX_OPTS);
}

export async function voidTab(input: { clubId: string; tabId: string; reason: string; byUserId?: string | null }) {
  return prisma.$transaction(async (tx) => {
    const tab = await tx.barTab.findFirst({ where: { id: input.tabId, clubId: input.clubId, status: "OPEN" }, include: { items: { where: { kitchenStatus: { not: "CANCELLED" } } } } });
    if (!tab) throw new KernelError("NOT_FOUND", "Open tab not found.");
    for (const i of tab.items) {
      await moveStock(tx, { clubId: input.clubId, productId: i.productId, delta: i.qty, reason: "RETURN", refType: "BarTab", refId: tab.id, note: `Tab void: ${input.reason}`, byUserId: input.byUserId, allowNegative: true });
    }
    await tx.barTabItem.updateMany({ where: { tabId: tab.id }, data: { kitchenStatus: "CANCELLED" } });
    await tx.barTab.update({ where: { id: tab.id }, data: { status: "VOID", voidReason: input.reason, settledAt: new Date() } });
    await logActivity(tx, { clubId: input.clubId, userId: input.byUserId, action: "BAR_TAB_VOID", entity: "BarTab", entityId: tab.id, meta: { reason: input.reason, total: tab.total } });
  }, TX_OPTS);
}

// ───────────────────────── Shifts ─────────────────────────

export async function openShift(input: { clubId: string; userId: string; userName: string; openingCash: number }) {
  const open = await prisma.shift.findFirst({ where: { clubId: input.clubId, area: "BAR", endsAt: null } });
  if (open) throw new KernelError("SHIFT_OPEN", `A shift is already open (started by ${open.openedByName}).`);
  return prisma.shift.create({ data: { clubId: input.clubId, openedById: input.userId, openedByName: input.userName, openingCash: input.openingCash } });
}

export async function buildZReport(clubId: string, shiftId: string) {
  const shift = await prisma.shift.findFirst({ where: { id: shiftId, clubId } });
  if (!shift) throw new KernelError("NOT_FOUND", "Shift not found.");
  const end = shift.endsAt ?? new Date();
  const [tabs, payments, voids, topItems] = await Promise.all([
    prisma.barTab.findMany({ where: { clubId, status: "SETTLED", settledAt: { gte: shift.startsAt, lte: end } }, select: { subtotal: true, discount: true, tax: true, total: true } }),
    prisma.payment.groupBy({ by: ["mode"], where: { tab: { clubId, status: "SETTLED", settledAt: { gte: shift.startsAt, lte: end } } }, _sum: { amount: true } }),
    prisma.barTab.count({ where: { clubId, status: "VOID", settledAt: { gte: shift.startsAt, lte: end } } }),
    prisma.barTabItem.groupBy({
      by: ["name"],
      where: { tab: { clubId, status: "SETTLED", settledAt: { gte: shift.startsAt, lte: end } }, kitchenStatus: { not: "CANCELLED" } },
      _sum: { qty: true },
      orderBy: { _sum: { qty: "desc" } },
      take: 5,
    }),
  ]);
  const byMode = Object.fromEntries(payments.map((p) => [p.mode, p._sum.amount ?? 0])) as Record<string, number>;
  const gross = tabs.reduce((s, t) => s + t.total, 0);
  return {
    shiftId: shift.id,
    startsAt: shift.startsAt,
    endsAt: end,
    openedByName: shift.openedByName,
    openingCash: shift.openingCash,
    tabs: tabs.length,
    voids,
    gross,
    discount: tabs.reduce((s, t) => s + t.discount, 0),
    tax: tabs.reduce((s, t) => s + t.tax, 0),
    byMode,
    expectedCash: shift.openingCash + (byMode.CASH ?? 0),
    avgTab: tabs.length ? Math.round(gross / tabs.length) : 0,
    topItems: topItems.map((t) => ({ name: t.name, qty: t._sum.qty ?? 0 })),
  };
}

export async function closeShift(input: { clubId: string; shiftId: string; closingCash: number; notes?: string }) {
  const open = await prisma.barTab.count({ where: { clubId: input.clubId, status: "OPEN" } });
  if (open > 0) throw new KernelError("TABS_OPEN", `${open} tab${open > 1 ? "s are" : " is"} still open. Settle or void them first.`);
  const report = await buildZReport(input.clubId, input.shiftId);
  return prisma.shift.update({
    where: { id: input.shiftId },
    data: { endsAt: new Date(), closingCash: input.closingCash, expectedCash: report.expectedCash, notes: input.notes ?? null, report: JSON.parse(JSON.stringify(report)) },
  });
}
