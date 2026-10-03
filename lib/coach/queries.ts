/**
 * lib/coach/queries.ts
 *
 * Read helpers for the coaching module. A coaching session is a Booking with
 * kind = COACHING and a coachId; a "player" is any member who has had one.
 * Coaches only ever see their own sessions; managers and owners see the whole
 * coaching department (coachId = null scope).
 */

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { addDaysToKey, dayStart, toLocalParts, todayKey, type DateKey } from "@/lib/time";

export interface CoachScope {
  clubId: string;
  /** Restrict to one coach (COACH role). Null = every coach in the club. */
  coachId: string | null;
}

function scopeWhere(scope: CoachScope): Prisma.BookingWhereInput {
  return {
    clubId: scope.clubId,
    kind: "COACHING",
    ...(scope.coachId ? { coachId: scope.coachId } : { coachId: { not: null } }),
  };
}

const sessionSelect = {
  id: true,
  startsAt: true,
  endsAt: true,
  status: true,
  checkedInAt: true,
  priceCharged: true,
  court: { select: { id: true, name: true, type: true } },
  coach: { select: { id: true, name: true } },
  member: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      memberCode: true,
      phone: true,
      plan: { select: { tier: true, name: true } },
    },
  },
} satisfies Prisma.BookingSelect;

export type CoachSession = Prisma.BookingGetPayload<{ select: typeof sessionSelect }>;

/** Monday of the week containing `key` (club-local). */
export function weekStartKey(key: DateKey, tz: string): DateKey {
  const parts = toLocalParts(dayStart(key, tz), tz);
  const back = (parts.weekday + 6) % 7; // Monday = 0
  return addDaysToKey(key, -back);
}

export async function getCoachWeek(scope: CoachScope, weekStart: DateKey, tz: string) {
  const start = dayStart(weekStart, tz);
  const end = dayStart(addDaysToKey(weekStart, 7), tz);
  const today = todayKey(tz);

  const sessions = await prisma.booking.findMany({
    where: { ...scopeWhere(scope), startsAt: { gte: start, lt: end }, status: { not: "CANCELLED" } },
    select: sessionSelect,
    orderBy: { startsAt: "asc" },
  });

  const days: { key: DateKey; isToday: boolean; sessions: CoachSession[] }[] = [];
  for (let i = 0; i < 7; i++) {
    const key = addDaysToKey(weekStart, i);
    days.push({ key, isToday: key === today, sessions: [] });
  }
  for (const s of sessions) {
    const parts = toLocalParts(s.startsAt, tz);
    const key = `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}` as DateKey;
    days.find((d) => d.key === key)?.sessions.push(s);
  }

  const past = sessions.filter((s) => s.endsAt.getTime() < Date.now());
  const attended = past.filter((s) => s.checkedInAt !== null).length;
  const players = new Set(sessions.map((s) => s.member?.id).filter(Boolean)).size;

  return {
    weekStart,
    days,
    stats: {
      sessions: sessions.length,
      hours: sessions.reduce((n, s) => n + (s.endsAt.getTime() - s.startsAt.getTime()) / 3_600_000, 0),
      players,
      attendancePct: past.length ? Math.round((attended / past.length) * 100) : null,
      revenue: sessions.reduce((n, s) => n + s.priceCharged, 0),
    },
  };
}

export async function listCoachPlayers(scope: CoachScope) {
  const sessions = await prisma.booking.findMany({
    where: { ...scopeWhere(scope), memberId: { not: null }, status: { not: "CANCELLED" } },
    select: sessionSelect,
    orderBy: { startsAt: "asc" },
  });

  const byMember = new Map<
    string,
    {
      member: NonNullable<CoachSession["member"]>;
      total: number;
      attended: number;
      completed: number;
      last: Date | null;
      next: Date | null;
      coaches: Set<string>;
    }
  >();

  const now = Date.now();
  for (const s of sessions) {
    if (!s.member) continue;
    const row = byMember.get(s.member.id) ?? { member: s.member, total: 0, attended: 0, completed: 0, last: null, next: null, coaches: new Set<string>() };
    row.total++;
    if (s.coach) row.coaches.add(s.coach.name);
    if (s.endsAt.getTime() < now) {
      row.completed++;
      if (s.checkedInAt) row.attended++;
      row.last = s.startsAt;
    } else if (!row.next) {
      row.next = s.startsAt;
    }
    byMember.set(s.member.id, row);
  }

  const memberIds = [...byMember.keys()];
  const notes = memberIds.length
    ? await prisma.memberNote.findMany({
        where: { memberId: { in: memberIds } },
        orderBy: { createdAt: "desc" },
        select: { memberId: true, content: true, createdAt: true },
      })
    : [];
  const latestNote = new Map<string, { content: string; createdAt: Date }>();
  for (const n of notes) if (!latestNote.has(n.memberId)) latestNote.set(n.memberId, n);

  return [...byMember.values()]
    .map((r) => ({
      ...r,
      coaches: [...r.coaches],
      attendancePct: r.completed ? Math.round((r.attended / r.completed) * 100) : null,
      latestNote: latestNote.get(r.member.id) ?? null,
    }))
    .sort((a, b) => (b.next?.getTime() ?? 0) - (a.next?.getTime() ?? 0) || b.total - a.total);
}

export type CoachPlayerRow = Awaited<ReturnType<typeof listCoachPlayers>>[number];
