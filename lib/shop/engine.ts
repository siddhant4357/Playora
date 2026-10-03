/**
 * lib/shop/engine.ts
 *
 * One write path for the pro shop. The counter POS, the member app and the
 * public catalogue all sell from the same Product row, so a racket sold at
 * the desk disappears from the online shelf in the same transaction.
 *
 * Counter sale  → order COMPLETED, stock out, ledger IN per payment.
 * Online order  → order PAID (stock reserved immediately), fulfilment flow
 *                 PREPARING → READY_FOR_PICKUP | OUT_FOR_DELIVERY → COMPLETED.
 * Cancel        → stock returned; if paid, a ledger OUT (refund) is posted.
 */

import type { Fulfilment, OrderStatus, PaymentMode } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { KernelError, docNumber, logActivity, moveStock, postTransaction, totalLines, type Tx } from "@/lib/kernel";

export { KernelError as ShopError };

const TX_OPTS = { timeout: 20_000, maxWait: 10_000 };
const MAX_QTY = 50;

export type Line = { productId: string; qty: number };
export type Payment = { mode: PaymentMode; amount: number; reference?: string };

async function memberDiscount(tx: Tx, clubId: string, memberId?: string | null) {
  if (!memberId) return { pct: 0, member: null };
  const member = await tx.member.findFirst({ where: { id: memberId, clubId }, select: { id: true, firstName: true, lastName: true, phone: true, plan: { select: { shopDiscountPct: true } } } });
  if (!member) throw new KernelError("NOT_FOUND", "Member not found.");
  return { pct: member.plan?.shopDiscountPct ?? 0, member };
}

async function priceLines(tx: Tx, clubId: string, lines: Line[]) {
  if (lines.length === 0) throw new KernelError("EMPTY", "Add at least one item.");
  for (const l of lines) {
    if (!Number.isInteger(l.qty) || l.qty < 1 || l.qty > MAX_QTY) throw new KernelError("BAD_QTY", `Quantity must be between 1 and ${MAX_QTY}.`);
  }
  const products = await tx.product.findMany({ where: { id: { in: lines.map((l) => l.productId) }, clubId, isForShop: true, isActive: true } });
  const byId = new Map(products.map((p) => [p.id, p]));
  return lines.map((l) => {
    const p = byId.get(l.productId);
    if (!p) throw new KernelError("NOT_FOUND", "Product not found.");
    return { product: p, qty: l.qty, unitPrice: p.price, taxRatePct: p.taxRatePct };
  });
}

function assertBalanced(payments: Payment[], total: number) {
  if (payments.length === 0) throw new KernelError("NO_PAYMENT", "Add a payment.");
  for (const p of payments) if (!Number.isInteger(p.amount) || p.amount <= 0) throw new KernelError("BAD_AMOUNT", "Payment amounts must be positive.");
  const paid = payments.reduce((s, p) => s + p.amount, 0);
  if (paid !== total) throw new KernelError("UNBALANCED", `Payments (${paid}) must equal the total (${total}).`);
}

// ───────────────────────── Counter sale ─────────────────────────

export async function counterSale(input: { clubId: string; memberId?: string | null; guestName?: string | null; lines: Line[]; payments: Payment[]; notes?: string; byUserId?: string | null }) {
  return prisma.$transaction(async (tx) => {
    const { pct, member } = await memberDiscount(tx, input.clubId, input.memberId);
    const priced = await priceLines(tx, input.clubId, input.lines);
    const totals = totalLines(priced, pct);
    assertBalanced(input.payments, totals.total);

    const created = await tx.shopOrder.create({
      data: {
        clubId: input.clubId,
        orderNo: `pending-${crypto.randomUUID()}`,
        memberId: member?.id ?? null,
        guestName: member ? null : input.guestName ?? null,
        channel: "COUNTER",
        fulfilment: "TAKEAWAY",
        status: "COMPLETED",
        discountPct: pct,
        ...totals,
        paymentMode: input.payments.length === 1 ? input.payments[0].mode : null,
        notes: input.notes ?? null,
        byUserId: input.byUserId ?? null,
        items: { create: priced.map((l) => ({ productId: l.product.id, name: l.product.name, qty: l.qty, unitPrice: l.unitPrice, total: l.unitPrice * l.qty })) },
      },
    });
    const order = await tx.shopOrder.update({ where: { id: created.id }, data: { orderNo: docNumber("SO", created.hashId) } });

    for (const l of priced) {
      await moveStock(tx, { clubId: input.clubId, productId: l.product.id, delta: -l.qty, reason: "SALE", refType: "ShopOrder", refId: order.id, byUserId: input.byUserId });
    }
    for (const p of input.payments) {
      await postTransaction(tx, { clubId: input.clubId, source: "SHOP", amount: p.amount, tax: Math.round((totals.tax * p.amount) / totals.total), paymentMode: p.mode, memberId: member?.id, refType: "ShopOrder", refId: order.id, reference: p.reference, description: `Counter sale ${order.orderNo}`, byUserId: input.byUserId });
    }
    await logActivity(tx, { clubId: input.clubId, userId: input.byUserId, action: "SHOP_SALE", entity: "ShopOrder", entityId: order.id, meta: { total: totals.total, items: priced.length, discountPct: pct } });
    return order;
  }, TX_OPTS);
}

