import { prisma } from "@/lib/db";
import { KernelError, docNumber, logActivity, postTransaction } from "@/lib/kernel";
import { addDaysToKey, todayKey } from "@/lib/time";
import type { LeaveType, PaymentMode } from "@/generated/prisma/client";

// ───────────────────────── Shifts & attendance ─────────────────────────

export async function upsertShift(input: { clubId: string; employeeId: string; date: string; startMin: number; endMin: number; area: string; notes?: string | null }) {
  if (input.endMin <= input.startMin) throw new KernelError("BAD_RANGE", "Shift must end after it starts.");
  const employee = await prisma.employee.findFirst({ where: { id: input.employeeId, clubId: input.clubId, leftOn: null } });
  if (!employee) throw new KernelError("NOT_FOUND", "Employee not found.");
  return prisma.staffShift.upsert({
    where: { employeeId_date_startMin: { employeeId: input.employeeId, date: input.date, startMin: input.startMin } },
    create: { clubId: input.clubId, employeeId: input.employeeId, date: input.date, startMin: input.startMin, endMin: input.endMin, area: input.area, notes: input.notes ?? null },
    update: { endMin: input.endMin, area: input.area, notes: input.notes ?? null },
  });
}

export async function deleteShift(input: { clubId: string; shiftId: string }) {
  const s = await prisma.staffShift.findFirst({ where: { id: input.shiftId, clubId: input.clubId } });
  if (!s) throw new KernelError("NOT_FOUND", "Shift not found.");
  await prisma.staffShift.delete({ where: { id: s.id } });
}

/** Idempotent: a second clock-in on the same day while open is a no-op. */
export async function clockIn(input: { clubId: string; employeeId: string; tz: string; source?: string; byUserId?: string | null }) {
  const date = todayKey(input.tz);
  const open = await prisma.attendance.findFirst({ where: { employeeId: input.employeeId, clockOut: null } });
  if (open) return open;
  return prisma.$transaction(async (tx) => {
    const row = await tx.attendance.create({ data: { clubId: input.clubId, employeeId: input.employeeId, date, clockIn: new Date(), source: input.source ?? "DESK" } });
    await logActivity(tx, { clubId: input.clubId, userId: input.byUserId, action: "CLOCK_IN", entity: "Attendance", entityId: row.id, meta: { employeeId: input.employeeId } });
    return row;
  });
}

export async function clockOut(input: { clubId: string; employeeId: string; byUserId?: string | null }) {
  const open = await prisma.attendance.findFirst({ where: { employeeId: input.employeeId, clubId: input.clubId, clockOut: null }, orderBy: { clockIn: "desc" } });
  if (!open) throw new KernelError("NOT_CLOCKED_IN", "Not clocked in.");
  const now = new Date();
  const minutes = Math.max(1, Math.round((now.getTime() - open.clockIn.getTime()) / 60_000));
  return prisma.$transaction(async (tx) => {
    const row = await tx.attendance.update({ where: { id: open.id }, data: { clockOut: now, minutes } });
    await logActivity(tx, { clubId: input.clubId, userId: input.byUserId, action: "CLOCK_OUT", entity: "Attendance", entityId: row.id, meta: { minutes } });
    return row;
  });
}

// ───────────────────────── Leave ─────────────────────────

export function inclusiveDays(fromDate: string, toDate: string) {
  const a = new Date(`${fromDate}T00:00:00Z`).getTime();
  const b = new Date(`${toDate}T00:00:00Z`).getTime();
  return Math.floor((b - a) / 86_400_000) + 1;
}

export async function requestLeave(input: { clubId: string; employeeId: string; type: LeaveType; fromDate: string; toDate: string; reason?: string | null }) {
  const days = inclusiveDays(input.fromDate, input.toDate);
  if (days < 1 || days > 60) throw new KernelError("BAD_RANGE", "Leave must be between 1 and 60 days.");
  const employee = await prisma.employee.findFirst({ where: { id: input.employeeId, clubId: input.clubId } });
  if (!employee) throw new KernelError("NOT_FOUND", "Employee not found.");
  if (input.type !== "UNPAID" && days > employee.leaveBalance) {
    throw new KernelError("INSUFFICIENT_BALANCE", `Only ${employee.leaveBalance} paid leave ${employee.leaveBalance === 1 ? "day" : "days"} left. Request unpaid leave instead.`);
  }
  const overlap = await prisma.leaveRequest.findFirst({
    where: { employeeId: input.employeeId, status: { in: ["PENDING", "APPROVED"] }, fromDate: { lte: input.toDate }, toDate: { gte: input.fromDate } },
  });
  if (overlap) throw new KernelError("OVERLAP", "Overlaps an existing leave request.");
  return prisma.leaveRequest.create({ data: { clubId: input.clubId, employeeId: input.employeeId, type: input.type, fromDate: input.fromDate, toDate: input.toDate, days, reason: input.reason ?? null } });
}

