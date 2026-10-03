"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BadgeCheck, Banknote, Calculator, Trash2 } from "lucide-react";
import { approvePayrollAction, discardPayrollAction, generatePayrollAction, payPayrollAction } from "@/lib/actions/hr";
import { formatPaise } from "@/lib/money";
import { MODE_LABEL } from "@/lib/finance/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const MODES = ["ONLINE", "UPI", "CASH", "CARD"] as const;
const selectCls = "h-9 w-full rounded-md border bg-transparent px-3 text-sm";

export function GeneratePayrollForm({ defaultPeriod }: { defaultPeriod: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const period = String(new FormData(e.currentTarget).get("period"));
        start(async () => {
          const res = await generatePayrollAction(period);
          if (!res.ok) return void toast.error(res.error);
          toast.success(`Payroll drafted for ${period}`);
          router.push(`/owner/hr/payroll/${res.data!.runId}`);
        });
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pr-period">Month</Label>
        <Input id="pr-period" name="period" type="month" required defaultValue={defaultPeriod} className="w-44" />
      </div>
      <Button type="submit" disabled={pending}>
        <Calculator className="h-4 w-4" /> Generate draft
      </Button>
    </form>
  );
}

export function PayrollRunActions({ runId, status, net, period }: { runId: string; status: "DRAFT" | "APPROVED" | "PAID"; net: number; period: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  if (status === "PAID") return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="ghost"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await discardPayrollAction(runId);
            if (!res.ok) return void toast.error(res.error);
            toast.success("Draft discarded");
            router.push("/owner/hr/payroll");
          })
        }
      >
        <Trash2 className="h-4 w-4" /> Discard
      </Button>
      {status === "DRAFT" && (
        <Button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await approvePayrollAction(runId);
              if (!res.ok) return void toast.error(res.error);
              toast.success("Payroll approved");
              router.refresh();
            })
          }
        >
          <BadgeCheck className="h-4 w-4" /> Approve
        </Button>
      )}
      {status === "APPROVED" && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>
            <Banknote className="h-4 w-4" /> Mark paid
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Pay salaries · {period}</DialogTitle>
              <DialogDescription>{formatPaise(net)} posts to the ledger as a single PAYROLL outgoing. Payslips become final.</DialogDescription>
            </DialogHeader>
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                start(async () => {
                  const res = await payPayrollAction({ runId, paymentMode: fd.get("mode") as (typeof MODES)[number], reference: String(fd.get("reference") ?? "") });
                  if (!res.ok) return void toast.error(res.error);
                  toast.success("Salaries paid and posted to ledger");
                  setOpen(false);
                  router.refresh();
                });
              }}
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pr-mode">Paid by</Label>
                <select id="pr-mode" name="mode" defaultValue="ONLINE" className={selectCls} style={{ borderColor: "var(--color-border)" }}>
                  {MODES.map((m) => (
                    <option key={m} value={m}>
                      {MODE_LABEL[m]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pr-ref">Reference</Label>
                <Input id="pr-ref" name="reference" placeholder="NEFT batch / UTR (optional)" />
              </div>
              <Button type="submit" disabled={pending} className="mt-1">
                Confirm payment
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
