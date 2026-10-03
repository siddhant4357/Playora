import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Phone, Mail } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getClub } from "@/lib/club";
import { getMember360, listPlans } from "@/lib/members/queries";
import { formatPaise } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import { tierStyle } from "@/lib/booking/ui";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, Pill, Stat, statusTone } from "@/components/shared/Primitives";
import { MemberActions } from "@/components/members/MemberActions";
import { MemberNotes } from "@/components/members/MemberNotes";
import { MemberQr } from "@/components/members/MemberQr";

export const metadata: Metadata = { title: "Member" };

export default async function Member360Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const [data, plans, club] = await Promise.all([getMember360(user.clubId, id), listPlans(user.clubId), getClub(user.clubId)]);
  if (!data) notFound();
  const { member: m, lifetimeSpend, spendBySource, visitsThisMonth, upcomingCount, daysLeft } = data;
  const tz = club?.timezone ?? "Asia/Kolkata";
  const expiring = m.status === "ACTIVE" && daysLeft !== null && daysLeft <= 14;
  const canManage = user.role === "MANAGER" || user.role === "OWNER";

  return (
    <div className="flex flex-col gap-6">
      <Link href="/desk/members" className="inline-flex items-center gap-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
        <ArrowLeft className="h-4 w-4" /> Members
      </Link>

      <PageHeader
        eyebrow={m.memberCode}
        title={`${m.firstName} ${m.lastName}`}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={tierStyle(m.plan?.tier)}>
              {m.plan?.name ?? "No plan"}
            </span>
            <Pill tone={expiring ? "warning" : statusTone(m.status)}>{expiring ? `Expiring in ${daysLeft}d` : m.status}</Pill>
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" /> {m.phone}
            </span>
            {m.email && (
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" /> {m.email}
              </span>
            )}
          </span>
        }
        actions={
          <>
            <Button variant="outline" nativeButton={false} render={<Link href={`/desk?member=${m.id}`} />}>
              Book a court
            </Button>
            <MemberActions memberId={m.id} status={m.status} currentPlanId={m.planId} creditBalance={m.creditBalance} plans={plans.map((p) => ({ id: p.id, name: p.name, priceMonthly: p.priceMonthly, priceYearly: p.priceYearly }))} canManage={canManage} />
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Lifetime spend" value={formatPaise(lifetimeSpend)} hint={Object.entries(spendBySource).map(([k, v]) => `${k.toLowerCase()} ${formatPaise(v)}`).join(" · ") || "No spend yet"} />
        <Stat label="Visits this month" value={visitsThisMonth} hint={`${m.checkIns.length ? "Last " + formatDateTime(m.checkIns[0].createdAt, tz) : "Never checked in"}`} />
        <Stat label="Upcoming bookings" value={upcomingCount} hint={m.plan ? `${m.plan.maxBookingsPerDay}/day · ${m.plan.advanceBookingDays}d ahead` : "Walk-in rates apply"} />
        <Stat label="Credit balance" value={formatPaise(m.creditBalance, { free: "₹0" })} hint="From cancellations" tone={m.creditBalance > 0 ? "success" : "default"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_320px]">
        <Panel title="Bookings">
          {m.bookings.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>No bookings yet.</p>
          ) : (
            <ul className="flex flex-col divide-y text-sm" style={{ borderColor: "var(--color-border)" }}>
              {m.bookings.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{b.court.name}</span>
                    <span className="text-xs tabular-nums" style={{ color: "var(--color-text-muted)" }}>
                      {formatDateTime(b.startsAt, tz)}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="tabular-nums">{formatPaise(b.priceCharged, { free: "Free" })}</span>
                    <Pill tone={statusTone(b.status)}>{b.status}</Pill>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Ledger">
          {m.transactions.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>No transactions yet.</p>
          ) : (
            <ul className="flex flex-col divide-y text-sm" style={{ borderColor: "var(--color-border)" }}>
              {m.transactions.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{t.description}</span>
                    <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                      {t.source} · {t.paymentMode} · {formatDateTime(t.createdAt, tz)}
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums" style={{ color: t.direction === "OUT" ? "var(--color-danger)" : "var(--color-text)" }}>
                    {t.direction === "OUT" ? "−" : ""}
                    {formatPaise(t.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel title="Member pass">
            <MemberQr token={`playora:${m.qrToken}`} code={m.memberCode} name={`${m.firstName} ${m.lastName}`} />
          </Panel>
          <Panel title="Details">
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
              <dt style={{ color: "var(--color-text-muted)" }}>Member since</dt>
              <dd>{m.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</dd>
              <dt style={{ color: "var(--color-text-muted)" }}>Expires</dt>
              <dd>{m.expiryDate ? m.expiryDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}</dd>
              <dt style={{ color: "var(--color-text-muted)" }}>Level</dt>
              <dd>{m.skillRating}/5</dd>
              <dt style={{ color: "var(--color-text-muted)" }}>Emergency</dt>
              <dd>{m.emergencyContact ?? "—"}</dd>
              <dt style={{ color: "var(--color-text-muted)" }}>Login</dt>
              <dd>{m.user ? m.user.email : "No app login"}</dd>
              {m.lead && (
                <>
                  <dt style={{ color: "var(--color-text-muted)" }}>Source</dt>
                  <dd>Lead via {m.lead.source.toLowerCase()}</dd>
                </>
              )}
            </dl>
          </Panel>
          <Panel title="Notes">
            <MemberNotes memberId={m.id} notes={m.memberNotes.map((n) => ({ id: n.id, content: n.content, at: formatDateTime(n.createdAt, tz) }))} />
          </Panel>
        </div>
      </div>

      {(m.orders.length > 0 || m.tabs.length > 0 || m.serviceJobs.length > 0) && (
        <div className="grid gap-4 md:grid-cols-3">
          <Panel title="Shop orders">
            <MiniList rows={m.orders.map((o) => ({ id: o.id, a: o.orderNo, b: formatPaise(o.total), s: o.status, href: `/shop-pos/orders` }))} />
          </Panel>
          <Panel title="Bar tabs">
            <MiniList rows={m.tabs.map((t) => ({ id: t.id, a: t.tabNo, b: formatPaise(t.total), s: t.status, href: `/bar/tabs/${t.id}` }))} />
          </Panel>
          <Panel title="Service jobs">
            <MiniList rows={m.serviceJobs.map((j) => ({ id: j.id, a: `${j.jobNo} · ${j.item}`, b: formatPaise(j.price), s: j.status, href: `/shop-pos/services` }))} />
          </Panel>
        </div>
      )}
    </div>
  );
}

function MiniList({ rows }: { rows: { id: string; a: string; b: string; s: string; href: string }[] }) {
  if (rows.length === 0) return <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>None.</p>;
  return (
    <ul className="flex flex-col divide-y text-sm" style={{ borderColor: "var(--color-border)" }}>
      {rows.map((r) => (
        <li key={r.id} className="flex items-center justify-between gap-2 py-2">
          <Link href={r.href} className="truncate font-medium hover:underline">
            {r.a}
          </Link>
          <span className="flex shrink-0 items-center gap-2">
            <span className="tabular-nums">{r.b}</span>
            <Pill tone={statusTone(r.s)}>{r.s.replace(/_/g, " ")}</Pill>
          </span>
        </li>
      ))}
    </ul>
  );
}
