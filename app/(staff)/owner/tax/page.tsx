import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatPaise } from "@/lib/money";
import { formatDate } from "@/lib/time";
import { getTaxReport, periodRange } from "@/lib/finance/queries";
import { SOURCE_COLOR, SOURCE_LABEL } from "@/lib/finance/labels";
import { PageHeader, Panel, Stat } from "@/components/shared/Primitives";
import { PeriodToggle, parsePeriod } from "@/components/owner/PeriodToggle";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Tax" };

export default async function TaxPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const user = await requireRole("OWNER");
  const club = await prisma.club.findUniqueOrThrow({ where: { id: user.clubId }, select: { timezone: true } });
  const period = parsePeriod((await searchParams).period);
  const range = periodRange(period, club.timezone);
  const report = await getTaxReport(user.clubId, range.from, range.to);
  const rates = report.byRate.map((r) => r.ratePct);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Finance"
        title="GST collected"
        subtitle={`${formatDate(range.from, club.timezone)} – ${formatDate(new Date(range.to.getTime() - 1), club.timezone)} · ${report.count} taxable transactions. Rates are read back from the ledger, so this reconciles with revenue to the paisa.`}
        actions={
          <>
            <PeriodToggle period={period} basePath="/owner/tax" />
            <Button variant="outline" size="sm" render={<Link href={`/owner/finance/export?period=${period}&direction=IN`} prefetch={false} />} nativeButton={false}>
              <Download className="h-4 w-4" /> Ledger CSV
            </Button>
          </>
        }
      />

      <section aria-label="Totals" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Output GST" value={formatPaise(report.totalTax)} hint="to remit in GSTR-3B" tone="warning" />
        <Stat label="Taxable value" value={formatPaise(report.totalTaxable)} />
        <Stat label="Gross collected" value={formatPaise(report.totalTaxable + report.totalTax)} />
        <Stat label="Effective rate" value={report.totalTaxable > 0 ? `${((report.totalTax / report.totalTaxable) * 100).toFixed(1)}%` : "–"} hint="blended across slabs" />
      </section>

      <div className="grid gap-4 lg:grid-cols-5">
        <Panel className="lg:col-span-2" title="By rate slab">
          {report.byRate.length === 0 ? (
            <p className="py-6 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
              No taxable sales in this period.
            </p>
          ) : (
            <table className="w-full text-sm tabular-nums">
              <thead>
                <tr className="text-left text-xs" style={{ color: "var(--color-text-muted)" }}>
                  <th className="py-2 pr-3 font-medium">Rate</th>
                  <th className="py-2 pr-3 text-right font-medium">Taxable</th>
                  <th className="py-2 pr-3 text-right font-medium">CGST</th>
                  <th className="py-2 pr-3 text-right font-medium">SGST</th>
                  <th className="py-2 pl-3 text-right font-medium">Total GST</th>
                </tr>
              </thead>
              <tbody>
                {report.byRate.map((r) => (
                  <tr key={r.ratePct} style={{ borderTop: "1px solid var(--color-border)" }}>
                    <td className="py-2 pr-3 font-semibold">{r.ratePct}%</td>
                    <td className="py-2 pr-3 text-right">{formatPaise(r.taxable)}</td>
                    <td className="py-2 pr-3 text-right" style={{ color: "var(--color-text-muted)" }}>
                      {formatPaise(Math.floor(r.tax / 2))}
                    </td>
                    <td className="py-2 pr-3 text-right" style={{ color: "var(--color-text-muted)" }}>
                      {formatPaise(r.tax - Math.floor(r.tax / 2))}
                    </td>
                    <td className="py-2 pl-3 text-right font-semibold">{formatPaise(r.tax)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold" style={{ borderTop: "2px solid var(--color-border-strong)" }}>
                  <td className="py-2 pr-3">Total</td>
                  <td className="py-2 pr-3 text-right">{formatPaise(report.totalTaxable)}</td>
                  <td className="py-2 pr-3 text-right">{formatPaise(Math.floor(report.totalTax / 2))}</td>
                  <td className="py-2 pr-3 text-right">{formatPaise(report.totalTax - Math.floor(report.totalTax / 2))}</td>
                  <td className="py-2 pl-3 text-right" style={{ color: "var(--color-primary-500)" }}>
                    {formatPaise(report.totalTax)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </Panel>

        <Panel className="lg:col-span-3" title="By source × rate">
          {report.bySource.length === 0 ? (
            <p className="py-6 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
              Nothing to show.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm tabular-nums">
                <thead>
                  <tr className="text-left text-xs" style={{ color: "var(--color-text-muted)" }}>
                    <th className="py-2 pr-3 font-medium">Source</th>
                    {rates.map((r) => (
                      <th key={r} className="px-2 py-2 text-right font-medium">
                        {r}%
                      </th>
                    ))}
                    <th className="py-2 pl-3 text-right font-medium">GST</th>
                  </tr>
                </thead>
                <tbody>
                  {report.bySource.map((s) => (
                    <tr key={s.source} style={{ borderTop: "1px solid var(--color-border)" }}>
                      <td className="whitespace-nowrap py-2 pr-3">
                        <span className="inline-flex items-center gap-2">
                          <span className="inline-block h-2 w-2 rounded-sm" style={{ background: SOURCE_COLOR[s.source] }} />
                          {SOURCE_LABEL[s.source]}
                        </span>
                      </td>
                      {rates.map((r) => {
                        const cell = s.cells.find((c) => c.ratePct === r);
                        return (
                          <td key={r} className="whitespace-nowrap px-2 py-2 text-right" style={{ color: cell ? undefined : "var(--color-text-subtle)" }}>
                            {cell ? formatPaise(cell.tax) : "–"}
                          </td>
                        );
                      })}
                      <td className="whitespace-nowrap py-2 pl-3 text-right font-semibold">{formatPaise(s.tax)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-pretty" style={{ color: "var(--color-text-muted)" }}>
            Courts, memberships and coaching at 18%; café food at 5%; shop goods at 12% or 18%. Prices at the counter are tax-inclusive, so the ledger carries the split per transaction and this page just adds it up.
          </p>
        </Panel>
      </div>
    </div>
  );
}
