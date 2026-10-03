import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getClub } from "@/lib/club";
import { buildZReport } from "@/lib/bar/engine";
import { getCurrentShift, getRecentShifts } from "@/lib/bar/queries";
import { formatPaise } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import { PageHeader, Panel, Pill } from "@/components/shared/Primitives";
import { ShiftControls } from "@/components/bar/ShiftControls";
import { ZReport } from "@/components/bar/ZReport";

export const metadata: Metadata = { title: "Shift" };

export default async function ShiftPage() {
  const user = await requireUser("/bar/shift");
  const [shift, recent, club] = await Promise.all([getCurrentShift(user.clubId), getRecentShifts(user.clubId), getClub(user.clubId)]);
  const tz = club?.timezone ?? "Asia/Kolkata";
  const report = shift ? await buildZReport(user.clubId, shift.id) : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Bar" title="Shift" subtitle={shift ? `Open since ${formatDateTime(shift.startsAt, tz)} · ${shift.openedByName}` : "No shift open. Open one before service so the Z-report reconciles the drawer."} />
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {report ? <ZReport report={JSON.parse(JSON.stringify(report))} live /> : <Panel title="Z-report"><p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Opens with the shift.</p></Panel>}
        <div className="flex flex-col gap-4">
          <ShiftControls shift={shift ? { id: shift.id, openingCash: shift.openingCash } : null} expectedCash={report?.expectedCash ?? 0} />
          <Panel title="Previous shifts">
            {recent.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>None yet.</p>
            ) : (
              <ul className="flex flex-col divide-y text-sm" style={{ borderColor: "var(--color-border)" }}>
                {recent.map((s) => {
                  const diff = (s.closingCash ?? 0) - (s.expectedCash ?? 0);
                  const r = s.report as { gross?: number; tabs?: number } | null;
                  return (
                    <li key={s.id} className="flex items-center justify-between gap-2 py-2">
                      <span className="flex flex-col">
                        <span className="font-medium">{formatDateTime(s.startsAt, tz)}</span>
                        <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                          {s.openedByName} · {r?.tabs ?? 0} tabs · {formatPaise(r?.gross ?? 0)}
                        </span>
                      </span>
                      <Pill tone={diff === 0 ? "success" : "warning"}>{diff === 0 ? "Balanced" : `${diff > 0 ? "+" : "−"}${formatPaise(Math.abs(diff))}`}</Pill>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
