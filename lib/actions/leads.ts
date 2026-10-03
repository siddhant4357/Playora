"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { phoneSchema } from "@/lib/validation/phone";
import { AuthError, requireRole } from "@/lib/auth";
import { KernelError } from "@/lib/kernel";
import { BookingError } from "@/lib/booking/engine";
import { addLeadActivity, bookTrialForLead, createLead, LEAD_INTERESTS, LEAD_SOURCES, moveLeadStage, sendQuote, setFollowUp } from "@/lib/leads/engine";

export type ActionResult<T = undefined> = { success: true; message: string; data: T } | { success: false; error: string };

const STAFF = ["FRONT_DESK", "MANAGER", "OWNER"] as const;

function fail(err: unknown): { success: false; error: string } {
  if (err instanceof KernelError || err instanceof BookingError) return { success: false, error: err.message };
  if (err instanceof z.ZodError) return { success: false, error: err.issues[0]?.message ?? "Invalid input." };
  if (err instanceof AuthError) return { success: false, error: err.code === "FORBIDDEN" ? "Not allowed." : "Please sign in." };
  console.error("[leads action]", err);
  return { success: false, error: "Something went wrong. Please try again." };
}

function touch(leadId?: string) {
  revalidatePath("/desk/leads");
  revalidatePath("/desk");
  if (leadId) revalidatePath(`/desk/leads/${leadId}`);
}

const NewLeadSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: phoneSchema,
  email: z.string().trim().email("Invalid email").or(z.literal("")).optional(),
  interest: z.enum(LEAD_INTERESTS).optional(),
  source: z.enum(LEAD_SOURCES).default("WALK_IN"),
  message: z.string().trim().max(1000).optional(),
});

export async function createLeadAction(input: z.input<typeof NewLeadSchema>): Promise<ActionResult<{ leadId: string }>> {
  try {
    const user = await requireRole(...STAFF);
    const data = NewLeadSchema.parse(input);
    const { lead, reopened } = await createLead({ clubId: user.clubId, ...data, email: data.email || null, byUserId: user.userId });
    touch(lead.id);
    return { success: true, message: reopened ? `${lead.name} already had an open lead — added to it.` : `Lead added for ${lead.name}.`, data: { leadId: lead.id } };
  } catch (err) {
    return fail(err);
  }
}

const ActivitySchema = z.object({
  leadId: z.string().min(1),
  type: z.enum(["NOTE", "CALL", "WHATSAPP", "EMAIL"]),
  content: z.string().trim().min(1, "Write something first").max(2000),
  followUpInHours: z.coerce.number().int().min(0).max(24 * 60).optional(),
});

export async function addLeadActivityAction(input: z.input<typeof ActivitySchema>): Promise<ActionResult> {
  try {
    const user = await requireRole(...STAFF);
    const data = ActivitySchema.parse(input);
    await addLeadActivity({
      clubId: user.clubId,
      leadId: data.leadId,
      type: data.type,
      content: data.content,
      byUserId: user.userId,
      nextFollowUp: data.followUpInHours === undefined ? undefined : data.followUpInHours === 0 ? null : new Date(Date.now() + data.followUpInHours * 3_600_000),
    });
    touch(data.leadId);
    return { success: true, message: "Logged.", data: undefined };
  } catch (err) {
    return fail(err);
  }
}

const StageSchema = z.object({
  leadId: z.string().min(1),
  stage: z.enum(["NEW", "CONTACTED", "QUOTE_SENT", "TRIAL_BOOKED", "LOST"]),
  lostReason: z.string().trim().max(300).optional(),
});

export async function moveLeadStageAction(input: z.input<typeof StageSchema>): Promise<ActionResult> {
  try {
    const user = await requireRole(...STAFF);
    const data = StageSchema.parse(input);
    await moveLeadStage({ clubId: user.clubId, leadId: data.leadId, stage: data.stage, byUserId: user.userId, lostReason: data.lostReason });
    touch(data.leadId);
    return { success: true, message: "Moved.", data: undefined };
  } catch (err) {
    return fail(err);
  }
}

export async function setFollowUpAction(input: { leadId: string; at: string | null }): Promise<ActionResult> {
  try {
    const user = await requireRole(...STAFF);
    const at = input.at ? new Date(input.at) : null;
    if (at && Number.isNaN(at.getTime())) return { success: false, error: "Invalid date." };
    await setFollowUp({ clubId: user.clubId, leadId: input.leadId, at, byUserId: user.userId });
    touch(input.leadId);
    return { success: true, message: at ? "Follow-up scheduled." : "Follow-up cleared.", data: undefined };
  } catch (err) {
    return fail(err);
  }
}

const QuoteSchema = z.object({
  leadId: z.string().min(1),
  planId: z.string().min(1, "Pick a plan"),
  billing: z.enum(["MONTHLY", "YEARLY"]),
  note: z.string().trim().max(300).optional(),
});

export async function sendQuoteAction(input: z.input<typeof QuoteSchema>): Promise<ActionResult<{ emailed: boolean }>> {
  try {
    const user = await requireRole(...STAFF);
    const data = QuoteSchema.parse(input);
    const res = await sendQuote({ clubId: user.clubId, ...data, byUserId: user.userId });
    touch(data.leadId);
    return { success: true, message: res.emailed ? `Quote emailed to ${res.lead.email}.` : "Quote saved. Print or WhatsApp it from here.", data: { emailed: res.emailed } };
  } catch (err) {
    return fail(err);
  }
}

const TrialSchema = z.object({ leadId: z.string().min(1), courtId: z.string().min(1), startsAt: z.string().datetime() });

export async function bookTrialAction(input: z.input<typeof TrialSchema>): Promise<ActionResult<{ bookingId: string }>> {
  try {
    const user = await requireRole(...STAFF);
    const data = TrialSchema.parse(input);
    const res = await bookTrialForLead({ clubId: user.clubId, leadId: data.leadId, courtId: data.courtId, startsAt: new Date(data.startsAt), byUserId: user.userId, source: "FRONT_DESK" });
    touch(data.leadId);
    revalidatePath("/desk");
    return { success: true, message: `Trial booked on ${res.courtName}.`, data: { bookingId: res.bookingId } };
  } catch (err) {
    return fail(err);
  }
}
