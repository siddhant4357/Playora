import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatPaise } from "@/lib/money";
import { PrintSheet, PrintToolbar } from "@/components/print/PrintSheet";

export const metadata: Metadata = { title: "Quote" };

export default async function QuotePrintPage({ params }: { params: Promise<{ leadId: string }> }) {
  const user = await requireRole("FRONT_DESK", "MANAGER", "OWNER");
  const { leadId } = await params;
  const lead = await prisma.lead.findFirst({ where: { id: leadId, clubId: user.clubId } });
  if (!lead || !lead.quotePlanId || lead.quoteAmount == null) notFound();
  const [plan, club] = await Promise.all([prisma.membershipPlan.findUnique({ where: { id: lead.quotePlanId } }), prisma.club.findUniqueOrThrow({ where: { id: user.clubId } })]);
  if (!plan) notFound();

  const yearly = lead.quoteBilling === "YEARLY";
  const gstPct = 18;
  const base = Math.round((lead.quoteAmount * 100) / (100 + gstPct));
  const gst = lead.quoteAmount - base;
  const date = lead.quoteSentAt ?? new Date();
  const validTill = new Date(date.getTime() + 14 * 86_400_000);
  const fmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: club.timezone });
  const perks = [
    plan.courtDiscountPct >= 100 ? "Courts included" : plan.courtDiscountPct > 0 ? `${plan.courtDiscountPct}% off court bookings` : "Walk-in court rates",
    `Book up to ${plan.advanceBookingDays} days ahead · ${plan.maxBookingsPerDay} sessions a day`,
    plan.barDiscountPct > 0 ? `${plan.barDiscountPct}% off at the bar & café` : null,
    plan.shopDiscountPct > 0 ? `${plan.shopDiscountPct}% off in the pro shop` : null,
    plan.guestPassesPerMonth > 0 ? `${plan.guestPassesPerMonth} guest passes a month` : null,
    ...plan.benefits,
  ].filter((x): x is string => Boolean(x));

  return (
    <>
      <PrintToolbar backHref={`/desk/leads/${lead.id}`} />
      <PrintSheet
        club={club}
        docType="Membership quote"
        docNo={`Q-${String(lead.hashId).padStart(4, "0")}`}
        date={fmt.format(date)}
        meta={[["Valid until", fmt.format(validTill)]]}
        to={{ name: lead.name, lines: [lead.phone, lead.email ?? ""].filter(Boolean) }}
      >
        <table className="ps-table">
          <thead>
            <tr>
              <th>Description</th>
              <th className="r">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <b>{plan.name} membership</b> — {yearly ? "12 months" : "1 month"}
                <ul>
                  {perks.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </td>
              <td className="r">{formatPaise(base)}</td>
            </tr>
            <tr>
              <td>GST @ {gstPct}%</td>
              <td className="r">{formatPaise(gst)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td>Total {yearly ? "per year" : "per month"}</td>
              <td className="r">{formatPaise(lead.quoteAmount)}</td>
            </tr>
          </tfoot>
        </table>
        <p className="ps-note">
          Join by {fmt.format(validTill)} and this price is locked for the whole term. Your first court session is on us — book it at the front desk or on the website.
        </p>
      </PrintSheet>
    </>
  );
}
