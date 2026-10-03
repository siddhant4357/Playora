"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban, CheckCircle2 } from "lucide-react";
import { payPayableAction, voidPayableAction } from "@/lib/actions/finance";
import { formatPaise } from "@/lib/money";
import { MODE_LABEL } from "@/lib/finance/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const MODES = ["ONLINE", "UPI", "CASH", "CARD"] as const;
const selectCls = "h-9 w-full rounded-md border bg-transparent px-3 text-sm";

export function PayableActions({ payableId, payee, amount }: { payableId: string; payee: string; amount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Void payable to ${payee}`}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await voidPayableAction(payableId);
            if (!res.success) return void toast.error(res.error);
            toast.success(res.message);
            router.refresh();
          })
        }
      >
        <Ban className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button size="sm" variant="outline" />}>
          <CheckCircle2 className="h-4 w-4" /> Pay
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Pay {payee}</DialogTitle>
            <DialogDescription>{formatPaise(amount)} goes out of the ledger as an outgoing.</DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              start(async () => {
                const res = await payPayableAction({ payableId, paymentMode: fd.get("mode") as (typeof MODES)[number], reference: String(fd.get("reference") ?? "") });
                if (!res.success) return void toast.error(res.error);
                toast.success(res.message);
                setOpen(false);
                router.refresh();
              });
            }}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`pp-mode-${payableId}`}>Paid by</Label>
              <select id={`pp-mode-${payableId}`} name="mode" defaultValue="ONLINE" className={selectCls} style={{ borderColor: "var(--color-border)" }}>
                {MODES.map((m) => (
                  <option key={m} value={m}>
                    {MODE_LABEL[m]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`pp-ref-${payableId}`}>Reference (UTR, cheque)</Label>
              <Input id={`pp-ref-${payableId}`} name="reference" placeholder="Optional" />
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? "Posting…" : `Pay ${formatPaise(amount)}`}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
