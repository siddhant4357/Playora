import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Download } from "lucide-react";
import type { PaymentMode, TxSource } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatPaise } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import { listLedger, periodRange } from "@/lib/finance/queries";
import { MODE_LABEL, SOURCE_COLOR, SOURCE_LABEL } from "@/lib/finance/labels";
import { PageHeader, Panel, Pill, Stat } from "@/components/shared/Primitives";
import { PeriodToggle, parsePeriod } from "@/components/owner/PeriodToggle";
import { LedgerFilters, parseLedgerFilters } from "@/components/owner/LedgerFilters";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Ledger" };

const REF_HREF: Record<string, (id: string) => string> = {
  Invoice: (id) => `/owner/invoices/${id}`,
  Payable: () => "/owner/payables",
  Booking: () => "/desk/bookings",
  BarTab: (id) => `/bar/tabs/${id}`,
  ShopOrder: () => "/shop-pos/orders",
};

export default async function LedgerPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireRole("OWNER");
  const club = await prisma.club.findUniqueOrThrow({ where: { id: user.clubId }, select: { timezone: true } });
  const sp = await searchParams;
  const period = parsePeriod(sp.period);
  const range = periodRange(period, club.timezone);
  const filters = parseLedgerFilters(sp);

  const { rows, totals } = await listLedger(user.clubId, { from: range.from, to: range.to, ...filters, take: 300 });
  const exportQs = new URLSearchParams({ period, ...(filters.source ? { source: filters.source } : {}), ...(filters.mode ? { mode: filters.mode } : {}), ...(filters.direction ? { direction: filters.direction } : {}), ...(filters.q ? { q: filters.q } : {}) });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Finance"
        title="Ledger"
        subtitle="Every rupee in or out of the club, whichever module made it. The dashboard, tax report and invoices all read from this one table."
        actions={
          <>
            <PeriodToggle period={period} basePath="/owner/finance" />
            <Button variant="outline" size="sm" render={<Link href={`/owner/finance/export?${exportQs}`} prefetch={false} />} nativeButton={false}>
              <Download className="h-4 w-4" /> CSV
            </Button>
          </>
        }
      />

      <section aria-label="Totals" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Money in" value={formatPaise(totals.in)} tone="success" />
        <Stat label="Money out" value={formatPaise(totals.out)} tone={totals.out > 0 ? "danger" : undefined} />
        <Stat label="Net" value={formatPaise(totals.in - totals.out)} />
        <Stat label="GST in the above" value={formatPaise(totals.tax)} hint={`${totals.count} ${totals.count === 1 ? "entry" : "entries"}`} />
      </section>

      <Panel title="Entries" actions={<LedgerFilters period={period} filters={filters} />}>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
            Nothing matches. Widen the period or clear a filter.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs" style={{ color: "var(--color-text-muted)" }}>
                  <th className="py-2 pr-3 font-medium">When</th>
                  <th className="py-2 pr-3 font-medium">Source</th>
                  <th className="py-2 pr-3 font-medium">Description</th>
                  <th className="py-2 pr-3 font-medium">Mode</th>
                  <th className="py-2 pr-3 font-medium">By</th>
                  <th className="py-2 pl-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const out = r.direction === "OUT";
                  const href = r.refType && r.refId ? REF_HREF[r.refType]?.(r.refId) : undefined;
                  return (
                    <tr key={r.id} style={{ borderTop: "1px solid var(--color-border)" }}>
                      <td className="whitespace-nowrap py-2 pr-3 tabular-nums" style={{ color: "var(--color-text-muted)" }}>
                        {formatDateTime(r.createdAt, club.timezone)}
                      </td>
                      <td className="whitespace-nowrap py-2 pr-3">
                        <span className="inline-flex items-center gap-2">
                          <span className="inline-block h-2 w-2 rounded-sm" style={{ background: SOURCE_COLOR[r.source as TxSource] }} />
                          {SOURCE_LABEL[r.source as TxSource]}
                        </span>
                      </td>
                      <td className="max-w-[28rem] py-2 pr-3">
                        <div className="flex flex-col">
                          {href ? (
                            <Link href={href} className="truncate font-medium hover:underline">
                              {r.description}
                            </Link>
                          ) : (
                            <span className="truncate font-medium">{r.description}</span>
                          )}
                          <span className="truncate text-xs" style={{ color: "var(--color-text-muted)" }}>
                            {[r.member ? `${r.member.firstName} ${r.member.lastName} · ${r.member.memberCode}` : null, r.reference ? `Ref ${r.reference}` : null, r.tax > 0 ? `GST ${formatPaise(r.tax)}` : null].filter(Boolean).join(" · ") || `#${r.hashId}`}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 pr-3">
                        <Pill tone={r.paymentMode === "COMPLIMENTARY" ? "warning" : "neutral"}>{MODE_LABEL[r.paymentMode as PaymentMode]}</Pill>
                      </td>
                      <td className="whitespace-nowrap py-2 pr-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
                        {r.byUser?.name ?? "System"}
                      </td>
                      <td className="whitespace-nowrap py-2 pl-3 text-right font-semibold tabular-nums" style={{ color: out ? "var(--color-danger)" : "var(--color-text)" }}>
                        <span className="inline-flex items-center gap-1">
                          {out ? <ArrowUpRight className="h-3.5 w-3.5" aria-label="Out" /> : <ArrowDownLeft className="h-3.5 w-3.5" aria-label="In" style={{ color: "var(--color-success)" }} />}
                          {out ? "−" : ""}
                          {formatPaise(r.amount)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {rows.length >= 300 && (
              <p className="pt-3 text-center text-xs" style={{ color: "var(--color-text-muted)" }}>
                Showing the latest 300. Export CSV for everything in this period.
              </p>
            )}
          </div>
        )}
      </Panel>
    </div>
  );
}
