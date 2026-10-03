"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { logActivity } from "@/lib/kernel";

export type CoachActionResult = { success: true; message: string } | { success: false; error: string };

/**
 * Mark a player present / absent for a coaching session. A coach may only
 * touch their own sessions; managers and owners may touch any.
 */
export async function coachAttendanceAction(input: { bookingId: string; present: boolean }): Promise<CoachActionResult> {
  try {
    const user = await requireRole("COACH", "MANAGER", "OWNER");
    const session = await prisma.booking.findFirst({
      where: {
        id: input.bookingId,
        clubId: user.clubId,
        kind: "COACHING",
        ...(user.role === "COACH" ? { coachId: user.userId } : {}),
      },
      select: { id: true, status: true, memberId: true },
    });
    if (!session) return { success: false, error: "Session not found." };
    if (session.status === "CANCELLED") return { success: false, error: "Session was cancelled." };

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: session.id },
        data: { checkedInAt: input.present ? new Date() : null },
      });
      await logActivity(tx, {
        clubId: user.clubId,
        userId: user.userId,
        action: input.present ? "coaching.attended" : "coaching.absent",
        entity: "Booking",
        entityId: session.id,
        meta: { memberId: session.memberId },
      });
    });

    revalidatePath("/coach");
    revalidatePath("/coach/players");
    revalidatePath("/desk");
    return { success: true, message: input.present ? "Marked present." : "Marked absent." };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}
