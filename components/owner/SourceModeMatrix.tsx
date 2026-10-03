import type { PaymentMode, TxSource } from "@/generated/prisma/client";
import type { RevenueSummary } from "@/lib/finance/queries";
import { MODE_LABEL, SOURCE_COLOR, SOURCE_LABEL } from "@/lib/finance/labels";
import { formatPaise } from "@/lib/money";

/**
 * The reconciliation view: every revenue source down the side, every payment
 * mode across the top, totals on both axes. The grand total is the same
 * number as the revenue KPI because both come from the same ledger query.
 */
export function SourceModeMatrix({ summary }: { summary: RevenueSummary }) {
  const sources = summary.bySource.map((s) => s.source);
  const modes = summary.byMode.filter((m) => m.amount > 0).map((m) => m.mode);
  if (sources.length === 0) {
    return (
      <p className="py-6 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
        No revenue in this period yet.
      </p>
    );
  }
  const modeTotal = (m: PaymentMode) => summary.byMode.find((x) => x.mode === m)?.amount ?? 0;
  const sourceTotal = (s: TxSource) => summary.bySource.find((x) => x.source === s)?.amount ?? 0;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm tabular-nums">
        <thead>
          <tr className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            <th className="py-2 pr-2 text-left font-medium">Source</th>
            {modes.map((m) => (
              <th key={m} className="px-2 py-2 text-right font-medium">
                {MODE_LABEL[m]}
              </th>
            ))}
            <th className="py-2 pl-2 text-right font-semibold" style={{ color: "var(--color-text)" }}>
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {sources.map((s) => {
            const total = sourceTotal(s);
            const share = summary.revenue > 0 ? Math.round((total / summary.revenue) * 100) : 0;
            return (
              <tr key={s} style={{ borderTop: "1px solid var(--color-border)" }}>
                <td className="py-2 pr-2">
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: SOURCE_COLOR[s] }} />
                    <span className="flex flex-col leading-tight">
                      <span className="font-medium">{SOURCE_LABEL[s]}</span>
                      <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                        {share}%
                      </span>
                    </span>
                  </div>
                </td>
                {modes.map((m) => {
                  const v = summary.matrix[s]?.[m] ?? 0;
                  return (
                    <td key={m} className="whitespace-nowrap px-2 py-2 text-right" style={{ color: v === 0 ? "var(--color-text-subtle)" : undefined }}>
                      {v === 0 ? "–" : formatPaise(v)}
                    </td>
                  );
                })}
                <td className="whitespace-nowrap py-2 pl-2 text-right font-semibold">{formatPaise(total)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="font-semibold" style={{ borderTop: "2px solid var(--color-border-strong)" }}>
            <td className="py-2 pr-2">Total</td>
            {modes.map((m) => (
              <td key={m} className="whitespace-nowrap px-2 py-2 text-right">
                {formatPaise(modeTotal(m))}
              </td>
            ))}
            <td className="whitespace-nowrap py-2 pl-2 text-right" style={{ color: "var(--color-primary-500)" }}>
              {formatPaise(summary.revenue)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
