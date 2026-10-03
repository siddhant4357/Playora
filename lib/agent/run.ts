/**
 * The WhatsApp booking agent: one generateText call with the shared tools.
 * Short-term memory = the last 30 minutes of this phone's messages, read
 * back from the kernel audit log (no extra table, fully auditable).
 */
import { generateText, tool, isStepCount, type ModelMessage } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/kernel";
import { bookCourt, cancelBooking, checkAvailability, myBookings, resolveContext, TOOL_DEFS, type AgentContext } from "@/lib/agent/tools";

export const AGENT_MODEL = "openai/gpt-4.1-mini";
const MEMORY_WINDOW_MS = 30 * 60_000;

function systemPrompt(ctx: AgentContext) {
  const who = ctx.member ? `The caller is ${ctx.member.firstName} ${ctx.member.lastName}, a member${ctx.member.planName ? ` on the ${ctx.member.planName} plan` : ""}. Bookings are charged to their member account.` : `The caller is not a registered member. They can still book as a guest and pay at the front desk; ask for their name once if you don't have it.`;
  return [
    `You are the WhatsApp front desk for ${ctx.clubName}, a sports club. Timezone ${ctx.timezone}.`,
    who,
    "Be brief and warm — this is WhatsApp. Max 3 short lines unless listing slots. Use plain text, no markdown headings.",
    "Always use tools for facts; never invent availability or prices. Confirm the booking details back after a successful book.",
    "If a book call fails because the slot is taken, call checkAvailability and offer the two nearest alternatives.",
    "If asked about anything other than court bookings, politely say the desk can help and share nothing else.",
  ].join("\n");
}

function makeTools(ctx: AgentContext) {
  return {
    checkAvailability: tool({
      description: TOOL_DEFS.checkAvailability.description,
      inputSchema: z.object({ date: z.string().optional(), sport: z.string().optional(), fromTime: z.string().optional() }),
      execute: (args) => checkAvailability(ctx, args),
    }),
    book: tool({
      description: TOOL_DEFS.book.description,
      inputSchema: z.object({ date: z.string().optional(), time: z.string(), court: z.string().optional(), sport: z.string().optional(), guestName: z.string().optional() }),
      execute: (args) => bookCourt(ctx, args),
    }),
    myBookings: tool({
      description: TOOL_DEFS.myBookings.description,
      inputSchema: z.object({}),
      execute: () => myBookings(ctx),
    }),
    cancel: tool({
      description: TOOL_DEFS.cancel.description,
      inputSchema: z.object({ bookingId: z.string().optional() }),
      execute: (args) => cancelBooking(ctx, args),
    }),
  };
}

async function recentHistory(clubId: string, phone: string): Promise<ModelMessage[]> {
  const rows = await prisma.activityLog.findMany({
    where: { clubId, action: { in: ["WA_IN", "WA_OUT"] }, entityId: phone, createdAt: { gte: new Date(Date.now() - MEMORY_WINDOW_MS) } },
    orderBy: { createdAt: "asc" },
    take: 12,
  });
  return rows.map((r) => ({ role: r.action === "WA_IN" ? "user" : "assistant", content: String((r.newData as { text?: string } | null)?.text ?? "") }) as ModelMessage);
}

export async function runWhatsAppAgent(clubId: string, rawPhone: string, text: string) {
  const ctx = await resolveContext(clubId, rawPhone, "WHATSAPP");
  const history = await recentHistory(clubId, ctx.phone);
  await logActivity(prisma, { clubId, action: "WA_IN", entity: "WhatsApp", entityId: ctx.phone, meta: { text, memberId: ctx.member?.id ?? null } });

  const { text: reply } = await generateText({
    model: AGENT_MODEL,
    system: systemPrompt(ctx),
    messages: [...history, { role: "user", content: text }],
    tools: makeTools(ctx),
    stopWhen: isStepCount(5),
  });

  const out = reply.trim() || "Sorry, I didn't catch that. You can ask me to check availability, book, or cancel a court.";
  await logActivity(prisma, { clubId, action: "WA_OUT", entity: "WhatsApp", entityId: ctx.phone, meta: { text: out } });
  return out;
}
