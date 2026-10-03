import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendMembershipExpiryEmail } from "@/lib/email";

/**
 * Daily job (vercel.json → 03:00 UTC):
 *  1. Flip ACTIVE members whose expiryDate has passed to EXPIRED.
 *  2. Email members whose plan ends in exactly 7 or 1 days.
 * Protected by CRON_SECRET (Vercel sets the Authorization header automatically).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const expired = await prisma.member.updateMany({
    where: { status: "ACTIVE", expiryDate: { lt: now } },
    data: { status: "EXPIRED" },
  });

  const windows = [7, 1].map((d) => {
    const start = new Date(now.getTime() + d * 86_400_000);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + 86_400_000);
    return { d, start, end };
  });

  let reminded = 0;
  for (const w of windows) {
    const members = await prisma.member.findMany({
      where: { status: "ACTIVE", email: { not: null }, expiryDate: { gte: w.start, lt: w.end } },
      include: { plan: { select: { name: true } }, club: { select: { name: true, phone: true } } },
    });
    for (const m of members) {
      try {
        await sendMembershipExpiryEmail(m.email!, m.firstName, m.plan?.name ?? "membership", w.d, m.club.name, m.club.phone);
        reminded++;
      } catch (err) {
        console.error("[cron] expiry email failed", m.id, err);
      }
    }
  }

  return NextResponse.json({ ok: true, expired: expired.count, reminded, at: now.toISOString() });
}
