import { prisma } from "@/lib/db";
import { addDaysToKey, todayKey, toLocalParts } from "@/lib/time";
import type { LeaveStatus } from "@/generated/prisma/client";

export * from "@/lib/hr/labels";

export const employeeCardSelect = {
  id: true,
  employeeNo: true,
  designation: true,
  department: true,
  employmentType: true,
  monthlySalary: true,
  leaveBalance: true,
  joinedOn: true,
  leftOn: true,
  user: { select: { id: true, name: true, email: true, phone: true, role: true } },
} as const;

export async function listEmployees(clubId: string) {
  return prisma.employee.findMany({ where: { clubId }, select: employeeCardSelect, orderBy: [{ leftOn: "asc" }, { employeeNo: "asc" }] });
}

export async function getEmployeeForUser(userId: string) {
  return prisma.employee.findUnique({ where: { userId }, select: employeeCardSelect });
}

/** Monday-start week keys for the rota grid. */
export function weekKeys(anchor: string, tz: string) {
  const parts = toLocalParts(new Date(`${anchor}T12:00:00Z`), tz);
  const dow = (parts.weekday + 6) % 7;
  const monday = addDaysToKey(anchor, -dow);
  return Array.from({ length: 7 }, (_, i) => addDaysToKey(monday, i));
}

export async function getRota(clubId: string, days: string[]) {
  const [employees, shifts, attendance, leaves] = await Promise.all([
    prisma.employee.findMany({ where: { clubId, leftOn: null }, select: employeeCardSelect, orderBy: [{ department: "asc" }, { employeeNo: "asc" }] }),
    prisma.staffShift.findMany({ where: { clubId, date: { in: days } }, orderBy: { startMin: "asc" } }),
    prisma.attendance.findMany({ where: { clubId, date: { in: days } } }),
    prisma.leaveRequest.findMany({ where: { clubId, status: "APPROVED", fromDate: { lte: days[days.length - 1] }, toDate: { gte: days[0] } } }),
  ]);
  return { employees, shifts, attendance, leaves };
}

export async function getOnDutyNow(clubId: string, tz: string) {
  const date = todayKey(tz);
  const open = await prisma.attendance.findMany({
    where: { clubId, clockOut: null },
    include: { employee: { select: employeeCardSelect } },
    orderBy: { clockIn: "asc" },
  });
  const planned = await prisma.staffShift.count({ where: { clubId, date } });
  return { open, planned, date };
}

export async function listLeave(clubId: string, status?: LeaveStatus) {
  return prisma.leaveRequest.findMany({
    where: { clubId, ...(status ? { status } : {}) },
    include: { employee: { select: employeeCardSelect } },
    orderBy: [{ status: "asc" }, { fromDate: "asc" }],
    take: 200,
  });
}

export async function listEmployeeLeave(employeeId: string) {
  return prisma.leaveRequest.findMany({ where: { employeeId }, orderBy: { createdAt: "desc" }, take: 50 });
}

export async function listPayrollRuns(clubId: string) {
  return prisma.payrollRun.findMany({ where: { clubId }, orderBy: { period: "desc" }, include: { _count: { select: { payslips: true } } } });
}

export async function getPayrollRun(clubId: string, runId: string) {
  return prisma.payrollRun.findFirst({
    where: { id: runId, clubId },
    include: { payslips: { include: { employee: { select: employeeCardSelect } }, orderBy: { slipNo: "asc" } }, transaction: true },
  });
}

export async function getPayslip(clubId: string, slipId: string) {
  return prisma.payslip.findFirst({
    where: { id: slipId, run: { clubId } },
    include: { run: true, employee: { include: { user: { select: { name: true, email: true } } } } },
  });
}

export async function hrOverview(clubId: string, tz: string) {
  const today = todayKey(tz);
  const [headcount, pendingLeave, onLeaveToday, onDuty, lastRun, salaryBill] = await Promise.all([
    prisma.employee.count({ where: { clubId, leftOn: null } }),
    prisma.leaveRequest.count({ where: { clubId, status: "PENDING" } }),
    prisma.leaveRequest.count({ where: { clubId, status: "APPROVED", fromDate: { lte: today }, toDate: { gte: today } } }),
    prisma.attendance.count({ where: { clubId, clockOut: null } }),
    prisma.payrollRun.findFirst({ where: { clubId }, orderBy: { period: "desc" } }),
    prisma.employee.aggregate({ where: { clubId, leftOn: null }, _sum: { monthlySalary: true } }),
  ]);
  return { headcount, pendingLeave, onLeaveToday, onDuty, lastRun, salaryBill: salaryBill._sum.monthlySalary ?? 0, today };
}