export async function decideLeave(input: { clubId: string; leaveId: string; approve: boolean; note?: string | null; byUserId: string }) {
  return prisma.$transaction(async (tx) => {
    const leave = await tx.leaveRequest.findFirst({ where: { id: input.leaveId, clubId: input.clubId }, include: { employee: true } });
    if (!leave) throw new KernelError("NOT_FOUND", "Leave request not found.");
    if (leave.status !== "PENDING") throw new KernelError("NOT_PENDING", `Already ${leave.status.toLowerCase()}.`);

    if (input.approve && leave.type !== "UNPAID") {
      if (leave.employee.leaveBalance < leave.days) throw new KernelError("INSUFFICIENT_BALANCE", "Employee no longer has enough paid leave.");
      await tx.employee.update({ where: { id: leave.employeeId }, data: { leaveBalance: { decrement: leave.days } } });
    }
    const updated = await tx.leaveRequest.update({
      where: { id: leave.id },
      data: { status: input.approve ? "APPROVED" : "REJECTED", decidedById: input.byUserId, decidedAt: new Date(), decisionNote: input.note ?? null },
    });
    await logActivity(tx, { clubId: input.clubId, userId: input.byUserId, action: input.approve ? "LEAVE_APPROVED" : "LEAVE_REJECTED", entity: "LeaveRequest", entityId: leave.id, meta: { days: leave.days, type: leave.type } });
    return updated;
  });
}

export async function cancelLeave(input: { clubId: string; leaveId: string; employeeId: string }) {
  const leave = await prisma.leaveRequest.findFirst({ where: { id: input.leaveId, clubId: input.clubId, employeeId: input.employeeId } });
  if (!leave) throw new KernelError("NOT_FOUND", "Leave request not found.");
  if (leave.status !== "PENDING") throw new KernelError("NOT_PENDING", "Only pending requests can be withdrawn.");
  return prisma.leaveRequest.update({ where: { id: leave.id }, data: { status: "CANCELLED" } });
}

// ───────────────────────── Payroll ─────────────────────────

/** Statutory-ish defaults for the demo: 12% PF on basic up to a ceiling, flat TDS above a threshold. */
const PF_RATE = 0.12;
const PF_BASIC_CEILING = 1_500_000; // ₹15,000 in paise
const TDS_THRESHOLD = 5_000_000; // ₹50,000/month
const TDS_RATE = 0.1;
const OVERTIME_MULTIPLIER = 1.5;

