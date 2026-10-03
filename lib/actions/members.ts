"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { AuthError, requireRole } from "@/lib/auth";
import { KernelError, logActivity, postTransaction } from "@/lib/kernel";
import { nextMemberCode } from "@/lib/members/queries";
import type { PaymentMode } from "@/generated/prisma/client";

export type ActionResult<T = undefined> =
  | ({ success: true; message: string } & (T extends undefined ? { data?: undefined } : { data: T }))
  | { success: false; error: string };

function mapError(err: unknown): { success: false; error: string } {
  if (err instanceof KernelError) return { success: false, error: err.message };
  if (err instanceof z.ZodError) return { success: false, error: err.issues[0]?.message ?? "Invalid input." };
  if (err instanceof AuthError) return { success: false, error: err.code === "FORBIDDEN" ? "Not allowed." : "Please sign in." };
  console.error("[members action]", err);
  return { success: false, error: "Something went wrong. Please try again." };
}

const STAFF = ["FRONT_DESK", "MANAGER", "OWNER"] as const;

// ───────────────────────── Register ─────────────────────────

const RegisterSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  phone: z.string().trim().min(8, "Phone looks too short"),
  email: z.string().trim().email("Invalid email").or(z.literal("")).optional(),
  dateOfBirth: z.string().optional(),
  emergencyContact: z.string().trim().optional(),
  skillRating: z.coerce.number().int().min(1).max(5).optional(),
  planId: z.string().optional(),
  billing: z.enum(["MONTHLY", "YEARLY"]).default("MONTHLY"),
  paymentMode: z.enum(["CASH", "CARD", "UPI", "ONLINE", "COMPLIMENTARY"]).default("UPI"),
  leadId: z.string().optional(),
});

export type RegisterInput = z.input<typeof RegisterSchema>;

export async function registerMemberAction(input: RegisterInput): Promise<ActionResult<{ memberId: string }>> {
  try {
    const user = await requireRole(...STAFF);
    const data = RegisterSchema.parse(input);

    const dupe = await prisma.member.findFirst({ where: { clubId: user.clubId, phone: data.phone }, select: { id: true, firstName: true } });
    if (dupe) return { success: false, error: `A member with this phone already exists (${dupe.firstName}). Open their profile instead.` };

    const plan = data.planId ? await prisma.membershipPlan.findFirst({ where: { id: data.planId, clubId: user.clubId } }) : null;
    const now = new Date();
    const months = data.billing === "YEARLY" ? 12 : 1;
    const expiry = plan ? new Date(new Date(now).setMonth(now.getMonth() + months)) : null;
    const fee = plan ? (data.billing === "YEARLY" ? plan.priceYearly : plan.priceMonthly) : 0;
    const memberCode = await nextMemberCode(user.clubId);

    const memberId = await prisma.$transaction(async (tx) => {
      const member = await tx.member.create({
        data: {
          clubId: user.clubId,
          memberCode,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          email: data.email || null,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          emergencyContact: data.emergencyContact || null,
          skillRating: data.skillRating ?? 3,
          status: plan ? "ACTIVE" : "TRIAL",
          planId: plan?.id ?? null,
          startDate: plan ? now : null,
          expiryDate: expiry,
        },
      });
      if (plan && fee > 0) {
        await postTransaction(tx, {
          clubId: user.clubId,
          memberId: member.id,
          source: "MEMBERSHIP",
          amount: fee,
          paymentMode: data.paymentMode as PaymentMode,
          refType: "Member",
          refId: member.id,
          description: `${plan.name} membership · ${data.billing.toLowerCase()}`,
          byUserId: user.userId,
        });
      }
      if (data.leadId) {
        await tx.lead.updateMany({
          where: { id: data.leadId, clubId: user.clubId },
          data: { stage: "CONVERTED", memberId: member.id },
        });
        await tx.leadActivity.create({
          data: { leadId: data.leadId, type: "STAGE_CHANGE", content: `Converted to member ${memberCode}`, byUserId: user.userId },
        });
      }
      await logActivity(tx, { clubId: user.clubId, userId: user.userId, action: "MEMBER_REGISTERED", entity: "Member", entityId: member.id, meta: { plan: plan?.name ?? null, fee } });
      return member.id;
    });

    revalidatePath("/desk/members");
    revalidatePath("/desk/leads");
    return { success: true, message: `${data.firstName} registered as ${memberCode}.`, data: { memberId } };
  } catch (err) {
    return mapError(err);
  }
}

