import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarPlus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getMemberContext, getNextMemberBooking } from "@/lib/booking/queries";
import { formatDateTime } from "@/lib/time";
import { formatPaise } from "@/lib/money";
import { PagePlaceholder } from "@/components/shared/PagePlaceholder";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Home" };

function greeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function MemberHomePage() {
  const user = await getCurrentUser();
  const firstName = user?.name.split(" ")[0] ?? "there";
  const ctx = user ? await getMemberContext(user.userId) : null;
  const next = ctx?.member ? await getNextMemberBooking(ctx.member.id) : null;
  const tz = ctx?.club.timezone ?? "Asia/Kolkata";
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23" }).format(new Date()));

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          {greeting(hour)},
        </p>
        <h1 className="text-2xl font-bold tracking-tight">{firstName}</h1>
      </header>

      <section
        className="flex flex-col gap-3 rounded-2xl p-4"
        style={{ background: "var(--color-primary-500)", color: "#fff" }}
        aria-labelledby="next-booking"
      >
        <div className="flex items-center justify-between">
          <h2 id="next-booking" className="text-xs font-semibold uppercase tracking-wide opacity-80">
            Next on court
          </h2>
          {ctx?.member?.plan && (
            <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: "rgba(255,255,255,0.18)" }}>
              {ctx.member.plan.name}
            </span>
          )}
        </div>
        {next ? (
          <>
            <div className="flex flex-col">
              <span className="text-xl font-bold">{next.court.name}</span>
              <span className="text-sm opacity-90">{formatDateTime(next.startsAt, tz)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm opacity-90">{formatPaise(next.priceCharged, { free: "Included in plan" })}</span>
              <Link href="/me/bookings" className="flex items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline">
                All bookings <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm opacity-90">No upcoming sessions. Evenings fill up fast.</p>
            <Button variant="secondary" size="sm" className="self-start" render={<Link href="/me/book" />}>
              <CalendarPlus className="h-4 w-4" />
              Book a court
            </Button>
          </>
        )}
      </section>

      <PagePlaceholder
        title="Your club, in your pocket"
        phase="Phase 2 — Members"
        description="Your membership card, expiry countdown and tab balance live here, with one-tap shortcuts to the shop and bar."
        bullets={["QR membership card for check-in", "Plan, renew and payment history under Profile", "Bar tab and shop orders"]}
      />
    </div>
  );
}
