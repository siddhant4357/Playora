import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/kernel";

/**
 * /ci/[token] — Camera-friendly check-in link.
 *
 * When a Front Desk staffer or member scans the QR with ANY camera app,
 * the phone opens this URL. If the member is already logged in, it records
 * a check-in. If not, it redirects to login.
 *
 * The token in the QR is the member's qrToken (a CUID), not their member ID,
 * so no private data is exposed.
 */
export default async function CheckInByUrl({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const member = await prisma.member.findUnique({
    where: { qrToken: token },
    include: { club: true },
  });

  if (!member) {
    redirect("/login?error=invalid-qr");
  }

  const now = new Date();

  // Check if already checked in within 2 hours
  const recent = await prisma.checkIn.findFirst({
    where: { memberId: member.id, createdAt: { gte: new Date(now.getTime() - 2 * 3600_000) } },
  });

  if (!recent) {
    await prisma.checkIn.create({
      data: {
        clubId: member.clubId,
        memberId: member.id,
        method: "QR",
      },
    });

    await logActivity(prisma, {
      clubId: member.clubId,
      action: "CHECK_IN",
      entity: "Member",
      entityId: member.id,
    });
  }

  // Redirect to the member's home page with a success param
  redirect("/me?checkin=success");
}