// ───────────────────────── Online orders ─────────────────────────

export async function placeOnlineOrder(input: { clubId: string; memberId?: string | null; guest?: { name: string; phone: string; email?: string } | null; fulfilment: Exclude<Fulfilment, "TAKEAWAY">; deliveryAddress?: string | null; lines: Line[]; notes?: string }) {
  if (input.fulfilment === "DELIVERY" && !input.deliveryAddress?.trim()) throw new KernelError("NO_ADDRESS", "Delivery needs an address.");
  if (!input.memberId && !input.guest?.name) throw new KernelError("NO_CUSTOMER", "Tell us who the order is for.");

  return prisma.$transaction(async (tx) => {
    const { pct, member } = await memberDiscount(tx, input.clubId, input.memberId);
    const priced = await priceLines(tx, input.clubId, input.lines);
    if (priced.some((l) => l.product.isService)) throw new KernelError("SERVICE_ONLINE", "Services are booked at the counter.");
    const totals = totalLines(priced, pct);

    const created = await tx.shopOrder.create({
      data: {
        clubId: input.clubId,
        orderNo: `pending-${crypto.randomUUID()}`,
        memberId: member?.id ?? null,
        guestName: member ? null : input.guest?.name ?? null,
        guestPhone: member ? null : input.guest?.phone ?? null,
        guestEmail: member ? null : input.guest?.email ?? null,
        channel: "ONLINE",
        fulfilment: input.fulfilment,
        deliveryAddress: input.fulfilment === "DELIVERY" ? input.deliveryAddress!.trim() : null,
        status: "PAID",
        discountPct: pct,
        ...totals,
        paymentMode: "ONLINE",
        notes: input.notes ?? null,
        items: { create: priced.map((l) => ({ productId: l.product.id, name: l.product.name, qty: l.qty, unitPrice: l.unitPrice, total: l.unitPrice * l.qty })) },
      },
    });
    const order = await tx.shopOrder.update({ where: { id: created.id }, data: { orderNo: docNumber("SO", created.hashId) } });

    // Reserve stock now: the shelf is shared with the counter, so an online
    // order must not be undercut by a walk-in a minute later.
    for (const l of priced) {
      await moveStock(tx, { clubId: input.clubId, productId: l.product.id, delta: -l.qty, reason: "SALE", refType: "ShopOrder", refId: order.id, note: "Online order" });
    }
    const txn = await postTransaction(tx, { clubId: input.clubId, source: "SHOP", amount: totals.total, tax: totals.tax, paymentMode: "ONLINE", memberId: member?.id, refType: "ShopOrder", refId: order.id, description: `Online order ${order.orderNo}` });
    await tx.shopOrder.update({ where: { id: order.id }, data: { transactionId: txn.id } });
    await logActivity(tx, { clubId: input.clubId, action: "SHOP_ORDER_PLACED", entity: "ShopOrder", entityId: order.id, meta: { total: totals.total, fulfilment: input.fulfilment } });
    return order;
  }, TX_OPTS);
}

const NEXT: Record<string, OrderStatus[]> = {
  PAID: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "CANCELLED"],
  READY_FOR_PICKUP: ["COMPLETED"],
  OUT_FOR_DELIVERY: ["COMPLETED"],
};

export async function advanceOrder(input: { clubId: string; orderId: string; to: OrderStatus; reason?: string; byUserId?: string | null }) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.shopOrder.findFirst({ where: { id: input.orderId, clubId: input.clubId }, include: { items: true } });
    if (!order) throw new KernelError("NOT_FOUND", "Order not found.");
    const allowed = NEXT[order.status] ?? [];
    if (!allowed.includes(input.to)) throw new KernelError("BAD_TRANSITION", `Cannot move ${order.status} → ${input.to}.`);
    if (input.to === "READY_FOR_PICKUP" && order.fulfilment !== "CLICK_COLLECT") throw new KernelError("BAD_TRANSITION", "Only click & collect orders become ready for pickup.");
    if (input.to === "OUT_FOR_DELIVERY" && order.fulfilment !== "DELIVERY") throw new KernelError("BAD_TRANSITION", "Only delivery orders go out for delivery.");

    if (input.to === "CANCELLED") {
      for (const i of order.items) {
        await moveStock(tx, { clubId: input.clubId, productId: i.productId, delta: i.qty, reason: "RETURN", refType: "ShopOrder", refId: order.id, note: input.reason ?? "Order cancelled", byUserId: input.byUserId });
      }
      if (order.transactionId) {
        await postTransaction(tx, { clubId: input.clubId, source: "REFUND", direction: "OUT", amount: order.total, tax: order.tax, paymentMode: order.paymentMode ?? "ONLINE", memberId: order.memberId, refType: "ShopOrder", refId: order.id, description: `Refund ${order.orderNo}`, byUserId: input.byUserId });
      }
    }
    const updated = await tx.shopOrder.update({ where: { id: order.id }, data: { status: input.to, notes: input.reason ? `${order.notes ? order.notes + "\n" : ""}Cancelled: ${input.reason}` : order.notes } });
    await logActivity(tx, { clubId: input.clubId, userId: input.byUserId, action: `SHOP_ORDER_${input.to}`, entity: "ShopOrder", entityId: order.id, meta: { from: order.status } });
    return updated;
  }, TX_OPTS);
}

