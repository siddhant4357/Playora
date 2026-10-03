"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { logActivity } from "@/lib/kernel";
import { DEFAULT_POLICY, policyFrom, type BookingPolicy } from "@/lib/booking/policy";

export type SettingsResult = { success: true; message: string } | { success: false; error: string };

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

const ProfileSchema = z
  .object({
    name: z.string().trim().min(2, "Club name is too short").max(80),
    tagline: z.string().trim().max(140).optional().or(z.literal("")),
    phone: z.string().trim().max(32).optional().or(z.literal("")),
    email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
    address: z.string().trim().max(240).optional().or(z.literal("")),
    timezone: z.string().trim().min(3).max(64),
    opensAt: z.string().regex(HHMM, "Use 24h HH:MM"),
    closesAt: z.string().regex(HHMM, "Use 24h HH:MM"),
  })
  .refine((v) => v.opensAt < v.closesAt, { message: "Opening time must be before closing time", path: ["closesAt"] })
  .refine(
    (v) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: v.timezone });
        return true;
      } catch {
        return false;
      }
    },
    { message: "Unknown IANA timezone", path: ["timezone"] }
  );

export type ProfileInput = z.input<typeof ProfileSchema>;

export async function updateClubProfileAction(input: ProfileInput): Promise<SettingsResult> {
  try {
    const user = await requireRole("OWNER");
    const parsed = ProfileSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    const v = parsed.data;

    await prisma.$transaction(async (tx) => {
      const before = await tx.club.findUniqueOrThrow({ where: { id: user.clubId }, select: { name: true, opensAt: true, closesAt: true, timezone: true } });
      await tx.club.update({
        where: { id: user.clubId },
        data: {
          name: v.name,
          tagline: v.tagline || null,
          phone: v.phone || null,
          email: v.email || null,
          address: v.address || null,
          timezone: v.timezone,
          opensAt: v.opensAt,
          closesAt: v.closesAt,
        },
      });
      await logActivity(tx, { clubId: user.clubId, userId: user.userId, action: "club.profile.updated", entity: "Club", entityId: user.clubId, meta: { before, after: { name: v.name, opensAt: v.opensAt, closesAt: v.closesAt, timezone: v.timezone } } });
    });

    revalidatePath("/", "layout");
    return { success: true, message: "Club profile saved." };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

const PolicySchema = z.object({
  sessionMinutes: z.coerce.number().int().min(30).max(180),
  slotStepMinutes: z.coerce.number().int().min(15).max(60),
  defaultAdvanceDays: z.coerce.number().int().min(0).max(60),
  defaultMaxPerDay: z.coerce.number().int().min(1).max(10),
  cancelFullCreditHours: z.coerce.number().int().min(0).max(72),
  cancelLateCreditPct: z.coerce.number().int().min(0).max(100),
  waitlistOfferMinutes: z.coerce.number().int().min(1).max(120),
});

export type PolicyInput = z.input<typeof PolicySchema>;

export async function updateBookingPolicyAction(input: PolicyInput): Promise<SettingsResult> {
  try {
    const user = await requireRole("OWNER");
    const parsed = PolicySchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    if (parsed.data.sessionMinutes % parsed.data.slotStepMinutes !== 0) {
      return { success: false, error: "Session length must be a multiple of the slot step." };
    }

    await prisma.$transaction(async (tx) => {
      const club = await tx.club.findUniqueOrThrow({ where: { id: user.clubId }, select: { settings: true } });
      const before: BookingPolicy = policyFrom(club.settings);
      const after: BookingPolicy = parsed.data;
      const current = (club.settings && typeof club.settings === "object" ? club.settings : {}) as Record<string, unknown>;
      await tx.club.update({ where: { id: user.clubId }, data: { settings: { ...current, booking: { ...after } } } });
      await logActivity(tx, { clubId: user.clubId, userId: user.userId, action: "club.policy.updated", entity: "Club", entityId: user.clubId, meta: { before: { ...before }, after: { ...after } } });
    });

    revalidatePath("/", "layout");
    return { success: true, message: "Booking policy saved. New bookings use it immediately." };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function resetBookingPolicyAction(): Promise<SettingsResult> {
  return updateBookingPolicyAction(DEFAULT_POLICY);
}