// ───────────────────────── Renew / change plan ─────────────────────────

const RenewSchema = z.object({
  memberId: z.string().min(1),
  planId: z.string().min(1),
  billing: z.enum(["MONTHLY", "YEARLY"]),
  paymentMode: z.enum(["CASH", "CARD", "UPI", "ONLINE", "CREDIT", "COMPLIMENTARY"]),
});

export async function renewMembershipAction(input: z.input<typeof RenewSchema>): Promise<ActionResult> {
  try {
    const user = await requireRole(...STAFF);
    const data = RenewSchema.parse(input);
    const [member, plan] = await Promise.all([
      prisma.member.findFirst({ where: { id: data.memberId, clubId: user.clubId } }),
      prisma.membershipPlan.findFirst({ where: { id: data.planId, clubId: user.clubId } }),
    ]);
    if (!member || !plan) return { success: false, error: "Member or plan not found." };

    const now = new Date();
    // Renewals extend from current expiry if still active, else from today.
    const base = member.expiryDate && member.expiryDate > now && member.planId === plan.id ? member.expiryDate : now;
    const months = data.billing === "YEARLY" ? 12 : 1;
    const expiry = new Date(new Date(base).setMonth(base.getMonth() + months));
    const fee = data.billing === "YEARLY" ? plan.priceYearly : plan.priceMonthly;

    await prisma.$transaction(async (tx) => {
      if (data.paymentMode === "CREDIT") {
        if (member.creditBalance < fee) throw new KernelError("INSUFFICIENT_CREDIT", "Not enough credit balance.");
        await tx.member.update({ where: { id: member.id }, data: { creditBalance: { decrement: fee } } });
      }
      await tx.member.update({
        where: { id: member.id },
        data: { planId: plan.id, status: "ACTIVE", startDate: member.startDate ?? now, expiryDate: expiry },
      });
      await postTransaction(tx, {
        clubId: user.clubId,
        memberId: member.id,
        source: "MEMBERSHIP",
        amount: fee,
        paymentMode: data.paymentMode as PaymentMode,
        refType: "Member",
        refId: member.id,
        description: `${plan.name} ${member.planId === plan.id ? "renewal" : "plan change"} · ${data.billing.toLowerCase()}`,
        byUserId: user.userId,
      });
      await logActivity(tx, { clubId: user.clubId, userId: user.userId, action: "MEMBERSHIP_RENEWED", entity: "Member", entityId: member.id, meta: { plan: plan.name, billing: data.billing, fee } });
    });

    revalidatePath(`/desk/members/${member.id}`);
    revalidatePath("/desk/members");
    return { success: true, message: `${plan.name} active until ${expiry.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}.` };
  } catch (err) {
    return mapError(err);
  }
}

// ───────────────────────── Freeze / status ─────────────────────────

export async function setMemberStatusAction(input: { memberId: string; status: "ACTIVE" | "FROZEN" | "CANCELLED" }): Promise<ActionResult> {
  try {
    const user = await requireRole("MANAGER", "OWNER");
    const member = await prisma.member.findFirst({ where: { id: input.memberId, clubId: user.clubId } });
    if (!member) return { success: false, error: "Member not found." };
    await prisma.$transaction(async (tx) => {
      await tx.member.update({ where: { id: member.id }, data: { status: input.status } });
      await logActivity(tx, { clubId: user.clubId, userId: user.userId, action: `MEMBER_${input.status}`, entity: "Member", entityId: member.id });
    });
    revalidatePath(`/desk/members/${member.id}`);
    return { success: true, message: `Membership ${input.status.toLowerCase()}.` };
  } catch (err) {
    return mapError(err);
  }
}

// ───────────────────────── Notes ─────────────────────────

export async function addMemberNoteAction(input: { memberId: string; content: string }): Promise<ActionResult> {
  try {
    const user = await requireRole(...STAFF, "COACH", "BAR_STAFF");
    const content = input.content.trim();
    if (!content) return { success: false, error: "Note is empty." };
    const member = await prisma.member.findFirst({ where: { id: input.memberId, clubId: user.clubId }, select: { id: true } });
    if (!member) return { success: false, error: "Member not found." };
    await prisma.memberNote.create({ data: { memberId: member.id, content, byUserId: user.userId } });
    revalidatePath(`/desk/members/${member.id}`);
    return { success: true, message: "Note added." };
  } catch (err) {
    return mapError(err);
  }
}

