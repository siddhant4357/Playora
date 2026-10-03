import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getClub } from "@/lib/club";
import { formatPaise } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import { AccountSettings } from "@/components/account/AccountSettings";
import { Panel, Pill, statusTone } from "@/components/shared/Primitives";
import { MemberProfileForm } from "@/components/members/MemberProfileForm";

export const metadata: Metadata = { title: "Profile" };

export default async function MemberProfilePage() {
  const user = await requireUser("/me/profile");
  const [me, club] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        member: {
          include: { plan: true, transactions: { orderBy: { createdAt: "desc" }, take: 15 } },
        },
      },
    }),
    getClub(user.clubId),
  ]);
  const m = me?.member;
  const tz = club?.timezone ?? "Asia/Kolkata";

  return (
    <div className="flex flex-col gap-5">
      {m && (
        <>
          <Panel title="Membership">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-lg font-bold">{m.plan?.name ?? "Trial"}</span>
                <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                  {m.expiryDate ? `Valid till ${m.expiryDate.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}` : "No active plan"}
                </span>
              </div>
              <Pill tone={statusTone(m.status)}>{m.status}</Pill>
            </div>
            {m.plan && (
              <ul className="grid grid-cols-2 gap-2 text-sm">
                <li className="rounded-xl px-3 py-2" style={{ background: "var(--color-bg)" }}>
                  <span className="block text-xs" style={{ color: "var(--color-text-muted)" }}>Court discount</span>
                  <span className="font-semibold">{m.plan.courtDiscountPct}%</span>
                </li>
                <li className="rounded-xl px-3 py-2" style={{ background: "var(--color-bg)" }}>
                  <span className="block text-xs" style={{ color: "var(--color-text-muted)" }}>Book ahead</span>
                  <span className="font-semibold">{m.plan.advanceBookingDays} days</span>
                </li>
                <li className="rounded-xl px-3 py-2" style={{ background: "var(--color-bg)" }}>
                  <span className="block text-xs" style={{ color: "var(--color-text-muted)" }}>Sessions / day</span>
                  <span className="font-semibold">{m.plan.maxBookingsPerDay}</span>
                </li>
                <li className="rounded-xl px-3 py-2" style={{ background: "var(--color-bg)" }}>
                  <span className="block text-xs" style={{ color: "var(--color-text-muted)" }}>Credit</span>
                  <span className="font-semibold">{formatPaise(m.creditBalance, { free: "₹0" })}</span>
                </li>
              </ul>
            )}
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              To renew or change plan, visit the front desk or call {club?.phone ?? "the club"}.
            </p>
          </Panel>

          <Panel title="Playing profile">
            <MemberProfileForm initial={{ phone: m.phone, emergencyContact: m.emergencyContact ?? "", skillRating: m.skillRating }} />
          </Panel>

          <Panel title="Payments">
            {m.transactions.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>No payments yet.</p>
            ) : (
              <ul className="flex flex-col divide-y text-sm" style={{ borderColor: "var(--color-border)" }}>
                {m.transactions.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate">{t.description}</span>
                      <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                        {formatDateTime(t.createdAt, tz)} · {t.paymentMode}
                      </span>
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums" style={{ color: t.direction === "OUT" ? "var(--color-success)" : "var(--color-text)" }}>
                      {t.direction === "OUT" ? "+" : ""}
                      {formatPaise(t.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}
      <AccountSettings />
    </div>
  );
}
