"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { AuthError, requireRole } from "@/lib/auth";
import { KernelError, logActivity } from "@/lib/kernel";
import * as bar from "@/lib/bar/engine";
import { getTableByToken } from "@/lib/bar/queries";
import type { PaymentMode } from "@/generated/prisma/client";

export type BarResult<T = undefined> = ({ success: true; message: string } & (T extends undefined ? { data?: undefined } : { data: T })) | { success: false; error: string };

function mapError(err: unknown): { success: false; error: string } {
  if (err instanceof KernelError) return { success: false, error: err.message };
  if (err instanceof z.ZodError) return { success: false, error: err.issues[0]?.message ?? "Invalid input." };
  if (err instanceof AuthError) return { success: false, error: err.code === "FORBIDDEN" ? "Not allowed." : "Please sign in." };
  console.error("[bar action]", err);
  return { success: false, error: "Something went wrong. Please try again." };
}

const BAR = ["BAR_STAFF", "MANAGER", "OWNER"] as const;
const KITCHEN = ["KITCHEN", "BAR_STAFF", "MANAGER", "OWNER"] as const;

function revalidateBar(tabId?: string) {
  revalidatePath("/bar/pos");
  revalidatePath("/bar/tabs");
  revalidatePath("/bar/kds");
  if (tabId) revalidatePath(`/bar/tabs/${tabId}`);
}

const Lines = z.array(z.object({ productId: z.string().min(1), qty: z.number().int().min(1).max(50), modifiers: z.array(z.string()).optional(), notes: z.string().max(120).optional() })).min(1, "Add at least one item");

export async function openTabAction(input: { tableId?: string | null; memberId?: string | null; guestName?: string | null; guestPhone?: string | null }): Promise<BarResult<{ tabId: string }>> {
  try {
    const user = await requireRole(...BAR);
    const tabId = await bar.openTab({ clubId: user.clubId, ...input, source: "POS", byUserId: user.userId });
    revalidateBar(tabId);
    return { success: true, message: "Tab opened.", data: { tabId } };
  } catch (err) {
    return mapError(err);
  }
}

export async function sendOrderAction(input: { tabId?: string | null; tableId?: string | null; memberId?: string | null; guestName?: string | null; lines: z.infer<typeof Lines> }): Promise<BarResult<{ tabId: string }>> {
  try {
    const user = await requireRole(...BAR);
    const lines = Lines.parse(input.lines);
    const tabId = input.tabId ?? (await bar.openTab({ clubId: user.clubId, tableId: input.tableId, memberId: input.memberId, guestName: input.guestName, source: "POS", byUserId: user.userId }));
    await bar.addItems({ clubId: user.clubId, tabId, lines, byUserId: user.userId });
    revalidateBar(tabId);
    const food = lines.length;
    return { success: true, message: `${food} item${food > 1 ? "s" : ""} sent.`, data: { tabId } };
  } catch (err) {
    return mapError(err);
  }
}

export async function voidItemAction(input: { itemId: string; reason: string }): Promise<BarResult> {
  try {
    const user = await requireRole(...BAR);
    if (!input.reason.trim()) return { success: false, error: "A reason is required to void." };
    const tabId = await bar.voidItem({ clubId: user.clubId, itemId: input.itemId, reason: input.reason.trim(), byUserId: user.userId });
    revalidateBar(tabId);
    return { success: true, message: "Item voided." };
  } catch (err) {
    return mapError(err);
  }
}

export async function setDiscountAction(input: { tabId: string; discountPct: number }): Promise<BarResult> {
  try {
    const user = await requireRole("MANAGER", "OWNER", "BAR_STAFF");
    if (input.discountPct > 20 && user.role === "BAR_STAFF") return { success: false, error: "Discounts above 20% need a manager." };
    await bar.setDiscount({ clubId: user.clubId, tabId: input.tabId, discountPct: input.discountPct, byUserId: user.userId });
    revalidateBar(input.tabId);
    return { success: true, message: `Discount ${input.discountPct}% applied.` };
  } catch (err) {
    return mapError(err);
  }
}

