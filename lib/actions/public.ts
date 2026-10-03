"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getDefaultClub } from "@/lib/club";
import { KernelError } from "@/lib/kernel";
import { BookingError } from "@/lib/booking/engine";
import { bookTrialForLead, createLead, LEAD_INTERESTS } from "@/lib/leads/engine";
import { placeOnlineOrder } from "@/lib/shop/engine";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type PublicResult<T = undefined> = { success: true; message: string; data: T } | { success: false; error: string };

async function requireClub() {
  const club = await getDefaultClub();
  if (!club) throw new KernelError("NO_CLUB", "The club is not set up yet.");
  return club;
}

function fail(err: unknown): { success: false; error: string } {
  if (err instanceof KernelError || err instanceof BookingError) return { success: false, error: err.message };
  if (err instanceof z.ZodError) return { success: false, error: err.issues[0]?.message ?? "Invalid input." };
  console.error("[public action]", err);
  return { success: false, error: "Something went wrong. Please try again." };
}

// Honeypot: real browsers leave `company` empty; naive bots fill every field.
const Honeypot = z.object({ company: z.string().max(0, "Rejected").optional() });

const EnquirySchema = Honeypot.extend({
  name: z.string().trim().min(1, "Tell us your name"),
  phone: z.string().trim().min(8, "Phone looks too short"),
  email: z.string().trim().email("Invalid email").or(z.literal("")).optional(),
  interest: z.enum(LEAD_INTERESTS).optional(),
  message: z.string().trim().min(1, "What can we help with?").max(1000),
});

export async function submitEnquiryAction(input: z.input<typeof EnquirySchema>): Promise<PublicResult<{ reopened: boolean }>> {
  try {
    const data = EnquirySchema.parse(input);
    const club = await requireClub();
    const { reopened } = await createLead({ clubId: club.id, name: data.name, phone: data.phone, email: data.email || null, interest: data.interest ?? null, source: "WEBSITE", message: data.message });
    revalidatePath("/desk/leads");
    return { success: true, message: "Thanks — the front desk will call you back today.", data: { reopened } };
  } catch (err) {
    return fail(err);
  }
}

const TrialSchema = Honeypot.extend({
  name: z.string().trim().min(1, "Tell us your name"),
  phone: z.string().trim().min(8, "Phone looks too short"),
  email: z.string().trim().email("Invalid email").or(z.literal("")).optional(),
  interest: z.enum(LEAD_INTERESTS).default("Tennis"),
  courtId: z.string().min(1, "Pick a slot"),
  startsAt: z.string().datetime({ message: "Pick a slot" }),
  message: z.string().trim().max(500).optional(),
});

export async function bookTrialPublicAction(input: z.input<typeof TrialSchema>): Promise<PublicResult<{ courtName: string; startsAt: string; leadId: string }>> {
  try {
    const data = TrialSchema.parse(input);
    const club = await requireClub();
    const { lead } = await createLead({ clubId: club.id, name: data.name, phone: data.phone, email: data.email || null, interest: data.interest, source: "WEBSITE", message: data.message || "Booked a trial from the website" });
    const res = await bookTrialForLead({ clubId: club.id, leadId: lead.id, courtId: data.courtId, startsAt: new Date(data.startsAt), source: "WEB" });
    revalidatePath("/desk/leads");
    revalidatePath("/desk");
    revalidatePath("/courts");
    revalidatePath("/");
    return { success: true, message: `You're on ${res.courtName}. See you there.`, data: { courtName: res.courtName, startsAt: res.startsAt.toISOString(), leadId: lead.id } };
  } catch (err) {
    return fail(err);
  }
}

const GuestOrderSchema = Honeypot.extend({
  name: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(32).optional(),
  email: z.string().trim().email("Invalid email").or(z.literal("")).optional(),
  fulfilment: z.enum(["CLICK_COLLECT", "DELIVERY"]),
  deliveryAddress: z.string().trim().max(400).optional(),
  lines: z.array(z.object({ productId: z.string().min(1), qty: z.number().int().min(1).max(20) })).min(1, "Your bag is empty"),
});

/**
 * Public checkout. If a member is signed in we attach the order to them (member
 * price applies); otherwise it is a guest order on name + phone. Payment is
 * recorded as ONLINE — the gateway is out of hackathon scope.
 */
export async function placeGuestOrderAction(input: z.input<typeof GuestOrderSchema>): Promise<PublicResult<{ orderNo: string; total: number; asMember: boolean }>> {
  try {
    const data = GuestOrderSchema.parse(input);
    const club = await requireClub();
    const user = await getCurrentUser();
    const member = user ? await prisma.member.findFirst({ where: { user: { id: user.userId }, clubId: club.id }, select: { id: true } }) : null;
    if (!member) {
      if (!data.name) return { success: false, error: "Tell us your name." };
      if (!data.phone || data.phone.replace(/\D/g, "").length < 8) return { success: false, error: "Phone looks too short." };
    }
    const order = await placeOnlineOrder({
      clubId: club.id,
      memberId: member?.id ?? null,
      guest: member ? null : { name: data.name!, phone: data.phone!, email: data.email || undefined },
      fulfilment: data.fulfilment,
      deliveryAddress: data.deliveryAddress ?? null,
      lines: data.lines,
    });
    revalidatePath("/shop-pos/orders");
    revalidatePath("/shop-pos/inventory");
    return { success: true, message: `Order ${order.orderNo} placed.`, data: { orderNo: order.orderNo, total: order.total, asMember: Boolean(member) } };
  } catch (err) {
    return fail(err);
  }
}
