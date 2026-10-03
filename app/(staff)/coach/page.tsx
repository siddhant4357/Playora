import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getClub } from "@/lib/club";
import { getCoachWeek, weekStartKey } from "@/lib/coach/queries";
import { addDaysToKey, formatDayLabel, parseDateKey, todayKey, type DateKey } from "@/lib/time";
import { formatPaise } from "@/lib/money";
import { PageHeader, Stat } from "@/components/shared/Primitives";
import { Button } from "@/components/ui/button";
import { SessionCard } from "@/components/coach/SessionCard";

export const metadata: Metadata = { title: "My sessions" };

interface PageProps {
  searchParams: Promise<{ week?: string }>;
}

export default async function CoachSessionsPage({ searchParams }: PageProps) {
  const user = await requireRole("COACH", "MANAGER", "OWNER");
  const club = await getClub(user.clubId);
  const tz = club?.timezone ?? "Asia/Kolkata";

  const sp = await searchParams;
  const anchor = (sp.week && parseDateKey(sp.week) ? sp.week : todayKey(tz)) as DateKey;
  const weekStart = weekStartKey(anchor, tz);
  const thisWeek = weekStartKey(todayKey(tz), tz);

  const isCoach = user.role === "COACH";
  const week = await getCoachWeek({ clubId: user.clubId, coachId: isCoach ? user.userId : null }, weekStart, tz);
  const weekEnd = addDaysToKey(weekStart, 6);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Coaching"
        title={isCoach ? "My sessions" : "Coaching sessions"}
        subtitle={`${formatDayLabel(weekStart, tz)} – ${formatDayLabel(weekEnd, tz)}${isCoach ? "" : " · every coach"}`}
        actions={
          <nav className="flex items-center gap-1" aria-label="Change week">
            <Button variant="outline" size="icon" aria-label="Previous week" render={<Link href={`/coach?week=${addDaysToKey(weekStart, -7)}`} />} nativeButton={false}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" render={<Link href="/coach" />} nativeButton={false} disabled={weekStart === thisWeek}>
              This week
            </Button>
            <Button variant="outline" size="icon" aria-label="Next week" render={<Link href={`/coach?week=${addDaysToKey(weekStart, 7)}`} />} nativeButton={false}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </nav>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Sessions" value={week.stats.sessions} hint={`${week.stats.hours} court hours`} />
        <Stat label="Players" value={week.stats.players} hint="distinct this week" />
        <Stat
          label="Attendance"
          value={week.stats.attendancePct === null ? "—" : `${week.stats.attendancePct}%`}
          hint="of sessions already played"
          tone={week.stats.attendancePct !== null && week.stats.attendancePct < 80 ? "warning" : "success"}
        />
        <Stat label="Coaching revenue" value={formatPaise(week.stats.revenue)} hint="booked this week" />
      </div>

      <ol className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7" aria-label="Week schedule">
        {week.days.map((day) => (
          <li key={day.key} className="flex flex-col gap-2">
            <h2 className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide" style={{ color: day.isToday ? "var(--color-primary-900)" : "var(--color-text-muted)" }}>
              <span>{formatDayLabel(day.key, tz)}</span>
              {day.isToday && <span className="rounded-full px-1.5 py-0.5 text-[10px] text-white" style={{ background: "var(--color-primary-900)" }}>Today</span>}
            </h2>
            {day.sessions.length === 0 ? (
              <p className="rounded-xl p-3 text-xs" style={{ border: "1px dashed var(--color-border)", color: "var(--color-text-muted)" }}>
                No sessions
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {day.sessions.map((s) => (
                  <SessionCard key={s.id} session={s} timezone={tz} showCoach={!isCoach} canLinkMember={!isCoach} />
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
