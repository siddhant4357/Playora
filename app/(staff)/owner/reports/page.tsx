import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Download, FileText, Landmark, Percent, Wallet } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatPaise } from "@/lib/money";
import { getRevenueSummary, listReportShares, periodRange } from "@/lib/finance/queries";
import { PageHeader, Panel, Stat } from "@/components/shared/Primitives";
import { ReportShares } from "@/components/owner/ReportShares";

export const metadata: Metadata = { title: "Reports" };

const REPORTS = [
  { href: "/owner/finance", icon: Wallet, title: "Ledger", desc: "Every transaction with filters and CSV export." },
  { href: "/owner/tax", icon: Percent, title: "GST collected", desc: "Output tax by slab and by source, ready for GSTR-3B." },
  { href: "/owner/invoices", icon: FileText, title: "Receivables", desc: "Outstanding and overdue invoices." },
  { href: "/owner/payables", icon: Landmark, title: "Payables", desc: "Bills due, salaries, refunds." },
];

export default async function ReportsPage() {
  const user = await requireRole("MANAGER", "OWNER");
  const club = await prisma.club.findUniqueOrThrow({ where: { id: user.clubId }, select: { timezone: true } });
  const month = periodRange("month", club.timezone);
  const [summary, shares] = await Promise.all([getRevenueSummary(user.clubId, month.from, month.to), user.role === "OWNER" ? listReportShares(user.clubId) : Promise.resolve([])]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader eyebrow="Management" title="Reports" subtitle="Month-to-date at a glance, the detailed reports behind it, and read-only links you can hand to an accountant or partner." />

      <section aria-label="Month to date" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Revenue MTD" value={formatPaise(summary.revenue)} />
        <Stat label="GST MTD" value={formatPaise(summary.tax)} />
        <Stat label="Paid out MTD" value={formatPaise(summary.outgoings)} />
        <Stat label="Net MTD" value={formatPaise(summary.net)} tone={summary.net < 0 ? "danger" : "success"} />
      </section>

      <div className="grid gap-4 lg:grid-cols-5">
        <Panel className="lg:col-span-3" title="Detailed reports">
          <ul className="grid gap-2 sm:grid-cols-2">
            {REPORTS.map((r) => (
              <li key={r.href}>
                <Link href={r.href} className="group flex h-full flex-col gap-2 rounded-xl p-3 transition-colors" style={{ background: "var(--color-bg)" }}>
                  <span className="flex items-center justify-between">
                    <r.icon className="h-5 w-5" style={{ color: "var(--color-primary-500)" }} aria-hidden />
                    <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" style={{ color: "var(--color-text-muted)" }} aria-hidden />
                  </span>
                  <span className="font-semibold">{r.title}</span>
                  <span className="text-xs text-pretty" style={{ color: "var(--color-text-muted)" }}>
                    {r.desc}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/owner/finance/export?period=month" prefetch={false} className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: "var(--color-accent-600)" }}>
            <Download className="h-3.5 w-3.5" /> Download this month&apos;s ledger as CSV
          </Link>
        </Panel>

        <Panel className="lg:col-span-2" title="Share with your accountant">
          {user.role === "OWNER" ? (
            <ReportShares shares={shares.map((s) => ({ id: s.id, token: s.token, label: s.label, period: s.period, expiresAt: s.expiresAt.toISOString(), createdAt: s.createdAt.toISOString() }))} />
          ) : (
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              Only the owner can create share links.
            </p>
          )}
        </Panel>
      </div>
    </div>
  );
}
