import "server-only";
import type { LeadStage } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { KernelError, logActivity } from "@/lib/kernel";
import { book } from "@/lib/booking/engine";
import { sendEmail, sendQuoteEmail } from "@/lib/email";
import { formatPaise } from "@/lib/money";
import { formatDateTime } from "@/lib/time";

export const LEAD_STAGES: LeadStage[] = ["NEW", "CONTACTED", "QUOTE_SENT", "TRIAL_BOOKED", "CONVERTED", "LOST"];
export const LEAD_SOURCES = ["WEBSITE", "WALK_IN", "PHONE", "WHATSAPP", "REFERRAL", "INSTAGRAM"] as const;
export const LEAD_INTERESTS = ["Tennis", "Padel", "Membership", "Coaching", "Events"] as const;

const OPEN_STAGES: LeadStage[] = ["NEW", "CONTACTED", "QUOTE_SENT", "TRIAL_BOOKED"];

export interface CreateLeadInput {
  clubId: string;
  name: string;
  phone: string;
  email?: string | null;
  interest?: string | null;
  source: (typeof LEAD_SOURCES)[number];
  message?: string | null;
  stage?: LeadStage;
  byUserId?: string | null;
}

/**
 * Creates (or re-opens) a lead. The same phone number enquiring twice lands on
 * the existing open lead instead of creating a duplicate — the desk sees one
 * person, not three cards.
 */
export async function createLead(input: CreateLeadInput) {
  const phone = normalisePhone(input.phone);
  if (!input.name.trim()) throw new KernelError("NO_NAME", "Name is required.");
  if (phone.replace(/\D/g, "").length < 8) throw new KernelError("BAD_PHONE", "Phone looks too short.");

  const existing = await prisma.lead.findFirst({ where: { clubId: input.clubId, phone, stage: { in: OPEN_STAGES } } });

  const lead = existing
    ? await prisma.lead.update({
        where: { id: existing.id },
        data: {
          email: input.email?.trim() || existing.email,
          interest: input.interest ?? existing.interest,
          message: input.message?.trim() || existing.message,
          nextFollowUp: existing.nextFollowUp ?? inHours(24),
        },
      })
    : await prisma.lead.create({
        data: {
          clubId: input.clubId,
          name: input.name.trim(),
          phone,
          email: input.email?.trim() || null,
          interest: input.interest ?? null,
          source: input.source,
          stage: input.stage ?? "NEW",
          message: input.message?.trim() || null,
          nextFollowUp: inHours(24),
        },
      });

  await prisma.leadActivity.create({
    data: {
      leadId: lead.id,
      type: existing ? "NOTE" : "STAGE_CHANGE",
      content: existing
        ? `Enquired again via ${labelSource(input.source)}${input.message ? `: "${input.message.trim()}"` : ""}`
        : `New lead from ${labelSource(input.source)}${input.message ? `: "${input.message.trim()}"` : ""}`,
      byUserId: input.byUserId ?? null,
    },
  });
  await logActivity(prisma, { clubId: input.clubId, userId: input.byUserId, action: existing ? "LEAD_REOPENED" : "LEAD_CREATED", entity: "Lead", entityId: lead.id, meta: { source: input.source, interest: input.interest ?? null } });

  notifyDesk(input.clubId, lead.id, `${lead.name} enquired via ${labelSource(input.source)}`, lead.message).catch(() => undefined);
  return { lead, reopened: Boolean(existing) };
}

export async function addLeadActivity(input: { clubId: string; leadId: string; type: "NOTE" | "CALL" | "WHATSAPP" | "EMAIL"; content: string; byUserId: string; nextFollowUp?: Date | null }) {
  const lead = await getOwnedLead(input.clubId, input.leadId);
  if (!input.content.trim()) throw new KernelError("EMPTY", "Write something first.");

  const [activity] = await prisma.$transaction([
    prisma.leadActivity.create({ data: { leadId: lead.id, type: input.type, content: input.content.trim(), byUserId: input.byUserId } }),
    prisma.lead.update({
      where: { id: lead.id },
      data: {
        // First touch moves NEW → CONTACTED automatically; stage is derived from work done, not clicked.
        stage: lead.stage === "NEW" && input.type !== "NOTE" ? "CONTACTED" : lead.stage,
        nextFollowUp: input.nextFollowUp === undefined ? lead.nextFollowUp : input.nextFollowUp,
        assignedToId: lead.assignedToId ?? input.byUserId,
      },
    }),
  ]);
  return activity;
}

