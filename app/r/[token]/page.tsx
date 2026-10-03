import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatPaise } from "@/lib/money";
import { formatDate } from "@/lib/time";
import { getDailyRevenue, getReportShare, getRevenueSummary, getTaxReport, periodRange, type Period } from "@/lib/finance/queries";
import { SOURCE_COLOR, SOURCE_LABEL, MODE_LABEL } from "@/lib/finance/labels";
import { RevenueChart } from "@/components/owner/RevenueChart";
import { BrandMark } from "@/components/shared/BrandMark";

export const metadata: Metadata = { title: "Shared report", robots: { index: false, follow: false } };

/** Read-only, token-gated revenue summary. No session, no mutations, no PII. */
export default async function SharedReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const share = await getReportShare(token);
  if (!share) notFound();
  const tz = share.club.timezone;
  const period = (["today", "week", "month"].includes(share.period) ? share.period : "month") as Period;
  const range = periodRange(period, tz);
  const [summary, daily, tax] = await Promise.all([getRevenueSummary(share.club.id, range.from, range.to), getDailyRevenue(share.club.id, range.from, range.to, tz), getTaxReport(share.club.id, range.from, range.to)]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-6 px-4 py-8" style={{ background: "var(--color-bg)" }}>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
            {share.club.name} · {share.label}
          </p>
          <h1 className="text-2xl font-bold tracking-tight">{range.label}</h1>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            {formatDate(range.from, tz)} – {formatDate(new Date(range.to.getTime() - 1), tz)} · read-only · link expires {formatDate(share.expiresAt, tz)}
          </p>
        </div>
        <BrandMark />
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Revenue", formatPaise(summary.revenue)],
          ["GST collected", formatPaise(tax.totalTax)],
          ["Paid out", formatPaise(summary.outgoings)],
          ["Net", formatPaise(summary.net)],
        ].map(([k, v]) => (
          <div key={k} className="flex flex-col gap-1 rounded-2xl p-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {k}
            </span>
            <span className="text-xl font-bold tabular-nums">{v}</span>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3 rounded-2xl p-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
        <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
          Revenue by day
        </h2>
        {summary.revenue === 0 ? <p className="py-8 text-center text-sm">No revenue in this period.</p> : <RevenueChart data={daily} sources={summary.bySource.map((s) => s.source)} />}
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="flex flex-col gap-2 rounded-2xl p-4 text-sm" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
            By source
          </h2>
          <ul className="flex flex-col divide-y" style={{ borderColor: "var(--color-border)" }}>
            {summary.bySource.map((s) => (
              <li key={s.source} className="flex items-center justify-between gap-3 py-1.5">
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-sm" style={{ background: SOURCE_COLOR[s.source] }} />
                  {SOURCE_LABEL[s.source]}
                </span>
                <span className="font-medium tabular-nums">{formatPaise(s.amount)}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="flex flex-col gap-2 rounded-2xl p-4 text-sm" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
            By payment mode
          </h2>
          <ul className="flex flex-col divide-y" style={{ borderColor: "var(--color-border)" }}>
            {summary.byMode
              .filter((m) => m.amount > 0)
              .map((m) => (
                <li key={m.mode} className="flex items-center justify-between gap-3 py-1.5">
                  <span>{MODE_LABEL[m.mode]}</span>
                  <span className="font-medium tabular-nums">{formatPaise(m.amount)}</span>
                </li>
              ))}
          </ul>
          <h2 className="pt-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
            GST by slab
          </h2>
          <ul className="flex flex-col divide-y" style={{ borderColor: "var(--color-border)" }}>
            {tax.byRate.map((r) => (
              <li key={r.ratePct} className="flex items-center justify-between gap-3 py-1.5">
                <span>{r.ratePct}% on {formatPaise(r.taxable)}</span>
                <span className="font-medium tabular-nums">{formatPaise(r.tax)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <p className="text-center text-xs" style={{ color: "var(--color-text-muted)" }}>
        Generated by Yolla from the club&apos;s ledger. Figures are live as of page load.
      </p>
    </main>
  );
}
