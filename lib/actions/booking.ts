"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { AuthError, requireRole } from "@/lib/auth";
import { book, cancel, BookingError } from "@/lib/booking/engine";
import type { BookingSource, PaymentMode } from "@/generated/prisma/client";

export type BookingActionResult =
  | { success: true; message: string; bookingId?: string; priceCharged?: number }
  | { success: false; error: string };

function mapError(err: unknown): BookingActionResult {
  if (err instanceof BookingError) return { success: false, error: err.message };
  if (err instanceof AuthError) {
    return { success: false, error: err.code === "FORBIDDEN" ? "Not allowed." : "Please sign in." };
  }
  console.error("[booking action]", err);
  return { success: false, error: "Something went wrong. Please try again." };
}

function revalidateBookingViews() {
  revalidatePath("/me");
  revalidatePath("/me/book");
  revalidatePath("/me/bookings");
  revalidatePath("/desk");
  revalidatePath("/display");
}

// ───────────────────────── Member self-service ─────────────────────────

const MemberBookSchema = z.object({
  courtId: z.string().min(1),
  startsAt: z.string().datetime(),
});

export async function memberBookAction(input: {
  courtId: string;
  startsAt: string;
}): Promise<BookingActionResult> {
  try {
    const user = await requireRole("MEMBER");
    const data = MemberBookSchema.parse(input);
    const me = await prisma.user.findUnique({ where: { id: user.userId }, select: { memberId: true } });
    if (!me?.memberId) return { success: false, error: "Your login is not linked to a member record yet." };

    const result = await book({
      clubId: user.clubId,
      courtId: data.courtId,
      startsAt: new Date(data.startsAt),
      memberId: me.memberId,
      source: "WEB",
      createdById: user.userId,
    });
    revalidateBookingViews();
    return {
      success: true,
      message: `${result.courtName} booked. ${result.priceReason}.`,
      bookingId: result.bookingId,
      priceCharged: result.priceCharged,
    };
  } catch (err) {
    return mapError(err);
  }
}

export async function memberCancelAction(input: {
  bookingId: string;
  reason?: string;
}): Promise<BookingActionResult> {
  try {
    const user = await requireRole("MEMBER");
    const me = await prisma.user.findUnique({ where: { id: user.userId }, select: { memberId: true } });
    if (!me?.memberId) return { success: false, error: "Your login is not linked to a member record yet." };

    const result = await cancel({
      clubId: user.clubId,
      bookingId: input.bookingId,
      reason: input.reason,
      actingMemberId: me.memberId,
      actingUserId: user.userId,
    });
    revalidateBookingViews();
    const credit = result.creditIssued > 0 ? ` ${result.creditPct}% credited to your balance.` : "";
    return { success: true, message: `Booking cancelled.${credit}` };
  } catch (err) {
    return mapError(err);
  }
}

// ───────────────────────── Front desk ─────────────────────────

const STAFF_BOOKERS = ["FRONT_DESK", "MANAGER", "OWNER"] as const;

const DeskBookSchema = z
  .object({
    courtId: z.string().min(1),
    startsAt: z.string().datetime(),
    memberId: z.string().optional().nullable(),
    walkInName: z.string().trim().max(80).optional().nullable(),
    walkInPhone: z.string().trim().max(20).optional().nullable(),
    paymentMode: z.enum(["CASH", "CARD", "UPI", "ONLINE", "CREDIT", "COMPLIMENTARY"]).optional(),
    source: z.enum(["FRONT_DESK", "PHONE", "WHATSAPP"]).default("FRONT_DESK"),
  })
  .refine((d) => d.memberId || (d.walkInName && d.walkInName.length > 0), {
    message: "Pick a member or enter a walk-in name.",
  });

export async function deskBookAction(input: z.input<typeof DeskBookSchema>): Promise<BookingActionResult> {
  try {
    const user = await requireRole(...STAFF_BOOKERS);
    const parsed = DeskBookSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
    const data = parsed.data;

    const result = await book({
      clubId: user.clubId,
      courtId: data.courtId,
      startsAt: new Date(data.startsAt),
      memberId: data.memberId ?? null,
      walkIn: data.memberId ? null : { name: data.walkInName!, phone: data.walkInPhone ?? null },
      source: data.source as BookingSource,
      paymentMode: data.paymentMode as PaymentMode | undefined,
      createdById: user.userId,
    });
    revalidateBookingViews();
    return {
      success: true,
      message: `${result.courtName} booked. ${result.priceReason}.`,
      bookingId: result.bookingId,
      priceCharged: result.priceCharged,
    };
  } catch (err) {
    return mapError(err);
  }
}

export async function deskCancelAction(input: {
  bookingId: string;
  reason: string;
}): Promise<BookingActionResult> {
  try {
    const user = await requireRole(...STAFF_BOOKERS);
    if (!input.reason?.trim()) return { success: false, error: "A reason is required to cancel." };
    const result = await cancel({
      clubId: user.clubId,
      bookingId: input.bookingId,
      reason: input.reason.trim(),
      actingUserId: user.userId,
    });
    revalidateBookingViews();
    const credit = result.creditIssued > 0 ? ` ${result.creditPct}% credited to member.` : "";
    return { success: true, message: `Booking cancelled.${credit}` };
  } catch (err) {
    return mapError(err);
  }
}

export async function deskCheckInAction(input: { bookingId: string }): Promise<BookingActionResult> {
  try {
    const user = await requireRole(...STAFF_BOOKERS);
    const booking = await prisma.booking.findFirst({
      where: { id: input.bookingId, clubId: user.clubId, status: "CONFIRMED" },
    });
    if (!booking) return { success: false, error: "Booking not found." };
    await prisma.booking.update({
      where: { id: booking.id },
      data: { checkedInAt: booking.checkedInAt ? null : new Date() },
    });
    revalidateBookingViews();
    return { success: true, message: booking.checkedInAt ? "Check-in undone." : "Checked in." };
  } catch (err) {
    return mapError(err);
  }
}

/** Lightweight member lookup for the desk quick-book dialog. */
export async function searchMembersAction(q: string) {
  const user = await requireRole(...STAFF_BOOKERS);
  const term = q.trim();
  if (term.length < 2) return [];
  const rows = await prisma.member.findMany({
    where: {
      clubId: user.clubId,
      OR: [
        { firstName: { contains: term, mode: "insensitive" } },
        { lastName: { contains: term, mode: "insensitive" } },
        { phone: { contains: term } },
        { memberCode: { contains: term, mode: "insensitive" } },
      ],
    },
    take: 8,
    orderBy: { firstName: "asc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      memberCode: true,
      status: true,
      creditBalance: true,
      plan: { select: { id: true, name: true, tier: true, courtDiscountPct: true } },
    },
  });
  return rows;
}