export async function moveLeadStage(input: { clubId: string; leadId: string; stage: LeadStage; byUserId: string; lostReason?: string | null }) {
  const lead = await getOwnedLead(input.clubId, input.leadId);
  if (lead.stage === input.stage) return lead;
  if (lead.stage === "CONVERTED") throw new KernelError("LOCKED", "Converted leads are closed. Open the member instead.");
  if (input.stage === "CONVERTED") throw new KernelError("USE_CONVERT", "Use “Convert to member” so the member record is created.");
  if (input.stage === "LOST" && !input.lostReason?.trim()) throw new KernelError("NEED_REASON", "Tell us why the lead was lost.");

  const [updated] = await prisma.$transaction([
    prisma.lead.update({
      where: { id: lead.id },
      data: {
        stage: input.stage,
        lostReason: input.stage === "LOST" ? input.lostReason!.trim() : null,
        nextFollowUp: input.stage === "LOST" ? null : lead.nextFollowUp ?? inHours(48),
        assignedToId: lead.assignedToId ?? input.byUserId,
      },
    }),
    prisma.leadActivity.create({
      data: { leadId: lead.id, type: "STAGE_CHANGE", content: `${labelStage(lead.stage)} → ${labelStage(input.stage)}${input.lostReason ? ` · ${input.lostReason.trim()}` : ""}`, byUserId: input.byUserId },
    }),
  ]);
  await logActivity(prisma, { clubId: input.clubId, userId: input.byUserId, action: "LEAD_STAGE", entity: "Lead", entityId: lead.id, meta: { from: lead.stage, to: input.stage } });
  return updated;
}

export async function setFollowUp(input: { clubId: string; leadId: string; at: Date | null; byUserId: string }) {
  const lead = await getOwnedLead(input.clubId, input.leadId);
  return prisma.lead.update({ where: { id: lead.id }, data: { nextFollowUp: input.at, assignedToId: lead.assignedToId ?? input.byUserId } });
}

/**
 * Quote = pick a plan + billing cycle. Stores the figures on the lead, logs
 * the activity, emails the prospect when we have an address. The printable
 * quote lives at /desk/leads/[id]/quote and reads these same fields, so the
 * email and the paper never disagree.
 */
export async function sendQuote(input: { clubId: string; leadId: string; planId: string; billing: "MONTHLY" | "YEARLY"; byUserId: string; note?: string | null }) {
  const [lead, plan, club] = await Promise.all([
    getOwnedLead(input.clubId, input.leadId),
    prisma.membershipPlan.findFirst({ where: { id: input.planId, clubId: input.clubId, isActive: true } }),
    prisma.club.findUniqueOrThrow({ where: { id: input.clubId }, select: { name: true, phone: true } }),
  ]);
  if (!plan) throw new KernelError("NO_PLAN", "Pick a plan.");
  if (lead.stage === "CONVERTED" || lead.stage === "LOST") throw new KernelError("CLOSED", "This lead is closed.");

  const amount = input.billing === "YEARLY" ? plan.priceYearly : plan.priceMonthly;
  const now = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.lead.update({
      where: { id: lead.id },
      data: {
        quotePlanId: plan.id,
        quoteBilling: input.billing,
        quoteAmount: amount,
        quoteSentAt: now,
        stage: lead.stage === "TRIAL_BOOKED" ? lead.stage : "QUOTE_SENT",
        nextFollowUp: inHours(48),
        assignedToId: lead.assignedToId ?? input.byUserId,
      },
    });
    await tx.leadActivity.create({
      data: {
        leadId: lead.id,
        type: "QUOTE",
        content: `Quote sent: ${plan.name} ${input.billing.toLowerCase()} at ${formatPaise(amount)}${input.note ? ` · ${input.note.trim()}` : ""}`,
        byUserId: input.byUserId,
      },
    });
    await logActivity(tx, { clubId: input.clubId, userId: input.byUserId, action: "LEAD_QUOTE", entity: "Lead", entityId: lead.id, meta: { planId: plan.id, billing: input.billing, amount } });
    return u;
  });

  let emailed = false;
  if (lead.email) {
    emailed = await sendQuoteEmail(lead.email, lead.name, plan.name, input.billing, formatPaise(amount), club.name, club.phone).catch(() => false);
  }
  return { lead: updated, plan, amount, emailed };
}

