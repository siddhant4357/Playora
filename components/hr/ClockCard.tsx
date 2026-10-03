"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogIn, LogOut } from "lucide-react";
import { clockAction } from "@/lib/actions/hr";
import { Button } from "@/components/ui/button";

interface OnDuty {
  id: string;
  clockIn: string;
  employee: { id: string; designation: string; user: { name: string } };
}

export function ClockCard({ me, onDuty, canManage, roster }: { me: { employeeId: string | null; open: boolean }; onDuty: OnDuty[]; canManage: boolean; roster: { id: string; name: string; designation: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function run(direction: "in" | "out", employeeId?: string) {
    start(async () => {
      const res = await clockAction({ direction, employeeId });
      if (!res.ok) return void toast.error(res.error);
      toast.success(direction === "in" ? "Clocked in" : "Clocked out");
      router.refresh();
    });
  }

  const onDutyIds = new Set(onDuty.map((o) => o.employee.id));
  const offDuty = roster.filter((r) => !onDutyIds.has(r.id));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-2)" }}>
        <div className="flex flex-col">
          <span className="text-sm font-semibold">{me.open ? "You are on duty" : "You are off duty"}</span>
          <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            {me.employeeId ? "Attendance feeds payroll automatically." : "Your login isn't linked to an employee record yet."}
          </span>
        </div>
        {me.employeeId &&
          (me.open ? (
            <Button variant="outline" disabled={pending} onClick={() => run("out")}>
              <LogOut className="h-4 w-4" /> Clock out
            </Button>
          ) : (
            <Button disabled={pending} onClick={() => run("in")}>
              <LogIn className="h-4 w-4" /> Clock in
            </Button>
          ))}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
          On duty now · {onDuty.length}
        </p>
        {onDuty.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Nobody has clocked in yet.
          </p>
        ) : (
          <ul className="flex flex-col divide-y" style={{ borderColor: "var(--color-border)" }}>
            {onDuty.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 py-2">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">{o.employee.user.name}</span>
                  <span className="truncate text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {o.employee.designation} · since {new Date(o.clockIn).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                {canManage && o.employee.id !== me.employeeId && (
                  <Button size="sm" variant="ghost" disabled={pending} onClick={() => run("out", o.employee.id)}>
                    Clock out
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {canManage && offDuty.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
            Clock in a colleague
          </p>
          <div className="flex flex-wrap gap-2">
            {offDuty.map((r) => (
              <Button key={r.id} size="sm" variant="outline" disabled={pending} onClick={() => run("in", r.id)}>
                {r.name.split(" ")[0]}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
