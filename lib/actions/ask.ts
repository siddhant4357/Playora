"use server";

import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/kernel";
import { ask, AskError, type AskResult } from "@/lib/ask/engine";

const schema = z.object({ question: z.string().trim().min(3).max(400) });

export type AskState = { ok: true; result: AskResult } | { ok: false; error: string; code: AskError["code"] | "INPUT" };

export async function askAction(_prev: AskState | null, formData: FormData): Promise<AskState> {
  const user = await requireRole("OWNER");
  const parsed = schema.safeParse({ question: formData.get("question") });
  if (!parsed.success) return { ok: false, error: "Ask a slightly longer question.", code: "INPUT" };

  const club = await prisma.club.findUniqueOrThrow({ where: { id: user.clubId }, select: { timezone: true } });
  try {
    const result = await ask(user.clubId, parsed.data.question, club.timezone);
    await logActivity(prisma, { clubId: user.clubId, userId: user.userId, action: "ASK_AI", entity: "Analytics", meta: { question: parsed.data.question, rows: result.rows.length, ms: result.ms } });
    return { ok: true, result };
  } catch (e) {
    if (e instanceof AskError) return { ok: false, error: e.message, code: e.code };
    return { ok: false, error: "Something went wrong.", code: "DB" };
  }
}
