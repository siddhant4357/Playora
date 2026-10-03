import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDayLabel } from "@/lib/time";
import { LEAVE_STATUS_LABEL, LEAVE_TYPE_LABEL, listEmployees, listLeave } from "@/lib/hr/queries";
import { PageHeader, Panel, Pill, statusTone } from "@/components/shared/Primitives";
import { DecideLeaveButtons, RequestLeaveDialog } from "@/components/hr/LeaveActions";

export const metadata: Metadata = { title: "Leave approvals" };

export default async function LeavePage() {
  const user = await requireRole("OWNER", "MANAGER");
  const club = await prisma.club.findUniqueOrThrow({ where: { id: user.clubId }, select: { timezone: true } });
  const tz = club.timezone;
  const [all, employees] = await Promise.all([listLeave(user.clubId), listEmployees(user.clubId)]);
  const pending = all.filter((l) => l.status === "PENDING");
  const decided = all.filter((l) => l.status !== "PENDING").sort((a, b) => (b.decidedAt?.getTime() ?? 0) - (a.decidedAt?.getTime() ?? 0));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader eyebrow="HR" title="Leave approvals" subtitle="Approving paid leave deducts the balance and tells payroll the day was paid. Unpaid leave never touches the balance." actions={<RequestLeaveDialog employees={employees.filter((e) => !e.leftOn).map((e) => ({ id: e.id, name: e.user.name }))} />} />

      <Panel title={`Pending · ${pending.length}`}>
        {pending.length === 0 ? (
          <p className="py-8 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
            Inbox zero. Nothing waiting on you.
          </p>
        ) : (
          <ul className="flex flex-col divide-y" style={{ borderColor: "var(--color-border)" }}>
            {pending.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{l.employee.user.name}</span>
                    <Pill tone={l.type === "UNPAID" ? "warning" : "neutral"}>{LEAVE_TYPE_LABEL[l.type]}</Pill>
                    <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                      {l.employee.designation}
                    </span>
                  </div>
                  <span className="text-sm tabular-nums">
                    {formatDayLabel(l.fromDate, tz)}
                    {l.fromDate !== l.toDate ? ` – ${formatDayLabel(l.toDate, tz)}` : ""} · {l.days} {l.days === 1 ? "day" : "days"}
                    {l.type !== "UNPAID" && (
                      <span style={{ color: l.employee.leaveBalance < l.days ? "var(--color-danger)" : "var(--color-text-muted)" }}>
                        {" "}
                        · {l.employee.leaveBalance} left
                      </span>
                    )}
                  </span>
                  {l.reason && (
                    <span className="truncate text-xs" style={{ color: "var(--color-text-muted)" }}>
                      “{l.reason}”
                    </span>
                  )}
                </div>
                <DecideLeaveButtons leaveId={l.id} name={l.employee.user.name.split(" ")[0]} />
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="History">
        {decided.length === 0 ? (
          <p className="py-6 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
            No decisions yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs" style={{ color: "var(--color-text-muted)" }}>
                  <th className="py-2 pr-3 font-medium">Employee</th>
                  <th className="py-2 pr-3 font-medium">Type</th>
                  <th className="py-2 pr-3 font-medium">Dates</th>
                  <th className="py-2 pr-3 text-right font-medium">Days</th>
                  <th className="py-2 pl-3 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {decided.slice(0, 40).map((l) => (
                  <tr key={l.id} style={{ borderTop: "1px solid var(--color-border)" }}>
                    <td className="py-2 pr-3 font-medium">{l.employee.user.name}</td>
                    <td className="py-2 pr-3 text-xs">{LEAVE_TYPE_LABEL[l.type]}</td>
                    <td className="whitespace-nowrap py-2 pr-3 tabular-nums" style={{ color: "var(--color-text-muted)" }}>
                      {formatDayLabel(l.fromDate, tz)}
                      {l.fromDate !== l.toDate ? ` – ${formatDayLabel(l.toDate, tz)}` : ""}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{l.days}</td>
                    <td className="py-2 pl-3 text-right">
                      <Pill tone={statusTone(l.status)}>{LEAVE_STATUS_LABEL[l.status]}</Pill>
                    </td>
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