export async function moveTabAction(input: { tabId: string; tableId: string | null }): Promise<BarResult> {
  try {
    const user = await requireRole(...BAR);
    await bar.moveTab({ clubId: user.clubId, ...input });
    revalidateBar(input.tabId);
    return { success: true, message: "Tab moved." };
  } catch (err) {
    return mapError(err);
  }
}

const Payments = z.array(z.object({ mode: z.enum(["CASH", "CARD", "UPI", "CREDIT", "COMPLIMENTARY"]), amount: z.number().int().positive(), reference: z.string().max(60).optional() })).min(1);

export async function settleTabAction(input: { tabId: string; payments: z.infer<typeof Payments> }): Promise<BarResult<{ total: number }>> {
  try {
    const user = await requireRole(...BAR);
    const payments = Payments.parse(input.payments);
    if (payments.some((p) => p.mode === "COMPLIMENTARY") && user.role === "BAR_STAFF") return { success: false, error: "Comping a tab needs a manager." };
    const tab = await bar.settleTab({ clubId: user.clubId, tabId: input.tabId, payments: payments.map((p) => ({ ...p, mode: p.mode as PaymentMode })), byUserId: user.userId });
    revalidateBar(input.tabId);
    revalidatePath("/bar/shift");
    return { success: true, message: `${tab.tabNo} settled.`, data: { total: tab.total } };
  } catch (err) {
    return mapError(err);
  }
}

export async function voidTabAction(input: { tabId: string; reason: string }): Promise<BarResult> {
  try {
    const user = await requireRole("MANAGER", "OWNER");
    if (!input.reason.trim()) return { success: false, error: "A reason is required." };
    await bar.voidTab({ clubId: user.clubId, tabId: input.tabId, reason: input.reason.trim(), byUserId: user.userId });
    revalidateBar(input.tabId);
    return { success: true, message: "Tab voided." };
  } catch (err) {
    return mapError(err);
  }
}

// ───────────────────────── Kitchen ─────────────────────────

export async function bumpTicketAction(input: { tabId: string; to: "PREPARING" | "READY" | "SERVED" }): Promise<BarResult> {
  try {
    const user = await requireRole(...KITCHEN);
    await bar.bumpTicket({ clubId: user.clubId, ...input });
    revalidateBar(input.tabId);
    return { success: true, message: input.to === "READY" ? "Ticket ready." : input.to === "SERVED" ? "Served." : "Started." };
  } catch (err) {
    return mapError(err);
  }
}

export async function advanceItemAction(input: { itemId: string; to: "PREPARING" | "READY" | "SERVED" }): Promise<BarResult> {
  try {
    const user = await requireRole(...KITCHEN);
    await bar.advanceKitchen({ clubId: user.clubId, ...input });
    revalidateBar();
    return { success: true, message: "Updated." };
  } catch (err) {
    return mapError(err);
  }
}

// ───────────────────────── Menu admin ─────────────────────────

export async function toggleAvailabilityAction(input: { productId: string; isAvailable: boolean }): Promise<BarResult> {
  try {
    const user = await requireRole(...BAR);
    const r = await prisma.product.updateMany({ where: { id: input.productId, clubId: user.clubId }, data: { isAvailable: input.isAvailable } });
    if (r.count === 0) return { success: false, error: "Item not found." };
    revalidatePath("/bar/menu");
    revalidatePath("/bar/pos");
    revalidatePath("/t", "layout");
    return { success: true, message: input.isAvailable ? "Back on the menu." : "Marked 86'd." };
  } catch (err) {
    return mapError(err);
  }
}

const MenuItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2),
  description: z.string().trim().max(200).optional(),
  category: z.enum(["FOOD", "BEVERAGE"]),
  price: z.number().int().min(0),
  costPrice: z.number().int().min(0).optional(),
  trackStock: z.boolean().default(false),
});

