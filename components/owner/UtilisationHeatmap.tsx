import type { HeatmapRow } from "@/lib/finance/queries";

function hourLabel(h: number) {
  if (h === 0 || h === 24) return "12a";
  if (h === 12) return "12p";
  return h < 12 ? `${h}a` : `${h - 12}p`;
}

/** Court × hour occupancy. Cell intensity = share of days in the period that hour was booked. */
export function UtilisationHeatmap({ rows, hours, days }: { rows: HeatmapRow[]; hours: number[]; days: number }) {
  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
        No active courts.
      </p>
    );
  }
  const peak = rows.flatMap((r) => r.hours).reduce((best, c) => (c.count > best.count ? c : best), { hour: hours[0], count: 0, pct: 0 });
  const quietest = hours
    .map((hour) => ({ hour, count: rows.reduce((s, r) => s + (r.hours.find((c) => c.hour === hour)?.count ?? 0), 0) }))
    .sort((a, b) => a.count - b.count)[0];

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="grid gap-1 text-[11px]" style={{ gridTemplateColumns: `3.5rem repeat(${hours.length}, minmax(0, 1fr))` }}>
        <div />
        {hours.map((h, i) => (
          <div key={h} className="text-center tabular-nums" style={{ color: "var(--color-text-muted)" }}>
            {i % 2 === 0 ? hourLabel(h) : ""}
          </div>
        ))}
        {rows.map((r) => (
          <HeatRow key={r.courtId} row={r} days={days} />
        ))}
      </div>
      <p className="text-xs text-pretty" style={{ color: "var(--color-text-muted)" }}>
        {peak.count > 0 ? (
          <>
            Busiest hour <strong style={{ color: "var(--color-text)" }}>{hourLabel(peak.hour)}</strong>
            {quietest && quietest.count === 0 ? (
              <>
                {" "}· <strong style={{ color: "var(--color-text)" }}>{hourLabel(quietest.hour)}</strong> is empty on every court — the cheapest slot to fill.
              </>
            ) : quietest ? (
              <>
                {" "}· quietest {hourLabel(quietest.hour)}.
              </>
            ) : null}
          </>
        ) : (
          <>No bookings in this period yet.</>
        )}
      </p>
    </div>
  );
}

function HeatRow({ row, days }: { row: HeatmapRow; days: number }) {
  return (
    <>
      <div className="truncate self-center pr-1 text-xs font-medium" title={row.courtName}>
        {row.courtName.replace(/^Court /, "C")}
      </div>
      {row.hours.map((c) => (
        <div
          key={c.hour}
          role="img"
          aria-label={`${row.courtName}, ${hourLabel(c.hour)}: booked ${c.count} of ${days}`}
          title={`${row.courtName} · ${hourLabel(c.hour)} · ${c.count}/${days} booked`}
          className="aspect-square rounded-[3px]"
          style={{
            background: c.pct === 0 ? "var(--color-bg)" : `color-mix(in oklab, var(--color-primary-500) ${Math.max(12, c.pct)}%, var(--color-surface))`,
            border: "1px solid var(--color-border)",
          }}
        />
      ))}
    </>
  );
}
