import Link from "next/link";
import { formatPaise } from "@/lib/money";
import type { FreeSlotCard } from "@/lib/leads/queries";

interface Props {
  slots: FreeSlotCard[];
}

export function LiveStrip({ slots }: Props) {
  return (
    <section className="strip l-container fu" id="courts" aria-labelledby="strip-title">
      <div className="strip-head">
        <div>
          <span className="live">
            <i aria-hidden="true" /> Free this week
          </span>
          <h2 id="strip-title">Grab a court before the Friday rush does</h2>
        </div>
        <p>
          Live from the booking board. Guests pay the list price, Gold members see &ldquo;Free&rdquo;, and a trial is on the house.{" "}
          <Link href="/courts">See the full week</Link>
        </p>
      </div>
      <div className="strip-row" role="list">
        {slots.length === 0 && (
          <p className="pub-note" role="listitem">
            Evenings are full this week — <Link href="/courts">check the full board</Link> for daytime slots.
          </p>
        )}
        {slots.map((s) => (
          <Link
            className="sc"
            role="listitem"
            key={`${s.courtId}-${s.startsAt}`}
            href={`/trial?court=${s.courtId}&at=${encodeURIComponent(s.startsAt)}`}
            aria-label={`${s.dayLabel} ${s.time}, ${s.courtName} — book a free trial`}
          >
            <span className="d">{s.dayLabel}</span>
            <span className="t">{s.time}</span>
            <span className="c">{s.courtName}</span>
            <div className="p">
              <span>
                <s>{formatPaise(s.listPrice)}</s>
                <b>Free trial</b>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
