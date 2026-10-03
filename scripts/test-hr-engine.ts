/**
 * HR engine integration test. Run: npx tsx scripts/test-hr-engine.ts
 * Needs DATABASE_URL + seed applied. Cleans up after itself.
 */
import { prisma } from "../lib/db";
import * as hr from "../lib/hr/engine";
import { computePayroll } from "../lib/hr/engine";
import { KernelError } from "../lib/kernel";

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, extra = "") {
  if (cond) passed++;
  else failed++;
  console.log(`${cond ? "ok  " : "FAIL"} ${name}${extra ? ` — ${extra}` : ""}`);
}
async function expectError(name: string, fn: () => Promise<unknown>, code?: string) {
  try {
    await fn();
    check(name, false, "expected error");
  } catch (e) {
    check(name, e instanceof KernelError && (!code || e.code === code), e instanceof Error ? e.message : String(e));
  }
}

async function main() {
  const club = await prisma.club.findFirstOrThrow();
  const owner = await prisma.user.findFirstOrThrow({ where: { clubId: club.id, role: "OWNER" } });
  const desk = await prisma.employee.findFirstOrThrow({ where: { clubId: club.id, department: "Front desk" } });
  const period = "2031-01"; // far-future period so it never collides with real data

  // Shifts
  const s = await hr.upsertShift({ clubId: club.id, employeeId: desk.id, date: "2031-01-06", startMin: 420, endMin: 960, area: "Front desk" });
  check("upsertShift creates", !!s.id);
  const s2 = await hr.upsertShift({ clubId: club.id, employeeId: desk.id, date: "2031-01-06", startMin: 420, endMin: 1020, area: "Bar" });
  check("upsertShift is idempotent on (employee,date,start)", s2.id === s.id && s2.endMin === 1020 && s2.area === "Bar");
  await expectError("shift must end after start", () => hr.upsertShift({ clubId: club.id, employeeId: desk.id, date: "2031-01-07", startMin: 600, endMin: 600, area: "Bar" }), "BAD_RANGE");

  // Clock
  const open = await hr.clockIn({ clubId: club.id, employeeId: desk.id, tz: club.timezone });
  const again = await hr.clockIn({ clubId: club.id, employeeId: desk.id, tz: club.timezone });
  check("clockIn idempotent while open", again.id === open.id);
  const closed = await hr.clockOut({ clubId: club.id, employeeId: desk.id });
  check("clockOut computes minutes", (closed.minutes ?? 0) >= 1);
  await expectError("clockOut twice fails", () => hr.clockOut({ clubId: club.id, employeeId: desk.id }), "NOT_CLOCKED_IN");
  await prisma.attendance.delete({ where: { id: open.id } });

  // Leave
  const balBefore = (await prisma.employee.findUniqueOrThrow({ where: { id: desk.id } })).leaveBalance;
  const leave = await hr.requestLeave({ clubId: club.id, employeeId: desk.id, type: "CASUAL", fromDate: "2031-01-13", toDate: "2031-01-14" });
  check("requestLeave counts inclusive days", leave.days === 2);
  await expectError("overlapping leave rejected", () => hr.requestLeave({ clubId: club.id, employeeId: desk.id, type: "SICK", fromDate: "2031-01-14", toDate: "2031-01-15" }), "OVERLAP");
  await expectError("paid leave beyond balance rejected", () => hr.requestLeave({ clubId: club.id, employeeId: desk.id, type: "EARNED", fromDate: "2031-02-01", toDate: "2031-02-28" }), "INSUFFICIENT_BALANCE");
  await hr.decideLeave({ clubId: club.id, leaveId: leave.id, approve: true, byUserId: owner.id });
  const balAfter = (await prisma.employee.findUniqueOrThrow({ where: { id: desk.id } })).leaveBalance;
  check("approval decrements balance", balAfter === balBefore - 2, `${balBefore} → ${balAfter}`);
  await expectError("deciding twice fails", () => hr.decideLeave({ clubId: club.id, leaveId: leave.id, approve: false, byUserId: owner.id }), "NOT_PENDING");

  // Payroll math
  const calc = await computePayroll(club.id, period);
  const deskSlip = calc.slips.find((x) => x.employeeId === desk.id)!;
  check("payroll includes desk employee", !!deskSlip);
  check("Jan 2031 has 31 days", deskSlip.daysInMonth === 31);
  check("approved paid leave counted", deskSlip.paidLeaveDays === 2);
  // 31 days − 4 Sundays (5,12,19,26) − 2 leave = 25 unpaid (no attendance in 2031)
  check("unpaid days = working days without attendance/leave", deskSlip.unpaidDays === 25, `got ${deskSlip.unpaidDays}`);
  check("basic pro-rated by payable days", deskSlip.basic === Math.round((desk.monthlySalary * (31 - 25)) / 31));
  check("net = gross − deductions", deskSlip.net === deskSlip.gross - deskSlip.deductions);
  check("totals sum slips", calc.totals.net === calc.slips.reduce((a, x) => a + x.net, 0));

  // Payroll lifecycle
  const run = await hr.generatePayroll({ clubId: club.id, period, byUserId: owner.id });
  check("generatePayroll creates DRAFT", run.status === "DRAFT" && run.headcount === calc.slips.length);
  const run2 = await hr.generatePayroll({ clubId: club.id, period, byUserId: owner.id });
  check("regenerating a draft reuses the run", run2.id === run.id);
  const slipCount = await prisma.payslip.count({ where: { runId: run.id } });
  check("one payslip per employee", slipCount === run.headcount);
  await expectError("pay before approve fails", () => hr.payPayroll({ clubId: club.id, runId: run.id, paymentMode: "UPI", byUserId: owner.id }), "NOT_APPROVED");
  await hr.approvePayroll({ clubId: club.id, runId: run.id, byUserId: owner.id });
  await expectError("regenerate after approve fails", () => hr.generatePayroll({ clubId: club.id, period, byUserId: owner.id }), "LOCKED");
  const paid = await hr.payPayroll({ clubId: club.id, runId: run.id, paymentMode: "UPI", byUserId: owner.id });
  check("payPayroll marks PAID with ledger link", paid.status === "PAID" && !!paid.transactionId);
  const txn = await prisma.transaction.findUniqueOrThrow({ where: { id: paid.transactionId! } });
  check("ledger row is PAYROLL OUT for net", txn.source === "PAYROLL" && txn.direction === "OUT" && txn.amount === run.net);
  await expectError("pay twice fails", () => hr.payPayroll({ clubId: club.id, runId: run.id, paymentMode: "UPI", byUserId: owner.id }), "NOT_APPROVED");
  await expectError("discard paid run fails", () => hr.discardPayroll({ clubId: club.id, runId: run.id }), "LOCKED");

  // Cleanup
  await prisma.payrollRun.delete({ where: { id: run.id } });
  await prisma.transaction.delete({ where: { id: txn.id } });
  await prisma.leaveRequest.delete({ where: { id: leave.id } });
  await prisma.employee.update({ where: { id: desk.id }, data: { leaveBalance: balBefore } });
  await prisma.staffShift.deleteMany({ where: { employeeId: desk.id, date: { startsWith: "2031-" } } });

  console.log(`\n${passed} passed, ${failed} failed`);
  await prisma.$disconnect();
  process.exit(failed ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
