/**
 * lib/kernel/index.ts
 *
 * Cross-module primitives shared by booking, bar, shop, members and leads.
 * Every module writes money through `postTransaction`, moves inventory
 * through `moveStock`, and records who-did-what through `logActivity`.
 * Keeping these in one place is what makes the Owner dashboard a single
 * query over one ledger instead of four reconciliations.
 */

import type { Prisma, PaymentMode, TxSource } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export type Tx = Prisma.TransactionClient;

export class KernelError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "KernelError";
  }
}

// ───────────────────────── Numbering ─────────────────────────

/** Human-friendly, date-stamped document numbers: ORD-20261003-0042 */
export function docNumber(prefix: string, seq: number, date = new Date()) {
  const d = date.toISOString().slice(0, 10).replace(/-/g, "");
  return `${prefix}-${d}-${String(seq).padStart(4, "0")}`;
}

// ───────────────────────── Ledger ─────────────────────────

export interface PostTransactionInput {
  clubId: string;
  source: TxSource;
  direction?: "IN" | "OUT";
  amount: number;
  tax?: number;
  paymentMode: PaymentMode;
  memberId?: string | null;
  refType?: string;
  refId?: string;
  reference?: string | null;
  description: string;
  byUserId?: string | null;
}

export async function postTransaction(tx: Tx, input: PostTransactionInput) {
  if (!Number.isInteger(input.amount) || input.amount < 0) {
    throw new KernelError("BAD_AMOUNT", "Amount must be a non-negative integer (paise).");
  }
  return tx.transaction.create({
    data: {
      clubId: input.clubId,
      memberId: input.memberId ?? null,
      source: input.source,
      direction: input.direction ?? "IN",
      amount: input.amount,
      tax: input.tax ?? 0,
      paymentMode: input.paymentMode,
      reference: input.reference ?? null,
      refType: input.refType ?? null,
      refId: input.refId ?? null,
      description: input.description,
      byUserId: input.byUserId ?? null,
    },
  });
}

// ───────────────────────── Inventory ─────────────────────────

export interface MoveStockInput {
  clubId: string;
  productId: string;
  delta: number;
  reason: "SALE" | "RESTOCK" | "ADJUSTMENT" | "RETURN" | "WASTAGE";
  refType?: string;
  refId?: string;
  note?: string;
  byUserId?: string | null;
  /** Allow stock to go negative (bar sells faster than it counts). Default false for shop. */
  allowNegative?: boolean;
}

/**
 * Atomically moves stock and records the movement. The UPDATE … WHERE guard
 * is what prevents two cashiers from selling the last racket at once.
 */
export async function moveStock(tx: Tx, input: MoveStockInput) {
  const product = await tx.product.findUnique({
    where: { id: input.productId },
    select: { id: true, name: true, trackStock: true, stockQty: true, clubId: true },
  });
  if (!product || product.clubId !== input.clubId) throw new KernelError("NOT_FOUND", "Product not found.");

  if (product.trackStock) {
    if (input.delta < 0 && !input.allowNegative) {
      const updated = await tx.product.updateMany({
        where: { id: product.id, stockQty: { gte: -input.delta } },
        data: { stockQty: { increment: input.delta } },
      });
      if (updated.count === 0) {
        throw new KernelError("OUT_OF_STOCK", `Only ${product.stockQty} × ${product.name} left.`);
      }
    } else {
      await tx.product.update({ where: { id: product.id }, data: { stockQty: { increment: input.delta } } });
    }
  }

  return tx.stockMovement.create({
    data: {
      clubId: input.clubId,
      productId: product.id,
      delta: input.delta,
      reason: input.reason,
      refType: input.refType ?? null,
      refId: input.refId ?? null,
      note: input.note ?? null,
      byUserId: input.byUserId ?? null,
    },
  });
}

// ───────────────────────── Audit ─────────────────────────

export async function logActivity(
  tx: Tx | typeof prisma,
  input: { clubId: string; userId?: string | null; action: string; entity: string; entityId?: string | null; meta?: Prisma.InputJsonValue }
) {
  return tx.activityLog.create({
    data: {
      clubId: input.clubId,
      userId: input.userId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      newData: input.meta ?? undefined,
    },
  });
}

// ───────────────────────── Tax helpers ─────────────────────────

/** Prices are tax-inclusive (Indian retail convention). Split out GST for the receipt. */
export function splitInclusiveTax(gross: number, ratePct: number) {
  const net = Math.round((gross * 100) / (100 + ratePct));
  return { net, tax: gross - net };
}

/** Totals for a list of lines, applying a % discount before tax split. */
export function totalLines(lines: { unitPrice: number; qty: number; taxRatePct?: number }[], discountPct = 0) {
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const discount = Math.round((subtotal * discountPct) / 100);
  const total = subtotal - discount;
  const tax = lines.reduce((s, l) => {
    const lineGross = l.unitPrice * l.qty * (1 - discountPct / 100);
    return s + splitInclusiveTax(Math.round(lineGross), l.taxRatePct ?? 18).tax;
  }, 0);
  return { subtotal, discount, tax, total };
}
