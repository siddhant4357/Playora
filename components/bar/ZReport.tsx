import { formatPaise } from "@/lib/money";
import { Panel, Stat } from "@/components/shared/Primitives";

export type ZReportData = {
  tabs: number;
  voids: number;
  gross: number;
  discount: number;
  tax: number;
  byMode: Record<string, number>;
  openingCash: number;
  expectedCash: number;
  avgTab: number;
  topItems: { name: string; qty: number }[];
};

export function ZReport({ report, live }: { report: ZReportData; live?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label={live ? "Sales so far" : "Sales"} value={formatPaise(report.gross)} hint={`${report.tabs} tabs · avg ${formatPaise(report.avgTab)}`} />
        <Stat label="Expected cash in drawer" value={formatPaise(report.expectedCash)} hint={`Float ${formatPaise(report.openingCash)} + cash sales ${formatPaise(report.byMode.CASH ?? 0)}`} />
        <Stat label="Voids / discounts" value={report.voids} hint={`${formatPaise(report.discount)} discounted · ${formatPaise(report.tax)} GST`} tone={report.voids > 2 ? "warning" : "default"} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="By payment mode">
          <ul className="flex flex-col divide-y text-sm" style={{ borderColor: "var(--color-border)" }}>
            {["CASH", "UPI", "CARD", "CREDIT", "COMPLIMENTARY"].map((m) => (
              <li key={m} className="flex items-center justify-between py-2">
                <span>{m}</span>
                <span className="tabular-nums">{formatPaise(report.byMode[m] ?? 0)}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Top sellers">
          {report.topItems.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Nothing sold yet.</p>
          ) : (
            <ol className="flex flex-col divide-y text-sm" style={{ borderColor: "var(--color-border)" }}>
              {report.topItems.map((t, i) => (
                <li key={t.name} className="flex items-center justify-between py-2">
                  <span>
                    <span className="mr-2 tabular-nums" style={{ color: "var(--color-text-muted)" }}>
                      {i + 1}
                    </span>
                    {t.name}
                  </span>
                  <span className="tabular-nums">{t.qty}</span>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
    </div>
  );
}
