import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getClub } from "@/lib/club";
import { buildZReport } from "@/lib/bar/engine";
import { getCurrentShift, getRecentShifts } from "@/lib/bar/queries";
import { formatPaise } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import { PageHeader, Panel } from "@/components/shared/Primitives";
import { ShiftControls } from "@/components/bar/ShiftControls";
import { ZReport } from "@/components/bar/ZReport";

export const metadata: Metadata = { title: "Shift" };

export default async function ShiftPage() {
  const user = await requireUser("/bar/shift");
  const [club, shift, recent] = await Promise.all([getClub(user.clubId), getCurrentShift(user.clubId), getRecentShifts(user.clubId)]);
  const tz = club?.timezone ?? "Asia/Kolkata";
  const live = shift ? await buildZReport(user.clubId, shift.id) : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Bar & cafe" title="Shift & Z-report" subtitle={shift ? `Opened by ${shift.openedByName} at ${formatDateTime(shift.startsAt, tz)}` : "No shift open. Count the float and open one to start the day."} />
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        {live ? <ZReport report={live} live /> : <Panel><p className="text-sm" style={{ color: "var(--color-text-muted)" }}>The live Z-report appears here once a shift is open: sales by payment mode, expected cash, voids and top sellers.</p></Panel>}
        <ShiftControls shift={shift ? { id: shift.id, openingCash: shift.openingCash } : null} expectedCash={live?.expectedCash ?? 0} />
      </div>
      {recent.length > 0 && (
        <Panel title="Previous shifts">
          <ul className="flex flex-col divide-y text-sm" style={{ borderColor: "var(--color-border)" }}>
            {recent.map((s) => {
              const r = s.report as { gross?: number; tabs?: number } | null;
              const diff = (s.closingCash ?? 0) - (s.expectedCash ?? 0);
              return (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="flex flex-col">
                    <span className="font-medium">{formatDateTime(s.startsAt, tz)} → {s.endsAt ? s.endsAt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: tz }) : "—"}</span>
                    <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{s.openedByName} · {r?.tabs ?? 0} tabs</span>
                  </span>
                  <span className="flex flex-col items-end">
                    <span className="font-semibold tabular-nums">{formatPaise(r?.gross ?? 0)}</span>
                    <span className="text-xs tabular-nums" style={{ color: diff === 0 ? "var(--color-success)" : "var(--color-danger)" }}>{diff === 0 ? "Cash balanced" : `${diff > 0 ? "Over" : "Short"} ${formatPaise(Math.abs(diff))}`}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
    </div>
  );
}
