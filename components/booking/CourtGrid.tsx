"use client";

/**
 * components/booking/CourtGrid.tsx
 *
 * Front-desk day board: courts as rows, 30-minute starts as columns. Every
 * cell is a button — free opens quick-book, booked opens the detail sheet.
 * A "now" line tracks the current time so staff can read the board at a
 * glance from across the counter.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPaise } from "@/lib/money";
import { toLocalParts } from "@/lib/time";
import type { Slot, SlotGrid } from "@/lib/booking/slots";
import { QuickBookDialog, type QuickBookTarget } from "./QuickBookDialog";
import { BookingDetailDialog, type BookingDetailTarget } from "./BookingDetailDialog";

interface CourtGridProps {
  grid: SlotGrid;
  isToday: boolean;
}

const COL_WIDTH = 68;
const LABEL_WIDTH = 96;

export function CourtGrid({ grid, isToday }: CourtGridProps) {
  const [quick, setQuick] = useState<QuickBookTarget | null>(null);
  const [detail, setDetail] = useState<BookingDetailTarget | null>(null);
  const [nowMin, setNowMin] = useState<number | null>(null);

  useEffect(() => {
    if (!isToday) return;
    const tick = () => {
      const p = toLocalParts(new Date(), grid.timezone);
      setNowMin(p.hour * 60 + p.minute);
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [isToday, grid.timezone]);

  const firstMin = grid.times[0]?.minuteOfDay ?? 0;
  const step = grid.times.length > 1 ? grid.times[1].minuteOfDay - grid.times[0].minuteOfDay : 30;
  const nowX = useMemo(() => {
    if (nowMin == null) return null;
    const lastMin = (grid.times.at(-1)?.minuteOfDay ?? firstMin) + step;
    if (nowMin < firstMin || nowMin > lastMin) return null;
    return LABEL_WIDTH + ((nowMin - firstMin) / step) * COL_WIDTH;
  }, [nowMin, firstMin, step, grid.times]);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const scrolledRef = useRef(false);
  useEffect(() => {
    if (nowX == null || scrolledRef.current || !scrollerRef.current) return;
    scrolledRef.current = true;
    scrollerRef.current.scrollLeft = Math.max(0, nowX - LABEL_WIDTH - COL_WIDTH);
  }, [nowX]);

  // Each booking spans two 30-min columns; render it once at its start
  // column and skip the covered column so the board reads as one block.
  function cellsFor(court: SlotGrid["courts"][number]) {
    const cells: { slot: Slot; span: number; covered: boolean }[] = [];
    let skipUntil: string | null = null;
    for (const slot of court.slots) {
      if (slot.booking && slot.booking.id === skipUntil) {
        cells.push({ slot, span: 1, covered: true });
        continue;
      }
      if (slot.booking) {
        skipUntil = slot.booking.id;
        cells.push({ slot, span: 1, covered: false });
      } else {
        skipUntil = null;
        cells.push({ slot, span: 1, covered: false });
      }
    }
    return cells;
  }

  return (
    <>
      <div ref={scrollerRef} className="overflow-x-auto rounded-2xl" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
        <div className="relative" style={{ minWidth: LABEL_WIDTH + grid.times.length * COL_WIDTH }}>
          <div className="sticky top-0 z-10 flex" style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
            <div className="shrink-0 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide" style={{ width: LABEL_WIDTH, color: "var(--color-text-muted)" }}>
              Court
            </div>
            {grid.times.map((t) => (
              <div
                key={t.minuteOfDay}
                className="shrink-0 py-2 text-center text-[11px] font-medium tabular-nums"
                style={{ width: COL_WIDTH, color: t.minuteOfDay % 60 === 0 ? "var(--color-text)" : "var(--color-text-subtle)" }}
              >
                {t.label}
              </div>
            ))}
          </div>

          {grid.courts.map((court) => (
            <div key={court.id} className="flex" style={{ borderBottom: "1px solid var(--color-border)" }}>
              <div className="flex shrink-0 flex-col justify-center px-3 py-1.5" style={{ width: LABEL_WIDTH }}>
                <span className="text-sm font-semibold">{court.name}</span>
                <span className="text-[11px] capitalize" style={{ color: "var(--color-text-muted)" }}>
                  {court.type.toLowerCase()}
                  {court.isIndoor ? " · indoor" : ""}
                </span>
              </div>
              {cellsFor(court).map(({ slot, covered }) => (
                <div key={slot.minuteOfDay} className="shrink-0 p-1" style={{ width: COL_WIDTH }}>
                  <Cell
                    slot={slot}
                    covered={covered}
                    onClick={() => {
                      if (slot.booking) setDetail({ courtName: court.name, slot });
                      else if (slot.state === "free")
                        setQuick({ courtId: court.id, courtName: court.name, startsAt: slot.startsAt, price: slot.price });
                    }}
                  />
                </div>
              ))}
            </div>
          ))}

          {nowX != null && (
            <div
              aria-hidden
              className="pointer-events-none absolute bottom-0 top-0 z-20 w-px"
              style={{ left: nowX, background: "var(--color-accent-500)" }}
            >
              <span className="absolute -left-1 top-0 h-2 w-2 rounded-full" style={{ background: "var(--color-accent-500)" }} />
            </div>
          )}
        </div>
      </div>

      <QuickBookDialog target={quick} timezone={grid.timezone} onClose={() => setQuick(null)} />
      <BookingDetailDialog target={detail} timezone={grid.timezone} onClose={() => setDetail(null)} />
    </>
  );
}

function Cell({ slot, covered, onClick }: { slot: Slot; covered: boolean; onClick: () => void }) {
  const b = slot.booking;

  if (b) {
    const social = b.kind === "SOCIAL";
    const style: React.CSSProperties = social
      ? { background: "rgba(0,160,157,0.14)", color: "var(--color-accent-600)", borderColor: "rgba(0,160,157,0.3)" }
      : b.checkedIn
        ? { background: "rgba(39,174,96,0.14)", color: "#1e8449", borderColor: "rgba(39,174,96,0.35)" }
        : { background: "var(--color-primary-100)", color: "var(--color-primary-700)", borderColor: "var(--color-primary-200)" };
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`${b.label || "Booking"} at ${slot.label}${b.checkedIn ? ", checked in" : ""}`}
        className={cn(
          "flex h-11 w-full flex-col justify-center overflow-hidden border px-1.5 text-left text-[11px] leading-tight transition-colors hover:brightness-95",
          covered ? "rounded-r-md border-l-0" : "rounded-l-md border-r-0"
        )}
        style={style}
      >
        {!covered && (
          <>
            <span className="flex items-center gap-1 truncate font-semibold">
              {b.checkedIn && <Check className="h-3 w-3 shrink-0" />}
              {social && <Users className="h-3 w-3 shrink-0" />}
              {b.label || (social ? "Social play" : "Booked")}
            </span>
            <span className="truncate opacity-80">{b.kind === "PRIVATE" ? formatPaise(b.priceCharged, { free: "Plan" }) : b.kind.toLowerCase()}</span>
          </>
        )}
      </button>
    );
  }

  if (slot.state === "past") {
    return <div aria-hidden className="h-11 w-full rounded-md" style={{ background: "repeating-linear-gradient(135deg, transparent 0 4px, var(--color-bg) 4px 8px)" }} />;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Book ${slot.label}, ${formatPaise(slot.price.priceCharged)}`}
      className="group flex h-11 w-full items-end justify-end rounded-md border border-dashed px-1.5 pb-1 text-[10px] tabular-nums transition-colors hover:border-solid"
      style={{ borderColor: "var(--color-border)", color: "var(--color-text-subtle)" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--color-primary-50)";
        e.currentTarget.style.borderColor = "var(--color-primary-300)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.borderColor = "var(--color-border)";
      }}
    >
      <span className="opacity-0 transition-opacity group-hover:opacity-100">{formatPaise(slot.price.priceCharged)}</span>
    </button>
  );
}
