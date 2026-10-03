import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatPaise } from "@/lib/money";
import { todayKey } from "@/lib/time";
import { listPayrollRuns, PAYROLL_STATUS_LABEL } from "@/lib/hr/queries";
import { PageHeader, Panel, Pill, statusTone } from "@/components/shared/Primitives";
import { GeneratePayrollForm } from "@/components/hr/PayrollActions";

export const metadata: Metadata = { title: "Payroll" };

export default async function PayrollPage() {
  const user = await requireRole("OWNER");
  const club = await prisma.club.findUniqueOrThrow({ where: { id: user.clubId }, select: { timezone: true } });
  const runs = await listPayrollRuns(user.clubId);
  const defaultPeriod = todayKey(club.timezone).slice(0, 7);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader eyebrow="HR" title="Payroll" subtitle="Generate a draft from attendance and approved leave, check it, approve, then mark paid. Paying posts one PAYROLL outgoing to the ledger and freezes the payslips." />

      <Panel title="New run">
        <GeneratePayrollForm defaultPeriod={defaultPeriod} />
        <p className="mt-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
          Pay = monthly salary pro-rated by payable days (worked + paid leave + Sundays). Overtime beyond 9 h/day at 1.5× for hourly staff. PF 12% on basic up to ₹15,000 for full-time; TDS 10% on gross above ₹50,000.
        </p>
      </Panel>

      <Panel title="Runs">
        {runs.length === 0 ? (
          <p className="py-8 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
            No payroll runs yet. Generate one above.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs" style={{ color: "var(--color-text-muted)" }}>
                  <th className="py-2 pr-3 font-medium">Period</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 text-right font-medium">Staff</th>
                  <th className="py-2 pr-3 text-right font-medium">Gross</th>
                  <th className="py-2 pr-3 text-right font-medium">Deductions</th>
                  <th className="py-2 pl-3 text-right font-medium">Net</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} style={{ borderTop: "1px solid var(--color-border)" }}>
                    <td className="py-2 pr-3">
                      <Link href={`/owner/hr/payroll/${r.id}`} className="font-semibold underline-offset-2 hover:underline">
                        {r.period}
                      </Link>
                    </td>
                    <td className="py-2 pr-3">
                      <Pill tone={statusTone(r.status)}>{PAYROLL_STATUS_LABEL[r.status]}</Pill>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{r.headcount}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{formatPaise(r.gross)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums" style={{ color: "var(--color-text-muted)" }}>
                      −{formatPaise(r.deductions)}
                    </td>
                    <td className="py-2 pl-3 text-right font-semibold tabular-nums">{formatPaise(r.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