// ───────────────────────── Inventory ─────────────────────────

export async function adjustStock(input: { clubId: string; productId: string; delta: number; reason: "RESTOCK" | "ADJUSTMENT" | "WASTAGE" | "RETURN"; note?: string; byUserId?: string | null }) {
  if (!Number.isInteger(input.delta) || input.delta === 0) throw new KernelError("BAD_QTY", "Enter a non-zero whole number.");
  if (input.reason === "RESTOCK" && input.delta < 0) throw new KernelError("BAD_QTY", "Restock must add stock.");
  if (input.reason === "WASTAGE" && input.delta > 0) throw new KernelError("BAD_QTY", "Wastage must remove stock.");
  return prisma.$transaction(async (tx) => {
    const mv = await moveStock(tx, { ...input, allowNegative: false });
    await logActivity(tx, { clubId: input.clubId, userId: input.byUserId, action: `STOCK_${input.reason}`, entity: "Product", entityId: input.productId, meta: { delta: input.delta, note: input.note ?? null } });
    return mv;
  }, TX_OPTS);
}

// ───────────────────────── Service jobs (restringing) ─────────────────────────

export async function createServiceJob(input: { clubId: string; productId: string; memberId?: string | null; customerName?: string; phone?: string; item: string; notes?: string; turnaroundHours?: number; payments: Payment[]; byUserId?: string | null }) {
  return prisma.$transaction(async (tx) => {
    const svc = await tx.product.findFirst({ where: { id: input.productId, clubId: input.clubId, isService: true, isActive: true } });
    if (!svc) throw new KernelError("NOT_FOUND", "Service not found.");
    const { pct, member } = await memberDiscount(tx, input.clubId, input.memberId);
    const customerName = member ? `${member.firstName} ${member.lastName}` : input.customerName?.trim();
    const phone = member ? member.phone : input.phone?.trim();
    if (!customerName || !phone) throw new KernelError("NO_CUSTOMER", "Customer name and phone are required.");
    const price = Math.round(svc.price * (1 - pct / 100));
    assertBalanced(input.payments, price);

    const created = await tx.serviceJob.create({
      data: {
        clubId: input.clubId,
        jobNo: `pending-${crypto.randomUUID()}`,
        memberId: member?.id ?? null,
        customerName,
        phone,
        item: input.item.trim(),
        service: svc.name,
        price,
        dueAt: new Date(Date.now() + (input.turnaroundHours ?? 24) * 3_600_000),
        notes: input.notes ?? null,
      },
    });
    const job = await tx.serviceJob.update({ where: { id: created.id }, data: { jobNo: docNumber("JOB", created.hashId) } });
    for (const p of input.payments) {
      await postTransaction(tx, { clubId: input.clubId, source: "SHOP", amount: p.amount, tax: splitTax(p.amount, svc.taxRatePct), paymentMode: p.mode, memberId: member?.id, refType: "ServiceJob", refId: job.id, reference: p.reference, description: `${svc.name} ${job.jobNo}`, byUserId: input.byUserId });
    }
    await logActivity(tx, { clubId: input.clubId, userId: input.byUserId, action: "SERVICE_JOB_CREATED", entity: "ServiceJob", entityId: job.id, meta: { price, service: svc.name } });
    return job;
  }, TX_OPTS);
}

function splitTax(gross: number, ratePct: number) {
  return gross - Math.round((gross * 100) / (100 + ratePct));
}

const JOB_NEXT: Record<string, string[]> = { RECEIVED: ["IN_PROGRESS"], IN_PROGRESS: ["READY"], READY: ["COLLECTED"] };

export async function advanceServiceJob(input: { clubId: string; jobId: string; to: "IN_PROGRESS" | "READY" | "COLLECTED"; byUserId?: string | null }) {
  const job = await prisma.serviceJob.findFirst({ where: { id: input.jobId, clubId: input.clubId } });
  if (!job) throw new KernelError("NOT_FOUND", "Job not found.");
  if (!(JOB_NEXT[job.status] ?? []).includes(input.to)) throw new KernelError("BAD_TRANSITION", `Cannot move ${job.status} → ${input.to}.`);
  return prisma.serviceJob.update({ where: { id: job.id }, data: { status: input.to, readyAt: input.to === "READY" ? new Date() : job.readyAt, collectedAt: input.to === "COLLECTED" ? new Date() : null } });
}
