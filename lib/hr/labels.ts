import type { EmploymentType, LeaveStatus, LeaveType, PayrollStatus } from "@/generated/prisma/client";

export const EMPLOYMENT_LABEL: Record<EmploymentType, string> = { FULL_TIME: "Full-time", PART_TIME: "Part-time", CONTRACT: "Contract" };
export const LEAVE_TYPE_LABEL: Record<LeaveType, string> = { CASUAL: "Casual", SICK: "Sick", EARNED: "Earned", UNPAID: "Unpaid" };
export const LEAVE_STATUS_LABEL: Record<LeaveStatus, string> = { PENDING: "Pending", APPROVED: "Approved", REJECTED: "Rejected", CANCELLED: "Withdrawn" };
export const PAYROLL_STATUS_LABEL: Record<PayrollStatus, string> = { DRAFT: "Draft", APPROVED: "Approved", PAID: "Paid" };
export const DEPARTMENTS = ["Front desk", "Bar", "Kitchen", "Coaching", "Management"] as const;
export const SHIFT_AREAS = ["Front desk", "Bar", "Kitchen", "Courts"] as const;
