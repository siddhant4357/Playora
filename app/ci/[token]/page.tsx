import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/kernel";
import { getCurrentUser } from "@/lib/auth";
import { isStaff } from "@/lib/roles";

/**
 * /ci/[token] — Camera-friendly check-in link.
 *
 * Scanning the member QR with any camera app opens this URL. The token is the
 * member's qrToken (a CUID), not their member ID, so nothing private is in it.
 *
 * It only records a check-in when the visitor is signed in AND is either the
 * member the QR belongs to or a staff account of the same club. Anyone else is
 * sent to login first, then straight back here, so the scan still completes.
 */
export default async function CheckInByUrl({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(`/ci/${token}`)}`);

  const member = await prisma.member.findUnique({
    where: { qrToken: token },
    select: { id: true, clubId: true, user: { select: { id: true } } },
  });

  if (!member || member.clubId !== user.clubId) {
    redirect("/login?error=invalid-qr");
  }

  const isOwnCard = member.user?.id === user.userId;
  const staff = isStaff(user.role);
  if (!isOwnCard && !staff) {
    redirect("/me?error=not-your-card");
  }

  const twoHoursAgo = new Date(Date.now() - 2 * 3600_000);
  const recent = await prisma.checkIn.findFirst({
    where: { memberId: member.id, createdAt: { gte: twoHoursAgo } },
    select: { id: true },
  });

  if (!recent) {
    await prisma.checkIn.create({
      data: { clubId: member.clubId, memberId: member.id, method: "QR" },
    });
    await logActivity(prisma, {
      clubId: member.clubId,
      userId: user.userId,
      action: "CHECK_IN",
      entity: "Member",
      entityId: member.id,
    });
  }

  redirect(staff ? `/desk/members/${member.id}?checkin=success` : "/me?checkin=success");
}
