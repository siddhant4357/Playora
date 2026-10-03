import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatPaise } from "@/lib/money";
import { getDailyRevenue, getKpis, getOwnerAlerts, getRevenueSummary, getUtilisationHeatmap, periodRange } from "@/lib/finance/queries";
import { PageHeader, Panel, Stat } from "@/components/shared/Primitives";
import { PeriodToggle, parsePeriod } from "@/components/owner/PeriodToggle";
import { RevenueChart } from "@/components/owner/RevenueChart";
import { SourceModeMatrix } from "@/components/owner/SourceModeMatrix";
import { UtilisationHeatmap } from "@/components/owner/UtilisationHeatmap";
import { OwnerAlerts } from "@/components/owner/OwnerAlerts";

export const metadata: Metadata = { title: "Owner dashboard" };

interface PageProps {
  searchParams: Promise<{ period?: string }>;
}

function delta(curr: number, prev: number): { text: string; tone: "success" | "danger" | "default" } {
  if (prev === 0) return { text: curr > 0 ? "new" : "–", tone: "default" };
  const pct = Math.round(((curr - prev) / prev) * 100);
  if (pct === 0) return { text: "flat", tone: "default" };
  return { text: `${pct > 0 ? "+" : ""}${pct}%`, tone: pct > 0 ? "success" : "danger" };
}

export default async function OwnerHomePage({ searchParams }: PageProps) {
  const user = await requireRole("OWNER");
  const club = await prisma.club.findUniqueOrThrow({ where: { id: user.clubId }, select: { name: true, timezone: true } });
  const period = parsePeriod((await searchParams).period);
  const range = periodRange(period, club.timezone);

  const [summary, prevSummary, daily, kpis, prevKpis, heatmap, alerts] = await Promise.all([
    getRevenueSummary(user.clubId, range.from, range.to),
    getRevenueSummary(user.clubId, range.prevFrom, range.prevTo),
    getDailyRevenue(user.clubId, range.from, range.to, club.timezone),
    getKpis(user.clubId, range.from, range.to),
    getKpis(user.clubId, range.prevFrom, range.prevTo),
    getUtilisationHeatmap(user.clubId, range.from, range.to, club.timezone),
    getOwnerAlerts(user.clubId),
  ]);

  const revDelta = delta(summary.revenue, prevSummary.revenue);
  const bookDelta = delta(kpis.bookings, prevKpis.bookings);
  const memberDelta = delta(kpis.newMembers, prevKpis.newMembers);
  const top = summary.bySource[0];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow={club.name}
        title={range.label}
        subtitle={`${summary.count} paid transactions · ${formatPaise(summary.tax)} GST collected · ${formatPaise(summary.outgoings)} paid out`}
        actions={<PeriodToggle period={period} basePath="/owner" />}
      />

      <section aria-label="Key numbers" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Revenue" value={formatPaise(summary.revenue)} hint={`${revDelta.text} vs ${range.prevLabel}`} hintTone={revDelta.tone} />
        <Stat label="Net after outgoings" value={formatPaise(summary.net)} tone={summary.net < 0 ? "danger" : undefined} hint={summary.outgoings > 0 ? `${formatPaise(summary.outgoings)} paid out` : "nothing paid out"} />
        <Stat label="Bookings" value={kpis.bookings} hint={`${bookDelta.text} vs ${range.prevLabel} · ${kpis.utilisationPct}% of court hours`} hintTone={bookDelta.tone} />
        <Stat label="New members" value={kpis.newMembers} hint={`${memberDelta.text} vs ${range.prevLabel}`} hintTone={memberDelta.tone} />
        <Stat label="Avg ticket" value={formatPaise(kpis.avgTicket)} hint={`${kpis.barCovers} bar ${kpis.barCovers === 1 ? "tab" : "tabs"} settled`} />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="Revenue by source"
          actions={
            top && (
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                Top: <strong style={{ color: "var(--color-text)" }}>{formatPaise(top.amount)}</strong> from {summary.bySource.length > 0 ? SOURCE_WORD(top.source) : ""}
              </span>
            )
          }
        >
          {summary.revenue === 0 ? (
            <p className="py-10 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
              Nothing posted to the ledger in this period yet.
            </p>
          ) : (
            <RevenueChart data={daily} sources={summary.bySource.map((s) => s.source)} />
          )}
        </Panel>

        <Panel title="Needs attention">
          <OwnerAlerts alerts={alerts} />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Panel
          className="lg:col-span-3"
          title="Source × payment mode"
          actions={
            <Link href={`/owner/finance?period=${period}`} className="flex items-center gap-1 text-xs font-medium" style={{ color: "var(--color-accent-600)" }}>
              Open ledger <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
          }
        >
          <SourceModeMatrix summary={summary} />
        </Panel>

        <Panel className="lg:col-span-2" title="Court utilisation">
          <UtilisationHeatmap rows={heatmap.rows} hours={heatmap.hours} days={heatmap.days} />
        </Panel>
      </div>
    </div>
  );
}

function SOURCE_WORD(source: string) {
  return (
    {
      COURT: "courts",
      SHOP: "the shop",
      BAR: "the bar",
      MEMBERSHIP: "memberships",
      COACHING: "coaching",
      EVENT: "events",
      CORPORATE: "corporate",
      OTHER: "other",
    } as Record<string, string>
  )[source] ?? source.toLowerCase();
}
