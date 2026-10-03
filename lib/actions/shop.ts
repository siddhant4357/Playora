"use server";

import { z } from "zod";
import { optionalPhoneSchema } from "@/lib/validation/phone";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { AuthError, requireRole, requireUser } from "@/lib/auth";
import { KernelError } from "@/lib/kernel";
import * as shop from "@/lib/shop/engine";
import type { OrderStatus, PaymentMode } from "@/generated/prisma/client";

export type ShopResult<T = undefined> = ({ success: true; message: string } & (T extends undefined ? { data?: undefined } : { data: T })) | { success: false; error: string };

function mapError(err: unknown): { success: false; error: string } {
  if (err instanceof KernelError) return { success: false, error: err.message };
  if (err instanceof z.ZodError) return { success: false, error: err.issues[0]?.message ?? "Invalid input." };
  if (err instanceof AuthError) return { success: false, error: err.code === "FORBIDDEN" ? "Not allowed." : "Please sign in." };
  console.error("[shop action]", err);
  return { success: false, error: "Something went wrong. Please try again." };
}

const SHOP_STAFF = ["FRONT_DESK", "MANAGER", "OWNER"] as const;

function revalidateShop() {
  for (const p of ["/shop-pos", "/shop-pos/orders", "/shop-pos/inventory", "/shop-pos/services", "/me/shop", "/me/orders"]) revalidatePath(p);
}

const Lines = z.array(z.object({ productId: z.string(), qty: z.number().int().min(1).max(50) })).min(1, "Add at least one item.");
const Payments = z.array(z.object({ mode: z.enum(["CASH", "CARD", "UPI", "CREDIT", "COMPLIMENTARY"]), amount: z.number().int().positive(), reference: z.string().max(60).optional() })).min(1, "Add a payment.");

export async function counterSaleAction(input: { memberId?: string | null; guestName?: string; lines: z.infer<typeof Lines>; payments: z.infer<typeof Payments> }): Promise<ShopResult<{ orderId: string; orderNo: string; total: number }>> {
  try {
    const user = await requireRole(...SHOP_STAFF);
    const lines = Lines.parse(input.lines);
    const payments = Payments.parse(input.payments);
    if (payments.some((p) => p.mode === "COMPLIMENTARY") && user.role === "FRONT_DESK") return { success: false, error: "Comping a sale needs a manager." };
    const order = await shop.counterSale({ clubId: user.clubId, memberId: input.memberId, guestName: input.guestName, lines, payments: payments.map((p) => ({ ...p, mode: p.mode as PaymentMode })), byUserId: user.userId });
    revalidateShop();
    return { success: true, message: `${order.orderNo} complete.`, data: { orderId: order.id, orderNo: order.orderNo, total: order.total } };
  } catch (err) {
    return mapError(err);
  }
}

const OnlineOrder = z.object({
  fulfilment: z.enum(["CLICK_COLLECT", "DELIVERY"]),
  deliveryAddress: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(300).optional(),
  lines: Lines,
});

export async function placeMemberOrderAction(input: z.infer<typeof OnlineOrder>): Promise<ShopResult<{ orderNo: string }>> {
  try {
    const user = await requireUser();
    const data = OnlineOrder.parse(input);
    const me = await prisma.user.findUnique({ where: { id: user.userId }, select: { memberId: true } });
    if (!me?.memberId) return { success: false, error: "Your account isn't linked to a membership yet. Ask the front desk." };
    const order = await shop.placeOnlineOrder({ clubId: user.clubId, memberId: me.memberId, fulfilment: data.fulfilment, deliveryAddress: data.deliveryAddress, lines: data.lines, notes: data.notes });
    revalidateShop();
    return { success: true, message: data.fulfilment === "DELIVERY" ? "Order placed. We'll deliver it to you." : "Order placed. We'll tell you when it's ready to collect.", data: { orderNo: order.orderNo } };
  } catch (err) {
    return mapError(err);
  }
}

export async function advanceOrderAction(input: { orderId: string; to: OrderStatus; reason?: string }): Promise<ShopResult> {
  try {
    const user = await requireRole(...SHOP_STAFF);
    if (input.to === "CANCELLED" && !input.reason?.trim()) return { success: false, error: "A reason is required to cancel." };
    await shop.advanceOrder({ clubId: user.clubId, orderId: input.orderId, to: input.to, reason: input.reason?.trim(), byUserId: user.userId });
    revalidateShop();
    const msg: Partial<Record<OrderStatus, string>> = { PREPARING: "Picking started.", READY_FOR_PICKUP: "Marked ready. Customer notified.", OUT_FOR_DELIVERY: "Out for delivery.", COMPLETED: "Order completed.", CANCELLED: "Order cancelled and stock returned." };
    return { success: true, message: msg[input.to] ?? "Updated." };
  } catch (err) {
    return mapError(err);
  }
}