export async function upsertMenuItemAction(input: z.input<typeof MenuItemSchema>): Promise<BarResult> {
  try {
    const user = await requireRole("MANAGER", "OWNER");
    const d = MenuItemSchema.parse(input);
    if (d.id) {
      const r = await prisma.product.updateMany({ where: { id: d.id, clubId: user.clubId }, data: { name: d.name, description: d.description || null, category: d.category, price: d.price, costPrice: d.costPrice ?? null, trackStock: d.trackStock } });
      if (r.count === 0) return { success: false, error: "Item not found." };
    } else {
      const n = (await prisma.product.count({ where: { clubId: user.clubId, isForBar: true } })) + 1;
      await prisma.product.create({
        data: { clubId: user.clubId, sku: `${d.category === "FOOD" ? "FOOD" : "BEV"}-${Date.now().toString(36).toUpperCase()}${n}`, name: d.name, description: d.description || null, category: d.category, price: d.price, costPrice: d.costPrice ?? null, taxRatePct: 5, isForBar: true, isForShop: false, trackStock: d.trackStock, stockQty: 0 },
      });
    }
    revalidatePath("/bar/menu");
    revalidatePath("/bar/pos");
    return { success: true, message: d.id ? "Item updated." : "Item added to the menu." };
  } catch (err) {
    return mapError(err);
  }
}

export async function archiveMenuItemAction(input: { productId: string }): Promise<BarResult> {
  try {
    const user = await requireRole("MANAGER", "OWNER");
    await prisma.product.updateMany({ where: { id: input.productId, clubId: user.clubId }, data: { isActive: false } });
    revalidatePath("/bar/menu");
    return { success: true, message: "Item archived." };
  } catch (err) {
    return mapError(err);
  }
}

// ───────────────────────── Shift ─────────────────────────

export async function openShiftAction(input: { openingCash: number }): Promise<BarResult> {
  try {
    const user = await requireRole(...BAR);
    await bar.openShift({ clubId: user.clubId, userId: user.userId, userName: user.name, openingCash: Math.max(0, Math.round(input.openingCash)) });
    revalidatePath("/bar/shift");
    return { success: true, message: "Shift opened." };
  } catch (err) {
    return mapError(err);
  }
}

export async function closeShiftAction(input: { shiftId: string; closingCash: number; notes?: string }): Promise<BarResult> {
  try {
    const user = await requireRole(...BAR);
    const s = await bar.closeShift({ clubId: user.clubId, shiftId: input.shiftId, closingCash: Math.max(0, Math.round(input.closingCash)), notes: input.notes });
    await logActivity(prisma, { clubId: user.clubId, userId: user.userId, action: "SHIFT_CLOSED", entity: "Shift", entityId: s.id, meta: { expected: s.expectedCash, counted: s.closingCash } });
    revalidatePath("/bar/shift");
    const diff = (s.closingCash ?? 0) - (s.expectedCash ?? 0);
    return { success: true, message: diff === 0 ? "Shift closed. Cash balances." : `Shift closed. Cash ${diff > 0 ? "over" : "short"} by ₹${Math.abs(diff) / 100}.` };
  } catch (err) {
    return mapError(err);
  }
}

// ───────────────────────── Guest QR ordering (no login) ─────────────────────────

const GuestOrder = z.object({ token: z.string().min(1), guestName: z.string().trim().min(1, "Tell us your name").max(40), lines: Lines });

export async function guestOrderAction(input: z.input<typeof GuestOrder>): Promise<BarResult<{ tabId: string; tabNo: string }>> {
  try {
    const d = GuestOrder.parse(input);
    const table = await getTableByToken(d.token);
    if (!table || !table.isActive) return { success: false, error: "This table code is not active." };
    const tabId = await bar.openTab({ clubId: table.clubId, tableId: table.id, guestName: d.guestName, source: "QR" });
    await bar.addItems({ clubId: table.clubId, tabId, lines: d.lines });
    const tab = await prisma.barTab.findUnique({ where: { id: tabId }, select: { tabNo: true } });
    revalidateBar(tabId);
    return { success: true, message: "Order sent to the bar.", data: { tabId, tabNo: tab!.tabNo } };
  } catch (err) {
    return mapError(err);
  }
}

export async function getGuestTabAction(input: { token: string; tabId: string }) {
  const table = await getTableByToken(input.token);
  if (!table) return null;
  return prisma.barTab.findFirst({
    where: { id: input.tabId, tableId: table.id },
    select: { tabNo: true, status: true, total: true, items: { where: { kitchenStatus: { not: "CANCELLED" } }, select: { id: true, name: true, qty: true, unitPrice: true, kitchenStatus: true, needsKitchen: true } } },
  });
}
