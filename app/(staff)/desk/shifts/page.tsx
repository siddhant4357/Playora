import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { addDaysToKey, formatDayLabel, todayKey } from "@/lib/time";
import { getEmployeeForUser, getOnDutyNow, getRota, listEmployeeLeave, LEAVE_STATUS_LABEL, LEAVE_TYPE_LABEL, weekKeys } from "@/lib/hr/queries";
import { PageHeader, Panel, Pill, Stat, statusTone } from "@/components/shared/Primitives";
import { ClockCard } from "@/components/hr/ClockCard";
import { RotaGrid } from "@/components/hr/RotaGrid";
import { RequestLeaveDialog, WithdrawLeaveButton } from "@/components/hr/LeaveActions";

export const metadata: Metadata = { title: "Shifts" };

export default async function ShiftsPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const user = await requireRole("OWNER", "MANAGER", "FRONT_DESK", "BAR_STAFF", "KITCHEN", "COACH");
  const { week } = await searchParams;
  const club = await prisma.club.findUniqueOrThrow({ where: { id: user.clubId }, select: { timezone: true } });
  const tz = club.timezone;
  const today = todayKey(tz);
  const anchor = week && /^\d{4}-\d{2}-\d{2}$/.test(week) ? week : today;
  const days = weekKeys(anchor, tz);

  const [rota, duty, me] = await Promise.all([getRota(user.clubId, days), getOnDutyNow(user.clubId, tz), getEmployeeForUser(user.userId)]);
  const myLeave = me ? await listEmployeeLeave(me.id) : [];
  const canManage = ["OWNER", "MANAGER", "FRONT_DESK"].includes(user.role);
  const canEdit = ["OWNER", "MANAGER"].includes(user.role);
  const meOpen = duty.open.some((o) => o.employee.id === me?.id);
  const todayShifts = rota.shifts.filter((s) => s.date === today).length;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader eyebrow="Front desk" title="Shifts" subtitle="Who is on duty, who is planned, who is on leave. Clock-ins here are what payroll pays." actions={me ? <RequestLeaveDialog balance={me.leaveBalance} /> : undefined} />

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="On duty now" value={duty.open.length} tone={duty.open.length > 0 ? "success" : undefined} />
        <Stat label="Planned today" value={todayShifts} hint={formatDayLabel(today, tz)} />
        <Stat label="On leave today" value={rota.leaves.filter((l) => l.fromDate <= today && l.toDate >= today).length} />
        <Stat label="Your leave balance" value={me ? `${me.leaveBalance} d` : "–"} hint={me ? me.designation : "Not an employee"} />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(280px,1fr)]">
        <Panel title="Weekly rota">
          <RotaGrid
            days={days}
            today={today}
            employees={rota.employees}
            shifts={rota.shifts}
            attendance={rota.attendance.map((a) => ({ employeeId: a.employeeId, date: a.date, minutes: a.minutes, clockOut: a.clockOut?.toISOString() ?? null }))}
            leaves={rota.leaves}
            canEdit={canEdit}
            prevHref={`/desk/shifts?week=${addDaysToKey(days[0], -7)}`}
            nextHref={`/desk/shifts?week=${addDaysToKey(days[0], 7)}`}
            weekLabel={`${formatDayLabel(days[0], tz)} – ${formatDayLabel(days[6], tz)}`}
          />
        </Panel>

        <div className="flex flex-col gap-5">
          <Panel title="Clock">
            <ClockCard
              me={{ employeeId: me?.id ?? null, open: meOpen }}
              onDuty={duty.open.map((o) => ({ id: o.id, clockIn: o.clockIn.toISOString(), employee: { id: o.employee.id, designation: o.employee.designation, user: { name: o.employee.user.name } } }))}
              canManage={canManage}
              roster={rota.employees.map((e) => ({ id: e.id, name: e.user.name, designation: e.designation }))}
            />
          </Panel>

          {me && (
            <Panel title="Your leave">
              {myLeave.length === 0 ? (
                <p className="py-4 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
                  No requests yet.
                </p>
              ) : (
                <ul className="flex flex-col divide-y" style={{ borderColor: "var(--color-border)" }}>
                  {myLeave.slice(0, 6).map((l) => (
                    <li key={l.id} className="flex items-center justify-between gap-2 py-2">
                      <div className="flex min-w-0 flex-col">
                        <span className="text-sm font-medium">
                          {LEAVE_TYPE_LABEL[l.type]} · {l.days} {l.days === 1 ? "day" : "days"}
                        </span>
                        <span className="truncate text-xs tabular-nums" style={{ color: "var(--color-text-muted)" }}>
                          {formatDayLabel(l.fromDate, tz)}
                          {l.fromDate !== l.toDate ? ` – ${formatDayLabel(l.toDate, tz)}` : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Pill tone={statusTone(l.status)}>{LEAVE_STATUS_LABEL[l.status]}</Pill>
                        {l.status === "PENDING" && <WithdrawLeaveButton leaveId={l.id} />}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
