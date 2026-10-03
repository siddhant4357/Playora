import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getSlotGrid } from "@/lib/booking/slots";
import { countMemberBookingsOnDay, getMemberContext } from "@/lib/booking/queries";
import { addDaysToKey, dayStart, parseDateKey, toLocalParts, todayKey } from "@/lib/time";
import { formatPaise } from "@/lib/money";
import { DayStrip, type DayOption } from "@/components/booking/DayStrip";
import { SlotPicker } from "@/components/booking/SlotPicker";
import { cn } from "@/lib/utils";
import type { CourtType } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Book a court" };

const SPORTS: { value: CourtType | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "TENNIS", label: "Tennis" },
  { value: "PADEL", label: "Padel" },
];

interface PageProps {
  searchParams: Promise<{ date?: string; sport?: string }>;
}

export default async function MemberBookPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=%2Fme%2Fbook");

  const ctx = await getMemberContext(user.userId);
  if (!ctx) redirect("/login");
  const tz = ctx.club.timezone;

  const params = await searchParams;
  const today = todayKey(tz);
  const maxKey = addDaysToKey(today, ctx.advanceDays);
  const requested = params.date && parseDateKey(params.date) ? params.date : today;
  const dateKey = requested < today ? today : requested > maxKey ? maxKey : requested;
  const sport = SPORTS.some((s) => s.value === params.sport) ? (params.sport as CourtType | "ALL") : "ALL";

  const hrefFor = (key: string) => `/me/book?date=${key}${sport !== "ALL" ? `&sport=${sport}` : ""}`;
  const days: DayOption[] = Array.from({ length: ctx.advanceDays + 1 }, (_, i) => {
    const key = addDaysToKey(today, i);
    const p = toLocalParts(dayStart(key, tz), tz);
    return {
      key,
      href: hrefFor(key),
      weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][p.weekday],
      day: String(p.day),
      isToday: i === 0,
    };
  });

  const [grid, bookedToday] = await Promise.all([
    getSlotGrid({
      clubId: ctx.club.id,
      dateKey,
      viewerMemberId: ctx.member?.id,
      planId: ctx.member?.plan?.id,
      courtType: sport === "ALL" ? null : sport,
    }),
    ctx.member ? countMemberBookingsOnDay(ctx.member.id, dateKey, tz) : Promise.resolve(0),
  ]);

  const remaining = Math.max(0, ctx.maxPerDay - bookedToday);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-bold tracking-tight">Book a court</h1>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            {ctx.member?.plan ? `${ctx.member.plan.name} plan` : "No active plan"} ·{" "}
            {remaining === 0 ? "daily limit reached" : `${remaining} of ${ctx.maxPerDay} left on this day`}
          </p>
        </div>
        {ctx.member && ctx.member.creditBalance > 0 && (
          <span
            className="rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{ background: "rgba(0,160,157,0.12)", color: "var(--color-accent-600)" }}
          >
            {formatPaise(ctx.member.creditBalance)} credit
          </span>
        )}
      </header>

      {!ctx.member && (
        <p className="rounded-xl p-4 text-sm" style={{ background: "rgba(230,126,34,0.1)", color: "var(--color-warning)" }}>
          Your login is not linked to a member record. Ask the front desk to link it.
        </p>
      )}

      <DayStrip days={days} selected={dateKey} />

      <div className="flex gap-2" role="tablist" aria-label="Sport">
        {SPORTS.map((s) => {
          const active = s.value === sport;
          return (
            <Link
              key={s.value}
              role="tab"
              aria-selected={active}
              scroll={false}
              href={`/me/book?date=${dateKey}${s.value !== "ALL" ? `&sport=${s.value}` : ""}`}
              className={cn("rounded-full px-3 py-1 text-xs font-medium transition-colors")}
              style={{
                background: active ? "var(--color-text)" : "var(--color-surface)",
                color: active ? "var(--color-bg)" : "var(--color-text-muted)",
                border: "1px solid var(--color-border)",
              }}
            >
              {s.label}
            </Link>
          );
        })}
      </div>

      <SlotPicker grid={grid} remainingToday={ctx.member ? remaining : 0} />
    </div>
  );
}
