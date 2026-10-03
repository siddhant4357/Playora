import { NextResponse } from "next/server";
import { AuthError, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { csvEscape, listLedger, periodRange } from "@/lib/finance/queries";
import { MODE_LABEL, SOURCE_LABEL } from "@/lib/finance/labels";
import { parseLedgerFilters } from "@/components/owner/LedgerFilters";
import { parsePeriod } from "@/components/owner/PeriodToggle";

/** Accountant-friendly CSV of the ledger for the chosen period and filters. Amounts in rupees. */
export async function GET(req: Request) {
  let user;
  try {
    user = await requireRole("OWNER");
  } catch (err) {
    if (err instanceof AuthError) return new NextResponse("Unauthorized", { status: 401 });
    throw err;
  }
  const club = await prisma.club.findUniqueOrThrow({ where: { id: user.clubId }, select: { timezone: true, name: true } });
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const period = parsePeriod(sp.period);
  const range = periodRange(period, club.timezone);
  const { rows } = await listLedger(user.clubId, { from: range.from, to: range.to, ...parseLedgerFilters(sp), take: 10_000 });

  const fmt = new Intl.DateTimeFormat("en-IN", { timeZone: club.timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
  const header = ["#", "Date", "Direction", "Source", "Description", "Member", "Payment mode", "Reference", "Gross (INR)", "GST (INR)", "Net (INR)", "Recorded by"];
  const lines = rows.map((r) =>
    [
      r.hashId,
      fmt.format(r.createdAt),
      r.direction,
      SOURCE_LABEL[r.source],
      r.description,
      r.member ? `${r.member.firstName} ${r.member.lastName} (${r.member.memberCode})` : "",
      MODE_LABEL[r.paymentMode],
      r.reference ?? "",
      ((r.direction === "OUT" ? -r.amount : r.amount) / 100).toFixed(2),
      (r.tax / 100).toFixed(2),
      ((r.direction === "OUT" ? -r.amount : r.amount - r.tax) / 100).toFixed(2),
      r.byUser?.name ?? "",
    ]
      .map(csvEscape)
      .join(",")
  );
  const body = "\uFEFF" + [header.join(","), ...lines].join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="yolla-ledger-${period}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