export function daysInPeriod(period: string) {
  const [y, m] = period.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function periodKeys(period: string) {
  const n = daysInPeriod(period);
  const first = `${period}-01`;
  return { first, last: addDaysToKey(first, n - 1), n };
}

interface SlipCalc {
  employeeId: string;
  daysInMonth: number;
  daysWorked: number;
  paidLeaveDays: number;
  unpaidDays: number;
  overtimeMin: number;
  basic: number;
  overtime: number;
  gross: number;
  pf: number;
  tds: number;
  deductions: number;
  net: number;
}

/**
 * Pay = pro-rated monthly salary. A day counts as paid if the employee clocked
 * in OR was on approved paid leave OR it was a weekly off (Sunday). Days with
 * no attendance and no leave are unpaid. Hours beyond 9/day are overtime for
 * hourly staff only.
 */
export async function computePayroll(clubId: string, period: string) {
  const { first, last, n } = periodKeys(period);
  const employees = await prisma.employee.findMany({
    where: { clubId, OR: [{ leftOn: null }, { leftOn: { gte: new Date(`${first}T00:00:00Z`) } }] },
    include: {
      attendance: { where: { date: { gte: first, lte: last } } },
      leaves: { where: { status: "APPROVED", fromDate: { lte: last }, toDate: { gte: first } } },
    },
    orderBy: { employeeNo: "asc" },
  });

  const slips: SlipCalc[] = employees.map((e) => {
    const worked = new Set(e.attendance.map((a) => a.date));
    let overtimeMin = 0;
    const byDay = new Map<string, number>();
    for (const a of e.attendance) byDay.set(a.date, (byDay.get(a.date) ?? 0) + (a.minutes ?? 0));
    for (const mins of byDay.values()) overtimeMin += Math.max(0, mins - 9 * 60);

    let paidLeaveDays = 0;
    const leaveDays = new Set<string>();
    for (const l of e.leaves) {
      const from = l.fromDate < first ? first : l.fromDate;
      const to = l.toDate > last ? last : l.toDate;
      for (let k = from; k <= to; k = addDaysToKey(k, 1)) {
        leaveDays.add(k);
        if (l.type !== "UNPAID") paidLeaveDays++;
      }
    }

    let unpaidDays = 0;
    for (let i = 0; i < n; i++) {
      const k = addDaysToKey(first, i);
      const dow = new Date(`${k}T00:00:00Z`).getUTCDay();
      if (dow === 0) continue; // weekly off
      if (worked.has(k) || leaveDays.has(k)) continue;
      unpaidDays++;
    }

    const payableDays = n - unpaidDays;
    const basic = Math.round((e.monthlySalary * payableDays) / n);
    const overtime = e.hourlyRate ? Math.round((overtimeMin / 60) * e.hourlyRate * OVERTIME_MULTIPLIER) : 0;
    const gross = basic + overtime;
    const pf = e.employmentType === "FULL_TIME" ? Math.round(Math.min(basic, PF_BASIC_CEILING) * PF_RATE) : 0;
    const tds = gross > TDS_THRESHOLD ? Math.round((gross - TDS_THRESHOLD) * TDS_RATE) : 0;
    const deductions = pf + tds;
    return { employeeId: e.id, daysInMonth: n, daysWorked: worked.size, paidLeaveDays, unpaidDays, overtimeMin, basic, overtime, gross, pf, tds, deductions, net: gross - deductions };
  });

  return { employees, slips, totals: { gross: slips.reduce((a, s) => a + s.gross, 0), deductions: slips.reduce((a, s) => a + s.deductions, 0), net: slips.reduce((a, s) => a + s.net, 0), headcount: slips.length } };
}

export async function generatePayroll(input: { clubId: string; period: string; byUserId: string }) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.period)) throw new KernelError("BAD_PERIOD", "Period must be YYYY-MM.");
  const existing = await prisma.payrollRun.findUnique({ where: { clubId_period: { clubId: input.clubId, period: input.period } } });
  if (existing && existing.status !== "DRAFT") throw new KernelError("LOCKED", `Payroll for ${input.period} is already ${existing.status.toLowerCase()}.`);

  const calc = await computePayroll(input.clubId, input.period);
  if (calc.slips.length === 0) throw new KernelError("EMPTY", "No active employees for that period.");

  return prisma.$transaction(async (tx) => {
    if (existing) await tx.payslip.deleteMany({ where: { runId: existing.id } });
    const run = existing
      ? await tx.payrollRun.update({ where: { id: existing.id }, data: { ...calc.totals } })
      : await tx.payrollRun.create({ data: { clubId: input.clubId, period: input.period, createdById: input.byUserId, ...calc.totals } });
    await tx.payslip.createMany({
      data: calc.slips.map((s, i) => ({ runId: run.id, slipNo: `${docNumber("PS", run.hashId)}-${String(i + 1).padStart(2, "0")}`, ...s })),
    });
    await logActivity(tx, { clubId: input.clubId, userId: input.byUserId, action: "PAYROLL_GENERATED", entity: "PayrollRun", entityId: run.id, meta: { period: input.period, net: calc.totals.net } });
    return run;
  });
}

export async function approvePayroll(input: { clubId: string; runId: string; byUserId: string }) {
  const run = await prisma.payrollRun.findFirst({ where: { id: input.runId, clubId: input.clubId } });
  if (!run) throw new KernelError("NOT_FOUND", "Payroll run not found.");
  if (run.status !== "DRAFT") throw new KernelError("NOT_DRAFT", `Already ${run.status.toLowerCase()}.`);
  return prisma.payrollRun.update({ where: { id: run.id }, data: { status: "APPROVED", approvedById: input.byUserId, approvedAt: new Date() } });
}

export async function payPayroll(input: { clubId: string; runId: string; paymentMode: PaymentMode; reference?: string | null; byUserId: string }) {
  return prisma.$transaction(async (tx) => {
    const run = await tx.payrollRun.findFirst({ where: { id: input.runId, clubId: input.clubId } });
    if (!run) throw new KernelError("NOT_FOUND", "Payroll run not found.");
    if (run.status !== "APPROVED") throw new KernelError("NOT_APPROVED", run.status === "PAID" ? "Already paid." : "Approve the run before paying.");

    const txn = await postTransaction(tx, {
      clubId: input.clubId,
      source: "PAYROLL",
      direction: "OUT",
      amount: run.net,
      paymentMode: input.paymentMode,
      reference: input.reference ?? null,
      refType: "PayrollRun",
      refId: run.id,
      description: `Salaries · ${run.period} · ${run.headcount} staff`,
      byUserId: input.byUserId,
    });
    const updated = await tx.payrollRun.update({ where: { id: run.id }, data: { status: "PAID", paidAt: new Date(), paymentMode: input.paymentMode, transactionId: txn.id } });
    await logActivity(tx, { clubId: input.clubId, userId: input.byUserId, action: "PAYROLL_PAID", entity: "PayrollRun", entityId: run.id, meta: { net: run.net, mode: input.paymentMode } });
    return updated;
  });
}

export async function discardPayroll(input: { clubId: string; runId: string }) {
  const run = await prisma.payrollRun.findFirst({ where: { id: input.runId, clubId: input.clubId } });
  if (!run) throw new KernelError("NOT_FOUND", "Payroll run not found.");
  if (run.status === "PAID") throw new KernelError("LOCKED", "Paid runs cannot be discarded.");
  await prisma.payrollRun.delete({ where: { id: run.id } });
}
