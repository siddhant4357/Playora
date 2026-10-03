"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, UserPlus } from "lucide-react";
import { offboardEmployeeAction, upsertEmployeeAction } from "@/lib/actions/hr";
import { DEPARTMENTS, EMPLOYMENT_LABEL } from "@/lib/hr/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const selectCls = "h-9 w-full rounded-md border bg-transparent px-3 text-sm";

export interface EmployeeFormValues {
  id?: string;
  userId: string;
  designation: string;
  department: string;
  employmentType: "FULL_TIME" | "PART_TIME" | "CONTRACT";
  joinedOn: string;
  monthlySalaryRupees: number;
  hourlyRateRupees: number | null;
  leaveBalance: number;
}

export function EmployeeDialog({ unlinkedUsers, existing }: { unlinkedUsers: { id: string; name: string; email: string; role: string }[]; existing?: EmployeeFormValues & { name: string; active: boolean } }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const editing = !!existing;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={editing ? <Button size="icon" variant="ghost" aria-label={`Edit ${existing.name}`} /> : <Button size="sm" />}>
        {editing ? (
          <Pencil className="h-4 w-4" />
        ) : (
          <>
            <UserPlus className="h-4 w-4" /> Add employee
          </>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${existing.name}` : "Add employee"}</DialogTitle>
          <DialogDescription>{editing ? "Salary changes apply from the next payroll run." : "Links a staff login to an employee record so shifts, leave and payroll can follow them."}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              const res = await upsertEmployeeAction({
                id: existing?.id,
                userId: existing?.userId ?? String(fd.get("userId")),
                designation: String(fd.get("designation")),
                department: String(fd.get("department")),
                employmentType: fd.get("employmentType") as "FULL_TIME",
                joinedOn: String(fd.get("joinedOn")),
                monthlySalary: Math.round(Number(fd.get("salary")) * 100),
                hourlyRate: fd.get("hourly") ? Math.round(Number(fd.get("hourly")) * 100) : null,
                leaveBalance: Number(fd.get("leaveBalance")),
              });
              if (!res.ok) return void toast.error(res.error);
              toast.success(editing ? "Employee updated" : "Employee added");
              setOpen(false);
              router.refresh();
            });
          }}
        >
          {!editing && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="emp-user">Staff login</Label>
              <select id="emp-user" name="userId" required className={selectCls} style={{ borderColor: "var(--color-border)" }}>
                {unlinkedUsers.length === 0 && <option value="">Every staff login already has a record</option>}
                {unlinkedUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} · {u.email}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="emp-designation">Designation</Label>
              <Input id="emp-designation" name="designation" required defaultValue={existing?.designation} placeholder="Front desk executive" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="emp-dept">Department</Label>
              <select id="emp-dept" name="department" defaultValue={existing?.department ?? DEPARTMENTS[0]} className={selectCls} style={{ borderColor: "var(--color-border)" }}>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="emp-type">Employment</Label>
              <select id="emp-type" name="employmentType" defaultValue={existing?.employmentType ?? "FULL_TIME"} className={selectCls} style={{ borderColor: "var(--color-border)" }}>
                {(Object.keys(EMPLOYMENT_LABEL) as (keyof typeof EMPLOYMENT_LABEL)[]).map((t) => (
                  <option key={t} value={t}>
                    {EMPLOYMENT_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="emp-joined">Joined on</Label>
              <Input id="emp-joined" name="joinedOn" type="date" required defaultValue={existing?.joinedOn ?? new Date().toISOString().slice(0, 10)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="emp-salary">Monthly ₹</Label>
              <Input id="emp-salary" name="salary" type="number" min={0} step={1} required defaultValue={existing?.monthlySalaryRupees} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="emp-hourly">OT ₹/hr</Label>
              <Input id="emp-hourly" name="hourly" type="number" min={0} step={1} defaultValue={existing?.hourlyRateRupees ?? ""} placeholder="—" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="emp-leave">Leave days</Label>
              <Input id="emp-leave" name="leaveBalance" type="number" min={0} max={60} required defaultValue={existing?.leaveBalance ?? 12} />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 pt-1">
            {editing && existing.active ? (
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await offboardEmployeeAction(existing.id!);
                    if (!res.ok) return void toast.error(res.error);
                    toast.success("Marked as left");
                    setOpen(false);
                    router.refresh();
                  })
                }
              >
                Mark as left
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={pending || (!editing && unlinkedUsers.length === 0)}>
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
