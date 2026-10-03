import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatPaise } from "@/lib/money";
import { formatDate } from "@/lib/time";
import { getPayslip, EMPLOYMENT_LABEL } from "@/lib/hr/queries";
import { PrintSheet, PrintToolbar } from "@/components/print/PrintSheet";

export const metadata: Metadata = { title: "Payslip" };

export default async function PayslipPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("OWNER");
  const { id } = await params;
  const [slip, club] = await Promise.all([getPayslip(user.clubId, id), prisma.club.findUniqueOrThrow({ where: { id: user.clubId } })]);
  if (!slip) notFound();
  const tz = club.timezone;
  const e = slip.employee;
  const monthLabel = new Date(`${slip.run.period}-01T12:00:00Z`).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });

  const meta: [string, string][] = [
    ["Period", monthLabel],
    ["Status", slip.run.status === "PAID" ? `Paid ${slip.run.paidAt ? formatDate(slip.run.paidAt, tz) : ""}` : slip.run.status],
  ];

  return (
    <>
      <PrintToolbar backHref={`/owner/hr/payroll/${slip.runId}`} />
      <PrintSheet club={club} docType={slip.run.status === "PAID" ? "Payslip" : "Payslip · Draft"} docNo={slip.slipNo} date={formatDate(slip.createdAt, tz, { long: true })} meta={meta} to={{ name: e.user.name, lines: [e.designation, `${e.department} · ${EMPLOYMENT_LABEL[e.employmentType]}`, `Emp. no. ${e.employeeNo}`, e.pan ? `PAN ${e.pan}` : ""].filter(Boolean) }}>
        <table className="ps-table">
          <thead>
            <tr>
              <th>Attendance</th>
              <th className="r">Days</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Days in month</td>
              <td className="r">{slip.daysInMonth}</td>
            </tr>
            <tr>
              <td>Days worked</td>
              <td className="r">{slip.daysWorked}</td>
            </tr>
            <tr>
              <td>Paid leave</td>
              <td className="r">{slip.paidLeaveDays}</td>
            </tr>
            <tr>
              <td>Unpaid / absent</td>
              <td className="r">{slip.unpaidDays}</td>
            </tr>
            {slip.overtimeMin > 0 && (
              <tr>
                <td>Overtime</td>
                <td className="r">{(slip.overtimeMin / 60).toFixed(1)} h</td>
              </tr>
            )}
          </tbody>
        </table>

        <table className="ps-table" style={{ marginTop: 20 }}>
          <thead>
            <tr>
              <th>Earnings</th>
              <th className="r">Amount</th>
              <th>Deductions</th>
              <th className="r">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Basic (pro-rated from {formatPaise(e.monthlySalary)})</td>
              <td className="r">{formatPaise(slip.basic)}</td>
              <td>Provident fund (12%)</td>
              <td className="r">{formatPaise(slip.pf)}</td>
            </tr>
            <tr>
              <td>Overtime</td>
              <td className="r">{formatPaise(slip.overtime)}</td>
              <td>TDS</td>
              <td className="r">{formatPaise(slip.tds)}</td>
            </tr>
            <tr>
              <td>Gross</td>
              <td className="r">{formatPaise(slip.gross)}</td>
              <td>Total deductions</td>
              <td className="r">{formatPaise(slip.deductions)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3}>Net pay</td>
              <td className="r">{formatPaise(slip.net)}</td>
            </tr>
          </tfoot>
        </table>
        {(e.bankAccount || e.ifsc) && (
          <p className="ps-note">
            Credited to {e.bankAccount ? `A/c ${e.bankAccount}` : "bank"}
            {e.ifsc ? ` · IFSC ${e.ifsc}` : ""}
          </p>
        )}
      </PrintSheet>
    </>
  );
}
