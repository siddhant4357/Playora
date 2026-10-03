import type { buildZReport } from "@/lib/bar/engine";
import { formatPaise } from "@/lib/money";
import { Panel, Stat } from "@/components/shared/Primitives";

export function ZReport({ report, live }: { report: Awaited<ReturnType<typeof buildZReport>>; live?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Gross sales" value={formatPaise(report.gross)} hint={`${report.tabs} tabs · avg ${formatPaise(report.avgTab)}`} />
        <Stat label="Expected cash" value={formatPaise(report.expectedCash)} hint={`Float ${formatPaise(report.openingCash)} + cash ${formatPaise(report.byMode.CASH ?? 0)}`} />
        <Stat label="Discounts" value={formatPaise(report.discount)} tone={report.discount > 0 ? "warning" : "default"} />
        <Stat label="Voids" value={report.voids} tone={report.voids > 0 ? "danger" : "default"} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Panel title={live ? "By payment mode (live)" : "By payment mode"}>
          <ul className="flex flex-col gap-1 text-sm">
            {Object.entries(report.byMode).length === 0 && <li style={{ color: "var(--color-text-muted)" }}>No settled tabs yet.</li>}
            {Object.entries(report.byMode).map(([k, v]) => (
              <li key={k} className="flex justify-between"><span>{k}</span><span className="font-semibold tabular-nums">{formatPaise(v)}</span></li>
            ))}
            <li className="mt-1 flex justify-between border-t pt-1 text-xs" style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}><span>of which GST</span><span className="tabular-nums">{formatPaise(report.tax)}</span></li>
          </ul>
        </Panel>
        <Panel title="Top sellers">
          <ol className="flex flex-col gap-1 text-sm">
            {report.topItems.length === 0 && <li style={{ color: "var(--color-text-muted)" }}>—</li>}
            {report.topItems.map((t) => (
              <li key={t.name} className="flex justify-between"><span>{t.name}</span><span className="tabular-nums">{t.qty}</span></li>
            ))}
          </ol>
        </Panel>
      </div>
    </div>
  );
}
