"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { KernelError } from "@/lib/kernel";
import * as hr from "@/lib/hr/engine";
import { getEmployeeForUser } from "@/lib/hr/queries";
import type { PaymentMode } from "@/generated/prisma/client";

export type HrResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

const STAFF = ["OWNER", "MANAGER", "FRONT_DESK", "BAR_STAFF", "KITCHEN", "COACH"] as const;
const HR_ADMIN = ["OWNER", "MANAGER"] as const;
const PAYROLL = ["OWNER"] as const;

async function clubOf(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { clubId: true, club: { select: { timezone: true } } } });
  if (!u) throw new KernelError("NO_CLUB", "User has no club.");
  return { clubId: u.clubId, tz: u.club.timezone };
}

function fail(e: unknown): HrResult<never> {
  if (e instanceof KernelError) return { ok: false, error: e.message };
  if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? "Invalid input." };
  console.error("[hr action]", e);
  return { ok: false, error: "Something went wrong. Please try again." };
}

function revalidateHr() {
  revalidatePath("/desk/shifts");
  revalidatePath("/owner/hr");
  revalidatePath("/owner/hr/leave");
  revalidatePath("/owner/hr/payroll");
  revalidatePath("/owner");
}

// ───────────────────────── Employees ─────────────────────────

const employeeSchema = z.object({
  userId: z.string().min(1),
  designation: z.string().trim().min(2).max(60),
  department: z.string().trim().min(2).max(40),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT"]),
  joinedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  monthlySalary: z.coerce.number().int().min(0),
  hourlyRate: z.coerce.number().int().min(0).optional().nullable(),
  leaveBalance: z.coerce.number().int().min(0).max(60).default(12),
});

export async function upsertEmployeeAction(input: z.input<typeof employeeSchema> & { id?: string }): Promise<HrResult<{ id: string }>> {
  try {
    const me = await requireRole(...HR_ADMIN);
    const { clubId } = await clubOf(me.userId);
    const data = employeeSchema.parse(input);
    const user = await prisma.user.findFirst({ where: { id: data.userId, clubId, role: { not: "MEMBER" } } });
    if (!user) return { ok: false, error: "Pick a staff login from this club." };

    const base = { designation: data.designation, department: data.department, employmentType: data.employmentType, joinedOn: new Date(`${data.joinedOn}T00:00:00Z`), monthlySalary: data.monthlySalary, hourlyRate: data.hourlyRate ?? null, leaveBalance: data.leaveBalance };
    const row = input.id
      ? await prisma.employee.update({ where: { id: input.id, clubId }, data: base })
      : await prisma.employee.create({ data: { clubId, userId: data.userId, employeeNo: `EMP-${String((await prisma.employee.count({ where: { clubId } })) + 1).padStart(3, "0")}`, ...base } });
    revalidateHr();
    return { ok: true, data: { id: row.id } };
  } catch (e) {
    return fail(e);
  }
}