/**
 * Books a complimentary trial court for a lead. Goes through the same booking
 * engine as every other booking, so it obeys hours, overlap and the rest.
 */
export async function bookTrialForLead(input: { clubId: string; leadId: string; courtId: string; startsAt: Date; byUserId?: string | null; source?: "WEB" | "FRONT_DESK" | "PHONE" }) {
  const lead = await getOwnedLead(input.clubId, input.leadId);
  if (lead.trialBookingId) {
    const existing = await prisma.booking.findUnique({ where: { id: lead.trialBookingId }, select: { status: true } });
    if (existing && existing.status === "CONFIRMED") throw new KernelError("HAS_TRIAL", "This lead already has a trial booked.");
  }

  const result = await book({
    clubId: input.clubId,
    courtId: input.courtId,
    startsAt: input.startsAt,
    walkIn: { name: lead.name, phone: lead.phone },
    kind: "TRIAL",
    source: input.source ?? "FRONT_DESK",
    createdById: input.byUserId ?? null,
  });

  const club = await prisma.club.findUniqueOrThrow({ where: { id: input.clubId }, select: { timezone: true } });
  await prisma.$transaction([
    prisma.lead.update({
      where: { id: lead.id },
      data: { trialBookingId: result.bookingId, stage: lead.stage === "CONVERTED" ? lead.stage : "TRIAL_BOOKED", nextFollowUp: new Date(result.endsAt.getTime() + 2 * 3_600_000), assignedToId: lead.assignedToId ?? input.byUserId ?? null },
    }),
    prisma.leadActivity.create({
      data: { leadId: lead.id, type: "TRIAL", content: `Trial booked: ${result.courtName}, ${formatDateTime(result.startsAt, club.timezone)}`, byUserId: input.byUserId ?? null },
    }),
  ]);
  return result;
}

// ───────────────────────── helpers ─────────────────────────

async function getOwnedLead(clubId: string, leadId: string) {
  const lead = await prisma.lead.findFirst({ where: { id: leadId, clubId } });
  if (!lead) throw new KernelError("NOT_FOUND", "Lead not found.");
  return lead;
}

async function notifyDesk(clubId: string, leadId: string, subject: string, message?: string | null) {
  const club = await prisma.club.findUnique({ where: { id: clubId }, select: { email: true, name: true } });
  if (!club?.email) return;
  await sendEmail(
    club.email,
    `New enquiry — ${subject}`,
    `<p>${subject}.</p>${message ? `<blockquote>${escapeHtml(message)}</blockquote>` : ""}<p><a href="/desk/leads/${leadId}">Open the lead in Playora</a></p>`
  );
}

export function normalisePhone(raw: string) {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.length === 10) return `+91${digits}`;
  return digits;
}

function inHours(h: number) {
  return new Date(Date.now() + h * 3_600_000);
}

export function labelStage(s: LeadStage) {
  const labels: Record<LeadStage, string> = { NEW: "New", CONTACTED: "Contacted", QUOTE_SENT: "Quote sent", TRIAL_BOOKED: "Trial booked", CONVERTED: "Converted", LOST: "Lost" };
  return labels[s];
}

export function labelSource(s: string) {
  return ({ WEBSITE: "the website", WALK_IN: "a walk-in", PHONE: "a phone call", WHATSAPP: "WhatsApp", REFERRAL: "a referral", INSTAGRAM: "Instagram" } as Record<string, string>)[s] ?? s.toLowerCase();
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
