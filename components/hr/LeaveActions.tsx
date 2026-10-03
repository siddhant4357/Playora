"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Plus, X } from "lucide-react";
import { cancelLeaveAction, decideLeaveAction, requestLeaveAction } from "@/lib/actions/hr";
import { LEAVE_TYPE_LABEL } from "@/lib/hr/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const selectCls = "h-9 w-full rounded-md border bg-transparent px-3 text-sm";

export function DecideLeaveButtons({ leaveId, name }: { leaveId: string; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  function decide(approve: boolean) {
    start(async () => {
      const res = await decideLeaveAction({ leaveId, approve });
      if (!res.ok) return void toast.error(res.error);
      toast.success(approve ? `Approved ${name}'s leave` : `Rejected ${name}'s leave`);
      router.refresh();
    });
  }
  return (
    <div className="flex items-center gap-1">
      <Button size="sm" variant="outline" disabled={pending} onClick={() => decide(false)} aria-label={`Reject leave for ${name}`}>
        <X className="h-4 w-4" /> Reject
      </Button>
      <Button size="sm" disabled={pending} onClick={() => decide(true)} aria-label={`Approve leave for ${name}`}>
        <Check className="h-4 w-4" /> Approve
      </Button>
    </div>
  );
}

export function WithdrawLeaveButton({ leaveId }: { leaveId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await cancelLeaveAction(leaveId);
          if (!res.ok) return void toast.error(res.error);
          toast.success("Request withdrawn");
          router.refresh();
        })
      }
    >
      Withdraw
    </Button>
  );
}

/** Staff request their own leave; owner/manager can pick an employee. */
export function RequestLeaveDialog({ employees, balance }: { employees?: { id: string; name: string }[]; balance?: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="h-4 w-4" /> Request leave
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request leave</DialogTitle>
          <DialogDescription>{balance !== undefined ? `${balance} paid ${balance === 1 ? "day" : "days"} left this year. Unpaid leave doesn't use the balance.` : "Paid leave is deducted from the balance on approval."}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              const res = await requestLeaveAction({
                employeeId: fd.get("employeeId") ? String(fd.get("employeeId")) : undefined,
                type: fd.get("type") as "CASUAL",
                fromDate: String(fd.get("from")),
                toDate: String(fd.get("to")),
                reason: String(fd.get("reason") ?? ""),
              });
              if (!res.ok) return void toast.error(res.error);
              toast.success("Leave requested");
              setOpen(false);
              router.refresh();
            });
          }}
        >
          {employees && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lv-emp">Employee</Label>
              <select id="lv-emp" name="employeeId" className={selectCls} style={{ borderColor: "var(--color-border)" }}>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lv-type">Type</Label>
            <select id="lv-type" name="type" defaultValue="CASUAL" className={selectCls} style={{ borderColor: "var(--color-border)" }}>
              {(Object.keys(LEAVE_TYPE_LABEL) as (keyof typeof LEAVE_TYPE_LABEL)[]).map((t) => (
                <option key={t} value={t}>
                  {LEAVE_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lv-from">From</Label>
              <Input id="lv-from" name="from" type="date" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lv-to">To</Label>
              <Input id="lv-to" name="to" type="date" required />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lv-reason">Reason</Label>
            <Textarea id="lv-reason" name="reason" rows={2} placeholder="Optional" />
          </div>
          <Button type="submit" disabled={pending} className="mt-1">
            Submit request
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
