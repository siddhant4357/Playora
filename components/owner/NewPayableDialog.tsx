"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { createPayableAction } from "@/lib/actions/finance";
import { PAYABLE_KIND_LABEL } from "@/lib/finance/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const KINDS = ["SUPPLIER", "SALARY", "REFUND", "TAX", "OTHER"] as const;
const selectCls = "h-9 w-full rounded-md border bg-transparent px-3 text-sm";

export function NewPayableDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const defaultDue = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="h-4 w-4" /> Add bill
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record something we owe</DialogTitle>
          <DialogDescription>It sits in the queue until you pay it. Nothing hits the ledger until then.</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              const res = await createPayableAction({
                kind: fd.get("kind") as (typeof KINDS)[number],
                payee: String(fd.get("payee") ?? ""),
                description: String(fd.get("description") ?? ""),
                amount: Math.round(Number(fd.get("amount") ?? 0) * 100),
                dueDate: new Date(String(fd.get("dueDate"))),
                reference: String(fd.get("reference") ?? ""),
              });
              if (!res.success) return void toast.error(res.error);
              toast.success(res.message);
              setOpen(false);
              router.refresh();
            });
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pb-kind">Kind</Label>
              <select id="pb-kind" name="kind" defaultValue="SUPPLIER" className={selectCls} style={{ borderColor: "var(--color-border)" }}>
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {PAYABLE_KIND_LABEL[k]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pb-amount">Amount (₹)</Label>
              <Input id="pb-amount" name="amount" type="number" min={1} step="0.01" required inputMode="decimal" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pb-payee">Payee</Label>
            <Input id="pb-payee" name="payee" required autoFocus placeholder="Yonex India" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pb-desc">What for</Label>
            <Input id="pb-desc" name="description" placeholder="Shuttlecocks + grips restock" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pb-ref">Bill / ref no.</Label>
              <Input id="pb-ref" name="reference" placeholder="Optional" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pb-due">Due date</Label>
              <Input id="pb-due" name="dueDate" type="date" required defaultValue={defaultDue} />
            </div>
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Add to payables"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