const Adjust = z.object({ productId: z.string(), delta: z.number().int(), reason: z.enum(["RESTOCK", "ADJUSTMENT", "WASTAGE", "RETURN"]), note: z.string().trim().max(120).optional() });

export async function adjustStockAction(input: z.infer<typeof Adjust>): Promise<ShopResult> {
  try {
    const user = await requireRole(...SHOP_STAFF);
    const data = Adjust.parse(input);
    await shop.adjustStock({ clubId: user.clubId, ...data, byUserId: user.userId });
    revalidateShop();
    return { success: true, message: data.reason === "RESTOCK" ? `Restocked +${data.delta}.` : "Stock adjusted." };
  } catch (err) {
    return mapError(err);
  }
}

const ProductSchema = z.object({
  id: z.string().optional(),
  sku: z.string().trim().min(2).max(24).regex(/^[A-Z0-9-]+$/i, "SKU: letters, numbers, dashes."),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(300).optional(),
  category: z.enum(["RACKET", "BALL", "SHOES", "ACCESSORY", "APPAREL", "SERVICE"]),
  price: z.number().int().min(0),
  costPrice: z.number().int().min(0).optional(),
  taxRatePct: z.number().int().min(0).max(28).default(18),
  lowStockAt: z.number().int().min(0).default(5),
  trackStock: z.boolean().default(true),
  isService: z.boolean().default(false),
});

export async function upsertProductAction(input: z.infer<typeof ProductSchema>): Promise<ShopResult> {
  try {
    const user = await requireRole("MANAGER", "OWNER");
    const d = ProductSchema.parse(input);
    const data = { sku: d.sku.toUpperCase(), name: d.name, description: d.description ?? null, category: d.category, price: d.price, costPrice: d.costPrice ?? null, taxRatePct: d.taxRatePct, lowStockAt: d.lowStockAt, trackStock: d.isService ? false : d.trackStock, isService: d.isService, isForShop: true };
    if (d.id) {
      const r = await prisma.product.updateMany({ where: { id: d.id, clubId: user.clubId }, data });
      if (r.count === 0) return { success: false, error: "Product not found." };
    } else {
      await prisma.product.create({ data: { ...data, clubId: user.clubId } });
    }
    revalidateShop();
    return { success: true, message: d.id ? "Product updated." : "Product added." };
  } catch (err) {
    if (typeof err === "object" && err && "code" in err && (err as { code: string }).code === "P2002") return { success: false, error: "That SKU already exists." };
    return mapError(err);
  }
}

export async function archiveProductAction(input: { productId: string }): Promise<ShopResult> {
  try {
    const user = await requireRole("MANAGER", "OWNER");
    const r = await prisma.product.updateMany({ where: { id: input.productId, clubId: user.clubId }, data: { isActive: false } });
    if (r.count === 0) return { success: false, error: "Product not found." };
    revalidateShop();
    return { success: true, message: "Product archived." };
  } catch (err) {
    return mapError(err);
  }
}

const ServiceJob = z.object({
  productId: z.string(),
  memberId: z.string().nullable().optional(),
  customerName: z.string().trim().max(80).optional(),
  phone: optionalPhoneSchema,
  item: z.string().trim().min(2, "Describe the racket / item.").max(120),
  notes: z.string().trim().max(200).optional(),
  turnaroundHours: z.number().int().min(1).max(168).default(24),
  payments: Payments,
});

export async function createServiceJobAction(input: z.infer<typeof ServiceJob>): Promise<ShopResult<{ jobNo: string }>> {
  try {
    const user = await requireRole(...SHOP_STAFF);
    const d = ServiceJob.parse(input);
    const job = await shop.createServiceJob({ clubId: user.clubId, ...d, payments: d.payments.map((p) => ({ ...p, mode: p.mode as PaymentMode })), byUserId: user.userId });
    revalidateShop();
    return { success: true, message: `${job.jobNo} booked in.`, data: { jobNo: job.jobNo } };
  } catch (err) {
    return mapError(err);
  }
}

export async function advanceServiceJobAction(input: { jobId: string; to: "IN_PROGRESS" | "READY" | "COLLECTED" }): Promise<ShopResult> {
  try {
    const user = await requireRole(...SHOP_STAFF);
    await shop.advanceServiceJob({ clubId: user.clubId, ...input, byUserId: user.userId });
    revalidateShop();
    return { success: true, message: input.to === "READY" ? "Ready. Customer notified." : input.to === "COLLECTED" ? "Collected." : "In progress." };
  } catch (err) {
    return mapError(err);
  }
}
