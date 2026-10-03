import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getMemberContext, listMemberBookings } from "@/lib/booking/queries";
import { BookingCard } from "@/components/booking/BookingCard";
import { NoMemberProfile } from "@/components/member/NoMemberProfile";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "My bookings" };

export default async function MemberBookingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=%2Fme%2Fbookings");
  const ctx = await getMemberContext(user.userId);
  if (!ctx?.member) return <NoMemberProfile feature="your bookings" />;

  const { upcoming, past } = await listMemberBookings(ctx.member.id);
  const tz = ctx.club.timezone;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">My bookings</h1>
        <Button size="sm" nativeButton={false} render={<Link href="/me/book" />}>
          <CalendarPlus className="h-4 w-4" />
          Book
        </Button>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
          Upcoming · {upcoming.length}
        </h2>
        {upcoming.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl p-8 text-center" style={{ background: "var(--color-surface)", border: "1px dashed var(--color-border-strong)" }}>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              Nothing booked. Courts are waiting.
            </p>
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/me/book" />}>
              Find a slot
            </Button>
          </div>
        ) : (
          upcoming.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              timezone={tz}
              cancellable
              fullCreditHours={ctx.policy.cancelFullCreditHours}
              lateCreditPct={ctx.policy.cancelLateCreditPct}
            />
          ))
        )}
      </section>

      {past.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
            History
          </h2>
          {past.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              timezone={tz}
              fullCreditHours={ctx.policy.cancelFullCreditHours}
              lateCreditPct={ctx.policy.cancelLateCreditPct}
            />
          ))}
        </section>
      )}
    </div>
  );
}
