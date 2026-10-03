import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getSlotGrid } from "@/lib/booking/slots";
import { getDeskDaySummary } from "@/lib/booking/queries";
import { addDaysToKey, formatDayLabel, formatTime, parseDateKey, todayKey } from "@/lib/time";
import { formatPaise } from "@/lib/money";
import { prisma } from "@/lib/db";
import { CourtGrid } from "@/components/booking/CourtGrid";
import { tierStyle } from "@/lib/booking/ui";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Front desk" };

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function DeskHomePage({ searchParams }: PageProps) {
  const user = await requireRole("FRONT_DESK", "MANAGER", "OWNER");
  const club = await prisma.club.findUniqueOrThrow({ where: { id: user.clubId }, select: { timezone: true } });
  const tz = club.timezone;

  const params = await searchParams;
  const today = todayKey(tz);
  const dateKey = params.date && parseDateKey(params.date) ? params.date : today;

  const [grid, summary] = await Promise.all([
    getSlotGrid({ clubId: user.clubId, dateKey, revealNames: true }),
    getDeskDaySummary(user.clubId, dateKey, tz),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold tracking-tight">{summary.isToday ? "Today" : formatDayLabel(dateKey, tz)}</h1>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            {summary.total} bookings · {summary.members} members · {summary.walkIns} walk-ins · {formatPaise(summary.revenue)} court revenue
          </p>
        </div>
        <nav className="flex items-center gap-1" aria-label="Change day">
          <Button variant="outline" size="icon" aria-label="Previous day" render={<Link href={`/desk?date=${addDaysToKey(dateKey, -1)}`} />}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" render={<Link href="/desk" />} disabled={summary.isToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" aria-label="Next day" render={<Link href={`/desk?date=${addDaysToKey(dateKey, 1)}`} />}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </nav>
      </header>

      <CourtGrid grid={grid} isToday={summary.isToday} />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="flex flex-col gap-2 rounded-2xl p-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
            On court now · {summary.onCourtNow.length}
          </h2>
          {summary.onCourtNow.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              {summary.isToday ? "Courts are empty right now." : "Only shown for today."}
            </p>
          ) : (
            <ul className="flex flex-col divide-y" style={{ borderColor: "var(--color-border)" }}>
              {summary.onCourtNow.map((b) => (
                <PersonRow key={b.id} b={b} tz={tz} />
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-2 rounded-2xl p-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
            Coming up
          </h2>
          {summary.upcoming.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Nothing more scheduled.</p>
          ) : (
            <ul className="flex flex-col divide-y" style={{ borderColor: "var(--color-border)" }}>
              {summary.upcoming.map((b) => (
                <PersonRow key={b.id} b={b} tz={tz} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function PersonRow({ b, tz }: { b: Awaited<ReturnType<typeof getDeskDaySummary>>["upcoming"][number]; tz: string }) {
  const name = b.member ? `${b.member.firstName} ${b.member.lastName}` : b.walkInName ?? "Walk-in";
  return (
    <li className="flex items-center justify-between gap-3 py-2 text-sm">
      <div className="flex min-w-0 items-center gap-2">
        <span className="w-14 shrink-0 tabular-nums" style={{ color: "var(--color-text-muted)" }}>
          {formatTime(b.startsAt, tz)}
        </span>
        <span className="truncate font-medium">{name}</span>
        <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={tierStyle(b.member?.plan?.tier)}>
          {b.member?.plan?.name ?? "Walk-in"}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2" style={{ color: "var(--color-text-muted)" }}>
        <span>{b.court.name}</span>
        {b.checkedInAt && <span style={{ color: "var(--color-success)" }}>· in</span>}
      </div>
    </li>
  );
}
