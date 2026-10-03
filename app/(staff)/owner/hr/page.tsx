import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatPaise } from "@/lib/money";
import { formatDate } from "@/lib/time";
import { EMPLOYMENT_LABEL, hrOverview, listEmployees, PAYROLL_STATUS_LABEL } from "@/lib/hr/queries";
import { PageHeader, Panel, Pill, Stat, statusTone } from "@/components/shared/Primitives";
import { EmployeeDialog } from "@/components/hr/EmployeeDialog";

export const metadata: Metadata = { title: "HR & payroll" };

export default async function HrPage() {
  const user = await requireRole("OWNER", "MANAGER");
  const club = await prisma.club.findUniqueOrThrow({ where: { id: user.clubId }, select: { timezone: true } });
  const tz = club.timezone;
  const [overview, employees, staffUsers] = await Promise.all([
    hrOverview(user.clubId, tz),
    listEmployees(user.clubId),
    prisma.user.findMany({ where: { clubId: user.clubId, role: { not: "MEMBER" }, employee: null }, select: { id: true, name: true, email: true, role: true }, orderBy: { name: "asc" } }),
  ]);
  const active = employees.filter((e) => !e.leftOn);
  const left = employees.filter((e) => e.leftOn);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader eyebrow="Management" title="HR & payroll" subtitle="One record per person: login, role, shifts, leave and salary. Payroll reads attendance, so the owner never re-types hours." actions={<EmployeeDialog unlinkedUsers={staffUsers} />} />

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Headcount" value={overview.headcount} hint={`${overview.onDuty} on duty now`} />
        <Stat label="Monthly salary bill" value={formatPaise(overview.salaryBill)} hint="Before deductions" />
        <Stat label="Leave to approve" value={overview.pendingLeave} tone={overview.pendingLeave > 0 ? "warning" : undefined} hint={`${overview.onLeaveToday} on leave today`} />
        <Stat label="Last payroll" value={overview.lastRun ? overview.lastRun.period : "–"} hint={overview.lastRun ? PAYROLL_STATUS_LABEL[overview.lastRun.status] : "Not run yet"} tone={overview.lastRun?.status === "PAID" ? "success" : undefined} />
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { href: "/desk/shifts", title: "Rota & attendance", hint: "Plan shifts, see who clocked in" },
          { href: "/owner/hr/leave", title: "Leave approvals", hint: `${overview.pendingLeave} pending` },
          { href: "/owner/hr/payroll", title: "Payroll", hint: "Generate, approve, pay, payslips" },
        ].map((c) => (
          <Link key={c.href} href={c.href} className="flex items-center justify-between gap-3 rounded-2xl p-4 transition-colors hover:scale-[1.01]" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-[var(--color-text)]">{c.title}</span>
              <span className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                {c.hint}
              </span>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 opacity-50" style={{ color: "var(--color-text-muted)" }} />
          </Link>
        ))}
      </div>

      <Panel title={`Employees · ${active.length}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs" style={{ color: "var(--color-text-muted)" }}>
                <th className="py-2 pr-3 font-medium">Employee</th>
                <th className="py-2 pr-3 font-medium">Department</th>
                <th className="py-2 pr-3 font-medium">Type</th>
                <th className="py-2 pr-3 font-medium">Joined</th>
                <th className="py-2 pr-3 text-right font-medium">Leave left</th>
                <th className="py-2 pr-3 text-right font-medium">Monthly</th>
                <th className="py-2 pl-3 text-right font-medium">
                  <span className="sr-only">Edit</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {[...active, ...left].map((e) => (
                <tr key={e.id} style={{ borderTop: "1px solid var(--color-border)", opacity: e.leftOn ? 0.55 : 1 }}>
                  <td className="py-2 pr-3">
                    <div className="flex flex-col">
                      <span className="font-medium">{e.user.name}</span>
                      <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                        {e.employeeNo} · {e.designation}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 pr-3 text-xs">{e.department}</td>
                  <td className="py-2 pr-3">
                    <Pill tone="neutral">{EMPLOYMENT_LABEL[e.employmentType]}</Pill>
                  </td>
                  <td className="whitespace-nowrap py-2 pr-3 text-xs tabular-nums" style={{ color: "var(--color-text-muted)" }}>
                    {formatDate(e.joinedOn, tz)}
                    {e.leftOn ? ` → ${formatDate(e.leftOn, tz)}` : ""}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">{e.leaveBalance} d</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-right font-semibold tabular-nums">{formatPaise(e.monthlySalary)}</td>
                  <td className="py-1 pl-3 text-right">
                    <EmployeeDialog
                      unlinkedUsers={[]}
                      existing={{
                        id: e.id,
                        userId: e.user.id,
                        name: e.user.name,
                        active: !e.leftOn,
                        designation: e.designation,
                        department: e.department,
                        employmentType: e.employmentType,
                        joinedOn: e.joinedOn.toISOString().slice(0, 10),
                        monthlySalaryRupees: Math.round(e.monthlySalary / 100),
                        hourlyRateRupees: null,
                        leaveBalance: e.leaveBalance,
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {overview.lastRun && (
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          Last payroll run <Pill tone={statusTone(overview.lastRun.status)}>{PAYROLL_STATUS_LABEL[overview.lastRun.status]}</Pill> for {overview.lastRun.period} · net {formatPaise(overview.lastRun.net)}.
        </p>
      )}
    </div>
  );
}
