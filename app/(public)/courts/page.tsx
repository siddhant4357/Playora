import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDefaultClub } from "@/lib/club";
import { getSlotGrid } from "@/lib/booking/slots";
import { getPublicCourts, nowMinuteOfDay } from "@/lib/leads/queries";
import { addDaysToKey, formatDayLabel, parseDateKey, todayKey } from "@/lib/time";
import { formatPaise } from "@/lib/money";
import { titleCase } from "@/lib/public/labels";

export const metadata: Metadata = {
  title: "Courts & availability — The Champions Club",
  description: "Live court availability for the next seven days. Pick a free slot and book a trial, or sign in to book as a member.",
};

export default async function CourtsPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const club = await getDefaultClub();
  if (!club) notFound();
  const tz = club.timezone;
  const today = todayKey(tz);
  const { date } = await searchParams;
  const dateKey = date && parseDateKey(date) ? date : today;
  const days = Array.from({ length: 7 }, (_, i) => addDaysToKey(today, i));
  const nowMin = nowMinuteOfDay(tz);

  const [grid, courts] = await Promise.all([getSlotGrid({ clubId: club.id, dateKey }), getPublicCourts(club.id)]);
  const freeCount = grid.courts.reduce((n, c) => n + c.slots.filter((s) => s.state === "free").length, 0);
  const dayFmt = new Intl.DateTimeFormat("en-IN", { weekday: "short", timeZone: tz });

  return (
    <>
      <nav className="pub-crumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link> <span aria-hidden="true">/</span> <span>Courts</span>
      </nav>
      <header className="pub-head">
        <span className="eyebrow">Live availability</span>
        <h1>Every court, every slot, right now.</h1>
        <p>
          This is the same board the front desk looks at. Green is free. Pick a slot to book a free trial, or sign in and the price
          becomes <em>your</em> price.
        </p>
      </header>

      <div className="pub-days" role="tablist" aria-label="Choose a day">
        {days.map((k) => {
          const d = new Date(`${k}T12:00:00`);
          return (
            <Link key={k} href={`/courts?date=${k}`} className="pub-day" aria-current={k === dateKey ? "date" : undefined} role="tab">
              <span>{k === today ? "Today" : dayFmt.format(d)}</span>
              <b>{Number(k.slice(-2))}</b>
            </Link>
          );
        })}
      </div>

      <p className="pub-note" style={{ margin: "14px 0 10px" }}>
        <strong style={{ color: "var(--ink)" }}>{formatDayLabel(dateKey, tz)}</strong> · {freeCount} free hour-long sessions · open {club.opensAt}–{club.closesAt}
      </p>

      <div className="pub-grid" role="region" aria-label="Court availability" tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th scope="col">Court</th>
              {grid.times.map((t) => (
                <th key={t.minuteOfDay} scope="col">
                  {t.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.courts.map((c) => (
              <tr key={c.id}>
                <th scope="row">
                  {c.name}
                  <small>
                    {titleCase(c.type)}
                    {c.isIndoor ? " · Indoor" : ""}
                  </small>
                </th>
                {c.slots.map((s) => {
                  const isPast = dateKey === today && s.minuteOfDay <= nowMin;
                  if (s.state === "free" && !isPast) {
                    return (
                      <td key={s.minuteOfDay}>
                        <Link
                          className="slot slot-free"
                          href={`/trial?court=${c.id}&at=${encodeURIComponent(s.startsAt.toISOString())}`}
                          aria-label={`${c.name} at ${s.label}, ${formatPaise(s.price.listPrice)} — book a trial`}
                        >
                          {s.label}
                          <small>{formatPaise(s.price.listPrice)}</small>
                        </Link>
                      </td>
                    );
                  }
                  const cls = isPast || s.state === "past" ? "slot-past" : s.state === "social" ? "slot-social" : "slot-busy";
                  return (
                    <td key={s.minuteOfDay}>
                      <span className={`slot ${cls}`} aria-label={`${c.name} at ${s.label}: ${s.state === "social" ? "social play" : isPast ? "passed" : "booked"}`}>
                        {s.state === "social" ? "Social" : isPast || s.state === "past" ? "—" : "Booked"}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pub-legend" aria-hidden="true">
        <span><i style={{ background: "var(--mint-soft)", border: "1px solid var(--mint)" }} />Free — tap to book a trial</span>
        <span><i style={{ background: "var(--surface)" }} />Booked</span>
        <span><i style={{ background: "var(--plum-soft)" }} />Friday social play</span>
      </div>

      <section style={{ marginTop: 56 }} aria-labelledby="courts-title">
        <div className="sec-head" style={{ textAlign: "left", margin: "0 0 20px" }}>
          <h2 id="courts-title" style={{ fontSize: "1.6rem" }}>
            The courts
          </h2>
          <p>Walk-in prices. Members pay less or nothing depending on plan — see <Link href="/plans">plans</Link>.</p>
        </div>
        <div className="pub-courts">
          {courts.map((c) => (
            <article className="court-card" key={c.id}>
              <h3>{c.name}</h3>
              <p className="meta">
                {titleCase(c.type)}
                {c.surface ? ` · ${titleCase(c.surface)}` : ""}
                {c.isIndoor ? " · Indoor" : " · Outdoor"}
              </p>
              <div className="bands">
                {c.pricing
                  .slice()
                  .sort((a, b) => a.dayType.localeCompare(b.dayType) || a.startHour - b.startHour)
                  .map((b) => (
                    <span key={`${b.dayType}-${b.startHour}`}>
                      <span>
                        {titleCase(b.dayType)} {b.label.toLowerCase()} ({b.startHour}:00–{b.endHour}:00)
                      </span>
                      <b>{formatPaise(b.walkInPrice)}/hr</b>
                    </span>
                  ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="cta-box" style={{ marginTop: 56 }}>
        <div>
          <h2>Not a member yet?</h2>
          <p>Your first session is on us. Pick a free slot above or let us pick one for you.</p>
        </div>
        <div className="cta-actions">
          <Link href="/trial" className="btn btn-primary btn-lg">
            Book a free trial
          </Link>
          <Link href="/login?next=/me/book" className="btn btn-outline btn-lg">
            Member? Sign in to book
          </Link>
        </div>
      </div>
    </>
  );
}
