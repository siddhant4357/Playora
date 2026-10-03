"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { deleteShiftAction, upsertShiftAction } from "@/lib/actions/hr";
import { SHIFT_AREAS } from "@/lib/hr/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface RotaEmployee {
  id: string;
  department: string;
  designation: string;
  user: { name: string };
}
export interface RotaShift {
  id: string;
  employeeId: string;
  date: string;
  startMin: number;
  endMin: number;
  area: string;
}
export interface RotaAttendance {
  employeeId: string;
  date: string;
  minutes: number | null;
  clockOut: string | null;
}
export interface RotaLeave {
  employeeId: string;
  fromDate: string;
  toDate: string;
  type: string;
}

function hhmm(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function toMin(hhmmStr: string) {
  const [h, m] = hhmmStr.split(":").map(Number);
  return h * 60 + m;
}

const selectCls = "h-9 w-full rounded-md border bg-transparent px-3 text-sm";

export function RotaGrid({ days, today, employees, shifts, attendance, leaves, canEdit, prevHref, nextHref, weekLabel }: { days: string[]; today: string; employees: RotaEmployee[]; shifts: RotaShift[]; attendance: RotaAttendance[]; leaves: RotaLeave[]; canEdit: boolean; prevHref: string; nextHref: string; weekLabel: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<{ employeeId: string; date: string; shift?: RotaShift } | null>(null);

  const shiftAt = (e: string, d: string) => shifts.filter((s) => s.employeeId === e && s.date === d);
  const attAt = (e: string, d: string) => attendance.filter((a) => a.employeeId === e && a.date === d);
  const leaveAt = (e: string, d: string) => leaves.find((l) => l.employeeId === e && l.fromDate <= d && l.toDate >= d);

  const grouped = employees.reduce<Record<string, RotaEmployee[]>>((acc, e) => {
    (acc[e.department] ??= []).push(e);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="icon" aria-label="Previous week" render={<Link href={prevHref} />} nativeButton={false}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold">{weekLabel}</span>
        <Button variant="ghost" size="icon" aria-label="Next week" render={<Link href={nextHref} />} nativeButton={false}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-separate text-xs" style={{ borderSpacing: 0 }}>
          <thead>
            <tr>
              <th className="sticky left-0 z-10 py-2 pr-3 text-left font-medium" style={{ background: "var(--color-surface)", color: "var(--color-text-muted)" }}>
                Staff
              </th>
              {days.map((d) => {
                const dt = new Date(`${d}T12:00:00Z`);
                const isToday = d === today;
                return (
                  <th key={d} className="px-1 py-2 text-center font-medium" style={{ color: isToday ? "var(--color-accent)" : "var(--color-text-muted)" }}>
                    <div className="flex flex-col">
                      <span>{dt.toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" })}</span>
                      <span className="text-sm font-semibold" style={{ color: isToday ? "var(--color-accent)" : "var(--color-text)" }}>
                        {dt.getUTCDate()}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {Object.entries(grouped).map(([dept, rows]) => (
              <RotaGroup key={dept} label={dept}>
                {rows.map((e) => (
                  <tr key={e.id}>
                    <td className="sticky left-0 z-10 py-1 pr-3 align-top" style={{ background: "var(--color-surface)", borderTop: "1px solid var(--color-border)" }}>
                      <div className="flex flex-col">
                        <span className="whitespace-nowrap text-sm font-medium">{e.user.name}</span>
                        <span className="whitespace-nowrap" style={{ color: "var(--color-text-muted)" }}>
                          {e.designation}
                        </span>
                      </div>
                    </td>
                    {days.map((d) => {
                      const cellShifts = shiftAt(e.id, d);
                      const att = attAt(e.id, d);
                      const leave = leaveAt(e.id, d);
                      const worked = att.reduce((a, x) => a + (x.minutes ?? 0), 0);
                      const open = att.some((x) => !x.clockOut);
                      const isPast = d < today;
                      return (
                        <td key={d} className="px-1 py-1 align-top" style={{ borderTop: "1px solid var(--color-border)" }}>
                          <div className="flex min-h-12 flex-col gap-1">
                            {leave ? (
                              <span className="rounded px-2 py-1 text-center font-medium" style={{ background: "color-mix(in oklab, var(--color-warning) 18%, transparent)", color: "var(--color-warning)" }}>
                                {leave.type === "UNPAID" ? "Unpaid leave" : "On leave"}
                              </span>
                            ) : (
                              cellShifts.map((s) => (
                                <button
                                  key={s.id}
                                  type="button"
                                  disabled={!canEdit}
                                  onClick={() => canEdit && setEditing({ employeeId: e.id, date: d, shift: s })}
                                  className="flex flex-col rounded px-2 py-1 text-left"
                                  style={{
                                    background: open ? "color-mix(in oklab, var(--color-success) 20%, transparent)" : isPast && worked === 0 ? "color-mix(in oklab, var(--color-danger) 14%, transparent)" : "var(--color-surface-2)",
                                    border: "1px solid var(--color-border)",
                                    cursor: canEdit ? "pointer" : "default",
                                  }}
                                >
                                  <span className="font-semibold tabular-nums">
                                    {hhmm(s.startMin)}–{hhmm(s.endMin)}
                                  </span>
                                  <span style={{ color: "var(--color-text-muted)" }}>
                                    {s.area}
                                    {open ? " · on duty" : isPast ? (worked > 0 ? ` · ${Math.round(worked / 60)}h` : " · absent") : ""}
                                  </span>
                                </button>
                              ))
                            )}
                            {canEdit && !leave && cellShifts.length === 0 && (
                              <button type="button" aria-label={`Add shift for ${e.user.name} on ${d}`} onClick={() => setEditing({ employeeId: e.id, date: d })} className="flex h-full min-h-10 items-center justify-center rounded border border-dashed" style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}>
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </RotaGroup>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing?.shift ? "Edit shift" : "Add shift"}</DialogTitle>
            <DialogDescription>{editing ? `${employees.find((e) => e.id === editing.employeeId)?.user.name} · ${editing.date}` : ""}</DialogDescription>
          </DialogHeader>
          {editing && (
            <form
              className="flex flex-col gap-3"
              onSubmit={(ev) => {
                ev.preventDefault();
                const fd = new FormData(ev.currentTarget);
                start(async () => {
                  const res = await upsertShiftAction({
                    employeeId: editing.employeeId,
                    date: editing.date,
                    startMin: toMin(String(fd.get("start"))),
                    endMin: toMin(String(fd.get("end"))),
                    area: String(fd.get("area")),
                    notes: String(fd.get("notes") ?? ""),
                  });
                  if (!res.ok) return void toast.error(res.error);
                  toast.success("Shift saved");
                  setEditing(null);
                  router.refresh();
                });
              }}
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="shift-start">Start</Label>
                  <Input id="shift-start" name="start" type="time" required defaultValue={editing.shift ? hhmm(editing.shift.startMin) : "09:00"} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="shift-end">End</Label>
                  <Input id="shift-end" name="end" type="time" required defaultValue={editing.shift ? hhmm(editing.shift.endMin) : "18:00"} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="shift-area">Area</Label>
                <select id="shift-area" name="area" defaultValue={editing.shift?.area ?? SHIFT_AREAS[0]} className={selectCls} style={{ borderColor: "var(--color-border)" }}>
                  {SHIFT_AREAS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="shift-notes">Notes</Label>
                <Input id="shift-notes" name="notes" placeholder="Optional" />
              </div>
              <div className="flex items-center justify-between gap-2 pt-1">
                {editing.shift ? (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const res = await deleteShiftAction(editing.shift!.id);
                        if (!res.ok) return void toast.error(res.error);
                        toast.success("Shift removed");
                        setEditing(null);
                        router.refresh();
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" /> Remove
                  </Button>
                ) : (
                  <span />
                )}
                <Button type="submit" disabled={pending}>
                  Save
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RotaGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <tr>
        <td colSpan={8} className="pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
          {label}
        </td>
      </tr>
      {children}
    </>
  );
}