// ───────────────────────── Check-in ─────────────────────────

export type CheckInResult =
  | { success: true; message: string; member: { id: string; name: string; code: string; plan: string | null; tier: string | null; daysLeft: number | null; status: string; booking: string | null } }
  | { success: false; error: string; member?: { id: string; name: string; code: string; status: string } };

/** Accepts a member code (CC-0001), a scanned token ("playora:<memberId>") or a phone number. */
export async function checkInAction(input: { token: string; method?: "QR" | "MANUAL" }): Promise<CheckInResult> {
  try {
    const user = await requireRole(...STAFF);
    const raw = input.token.trim();
    const qrToken = raw.includes("/ci/") ? raw.split("/ci/")[1] : raw.startsWith("playora:") ? raw.slice(8) : null;

    const member = await prisma.member.findFirst({
      where: {
        clubId: user.clubId,
        OR: qrToken ? [{ qrToken }] : [{ memberCode: { equals: raw, mode: "insensitive" } }, { phone: raw }],
      },
      include: { plan: { select: { name: true, tier: true } } },
    });
    if (!member) return { success: false, error: "No member matches that code." };

    const now = new Date();
    const name = `${member.firstName} ${member.lastName}`;
    const base = { id: member.id, name, code: member.memberCode, status: member.status };
    const expired = member.expiryDate ? member.expiryDate < now : member.status !== "TRIAL";
    if (member.status === "FROZEN" || member.status === "CANCELLED") {
      return { success: false, error: `Membership is ${member.status.toLowerCase()}.`, member: base };
    }
    if (expired && member.status !== "TRIAL") {
      return { success: false, error: "Membership expired — offer a renewal.", member: base };
    }

    const recent = await prisma.checkIn.findFirst({ where: { memberId: member.id, createdAt: { gte: new Date(now.getTime() - 2 * 3600_000) } } });
    if (recent) return { success: false, error: `${member.firstName} already checked in at ${recent.createdAt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}.`, member: base };

    const booking = await prisma.booking.findFirst({
      where: { memberId: member.id, status: "CONFIRMED", startsAt: { lte: new Date(now.getTime() + 30 * 60_000) }, endsAt: { gte: now } },
      include: { court: { select: { name: true } } },
    });

    await prisma.$transaction(async (tx) => {
      await tx.checkIn.create({ data: { clubId: user.clubId, memberId: member.id, method: input.method ?? "MANUAL", byUserId: user.userId } });
      if (booking && !booking.checkedInAt) {
        await tx.booking.update({ where: { id: booking.id }, data: { checkedInAt: now } });
      }
    });

    revalidatePath("/desk/checkin");
    revalidatePath("/desk");
    const daysLeft = member.expiryDate ? Math.ceil((member.expiryDate.getTime() - now.getTime()) / 86_400_000) : null;
    return {
      success: true,
      message: `Welcome back, ${member.firstName}.`,
      member: { ...base, plan: member.plan?.name ?? null, tier: member.plan?.tier ?? null, daysLeft, booking: booking ? `${booking.court.name} · ${booking.startsAt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}` : null },
    };
  } catch (err) {
    return mapError(err);
  }
}

// ───────────────────────── Member self-service profile ─────────────────────────

const SelfProfileSchema = z.object({
  phone: z.string().trim().min(8).optional(),
  emergencyContact: z.string().trim().optional(),
  skillRating: z.coerce.number().int().min(1).max(5).optional(),
});

export async function updateMyMemberProfileAction(input: z.input<typeof SelfProfileSchema>): Promise<ActionResult> {
  try {
    const user = await requireRole("MEMBER");
    const data = SelfProfileSchema.parse(input);
    const me = await prisma.user.findUnique({ where: { id: user.userId }, select: { memberId: true } });
    if (!me?.memberId) return { success: false, error: "No member record linked." };
    await prisma.member.update({
      where: { id: me.memberId },
      data: {
        phone: data.phone,
        emergencyContact: data.emergencyContact || null,
        skillRating: data.skillRating,
      },
    });
    revalidatePath("/me/profile");
    return { success: true, message: "Profile saved." };
  } catch (err) {
    return mapError(err);
  }
}
