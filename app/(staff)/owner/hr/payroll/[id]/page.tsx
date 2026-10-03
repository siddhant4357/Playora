import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Printer } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatPaise } from "@/lib/money";
import { formatDate } from "@/lib/time";
import { getPayrollRun, PAYROLL_STATUS_LABEL } from "@/lib/hr/queries";
import { MODE_LABEL } from "@/lib/finance/labels";
import { PageHeader, Panel, Pill, Stat, statusTone } from "@/components/shared/Primitives";
import { PayrollRunActions } from "@/components/hr/PayrollActions";

export const metadata: Metadata = { title: "Payroll run" };

export default async function PayrollRunPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("OWNER");
  const { id } = await params;
  const [run, club] = await Promise.all([getPayrollRun(user.clubId, id), prisma.club.findUniqueOrThrow({ where: { id: user.clubId }, select: { timezone: true } })]);
  if (!run) notFound();
  const tz = club.timezone;

  return (
    <div className="flex flex-col gap-5">
      <Link href="/owner/hr/payroll" className="w-fit text-xs underline-offset-2 hover:underline" style={{ color: "var(--color-text-muted)" }}>
        ← All payroll runs
      </Link>
      <PageHeader
        eyebrow="HR · Payroll"
        title={`Salaries · ${run.period}`}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Pill tone={statusTone(run.status)}>{PAYROLL_STATUS_LABEL[run.status]}</Pill>
            {run.approvedAt && <span>Approved {formatDate(run.approvedAt, tz)}</span>}
            {run.paidAt && (
              <span>
                · Paid {formatDate(run.paidAt, tz)}
                {run.paymentMode ? ` by ${MODE_LABEL[run.paymentMode]}` : ""}
              </span>
            )}
            {run.transaction && <span>· Ledger #{run.transaction.hashId}</span>}
          </span>
        }
        actions={<PayrollRunActions runId={run.id} status={run.status} net={run.net} period={run.period} />}
      />

      <section aria-label="Totals" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Headcount" value={run.headcount} />
        <Stat label="Gross" value={formatPaise(run.gross)} />
        <Stat label="Deductions" value={formatPaise(run.deductions)} hint="PF + TDS" />
        <Stat label="Net payable" value={formatPaise(run.net)} tone={run.status === "PAID" ? "success" : "warning"} />
      </section>

      <Panel title="Payslips">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs" style={{ color: "var(--color-text-muted)" }}>
                <th className="py-2 pr-3 font-medium">Employee</th>
                <th className="py-2 pr-3 text-right font-medium">Worked</th>
                <th className="py-2 pr-3 text-right font-medium">Paid leave</th>
                <th className="py-2 pr-3 text-right font-medium">Unpaid</th>
                <th className="py-2 pr-3 text-right font-medium">Basic</th>
                <th className="py-2 pr-3 text-right font-medium">OT</th>
                <th className="py-2 pr-3 text-right font-medium">PF</th>
                <th className="py-2 pr-3 text-right font-medium">TDS</th>
                <th className="py-2 pr-3 text-right font-medium">Net</th>
                <th className="py-2 pl-3 text-right font-medium">
                  <span className="sr-only">Print</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {run.payslips.map((s) => (
                <tr key={s.id} style={{ borderTop: "1px solid var(--color-border)" }}>
                  <td className="py-2 pr-3">
                    <div className="flex flex-col">
                      <span className="font-medium">{s.employee.user.name}</span>
                      <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                        {s.slipNo} · {s.employee.designation}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">{s.daysWorked} d</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{s.paidLeaveDays} d</td>
                  <td className="py-2 pr-3 text-right tabular-nums" style={{ color: s.unpaidDays > 0 ? "var(--color-danger)" : "var(--color-text-muted)" }}>
                    {s.unpaidDays} d
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">{formatPaise(s.basic)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums" style={{ color: "var(--color-text-muted)" }}>
                    {s.overtime ? formatPaise(s.overtime) : "–"}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums" style={{ color: "var(--color-text-muted)" }}>
                    {s.pf ? `−${formatPaise(s.pf)}` : "–"}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums" style={{ color: "var(--color-text-muted)" }}>
                    {s.tds ? `−${formatPaise(s.tds)}` : "–"}
                  </td>
                  <td className="whitespace-nowrap py-2 pr-3 text-right font-semibold tabular-nums">{formatPaise(s.net)}</td>
                  <td className="py-2 pl-3 text-right">
                    <Link href={`/print/payslip/${s.id}`} aria-label={`Print payslip for ${s.employee.user.name}`} className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-[var(--color-surface-2)]">
                      <Printer className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