export async function offboardEmployeeAction(employeeId: string): Promise<HrResult> {
  try {
    const me = await requireRole(...HR_ADMIN);
    const { clubId } = await clubOf(me.userId);
    await prisma.employee.update({ where: { id: employeeId, clubId }, data: { leftOn: new Date() } });
    revalidateHr();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ───────────────────────── Shifts & clock ─────────────────────────

const shiftSchema = z.object({
  employeeId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startMin: z.coerce.number().int().min(0).max(1439),
  endMin: z.coerce.number().int().min(1).max(1440),
  area: z.string().trim().min(2).max(40),
  notes: z.string().trim().max(200).optional().nullable(),
});

export async function upsertShiftAction(input: z.input<typeof shiftSchema>): Promise<HrResult> {
  try {
    const me = await requireRole(...HR_ADMIN);
    const { clubId } = await clubOf(me.userId);
    await hr.upsertShift({ clubId, ...shiftSchema.parse(input) });
    revalidateHr();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteShiftAction(shiftId: string): Promise<HrResult> {
  try {
    const me = await requireRole(...HR_ADMIN);
    const { clubId } = await clubOf(me.userId);
    await hr.deleteShift({ clubId, shiftId });
    revalidateHr();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Any staff member clocks themselves in; front desk / manager can clock in a named employee. */
export async function clockAction(input: { direction: "in" | "out"; employeeId?: string }): Promise<HrResult> {
  try {
    const me = await requireRole(...STAFF);
    const { clubId, tz } = await clubOf(me.userId);
    let employeeId = input.employeeId;
    if (employeeId && employeeId !== (await getEmployeeForUser(me.userId))?.id) {
      if (!["OWNER", "MANAGER", "FRONT_DESK"].includes(me.role)) return { ok: false, error: "Only the front desk can clock in other staff." };
    }
    if (!employeeId) {
      const mine = await getEmployeeForUser(me.userId);
      if (!mine) return { ok: false, error: "Your login isn't linked to an employee record yet. Ask the owner to add you in HR." };
      employeeId = mine.id;
    }
    if (input.direction === "in") await hr.clockIn({ clubId, employeeId, tz, byUserId: me.userId });
    else await hr.clockOut({ clubId, employeeId, byUserId: me.userId });
    revalidateHr();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ───────────────────────── Leave ─────────────────────────

const leaveSchema = z.object({
  type: z.enum(["CASUAL", "SICK", "EARNED", "UNPAID"]),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().trim().max(300).optional().nullable(),
  employeeId: z.string().optional(),
});

export async function requestLeaveAction(input: z.input<typeof leaveSchema>): Promise<HrResult> {
  try {
    const me = await requireRole(...STAFF);
    const { clubId } = await clubOf(me.userId);
    const data = leaveSchema.parse(input);
    let employeeId = data.employeeId;
    if (!employeeId || !["OWNER", "MANAGER"].includes(me.role)) {
      const mine = await getEmployeeForUser(me.userId);
      if (!mine) return { ok: false, error: "Your login isn't linked to an employee record yet." };
      employeeId = mine.id;
    }
    await hr.requestLeave({ clubId, employeeId, type: data.type, fromDate: data.fromDate, toDate: data.toDate, reason: data.reason });
    revalidateHr();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function decideLeaveAction(input: { leaveId: string; approve: boolean; note?: string }): Promise<HrResult> {
  try {
    const me = await requireRole(...HR_ADMIN);
    const { clubId } = await clubOf(me.userId);
    await hr.decideLeave({ clubId, leaveId: input.leaveId, approve: input.approve, note: input.note ?? null, byUserId: me.userId });
    revalidateHr();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function cancelLeaveAction(leaveId: string): Promise<HrResult> {
  try {
    const me = await requireRole(...STAFF);
    const { clubId } = await clubOf(me.userId);
    const mine = await getEmployeeForUser(me.userId);
    if (!mine) return { ok: false, error: "No employee record." };
    await hr.cancelLeave({ clubId, leaveId, employeeId: mine.id });
    revalidateHr();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ───────────────────────── Payroll ─────────────────────────

export async function generatePayrollAction(period: string): Promise<HrResult<{ runId: string }>> {
  try {
    const me = await requireRole(...PAYROLL);
    const { clubId } = await clubOf(me.userId);
    const run = await hr.generatePayroll({ clubId, period, byUserId: me.userId });
    revalidateHr();
    return { ok: true, data: { runId: run.id } };
  } catch (e) {
    return fail(e);
  }
}

export async function approvePayrollAction(runId: string): Promise<HrResult> {
  try {
    const me = await requireRole(...PAYROLL);
    const { clubId } = await clubOf(me.userId);
    await hr.approvePayroll({ clubId, runId, byUserId: me.userId });
    revalidateHr();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function payPayrollAction(input: { runId: string; paymentMode: PaymentMode; reference?: string }): Promise<HrResult> {
  try {
    const me = await requireRole(...PAYROLL);
    const { clubId } = await clubOf(me.userId);
    await hr.payPayroll({ clubId, runId: input.runId, paymentMode: input.paymentMode, reference: input.reference ?? null, byUserId: me.userId });
    revalidateHr();
    revalidatePath("/owner/finance");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function discardPayrollAction(runId: string): Promise<HrResult> {
  try {
    const me = await requireRole(...PAYROLL);
    const { clubId } = await clubOf(me.userId);
    await hr.discardPayroll({ clubId, runId });
    revalidateHr();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
