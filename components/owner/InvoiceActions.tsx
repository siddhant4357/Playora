"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BadgeCheck, Ban } from "lucide-react";
import { markInvoicePaidAction, voidInvoiceAction } from "@/lib/actions/finance";
import { formatPaise } from "@/lib/money";
import { MODE_LABEL } from "@/lib/finance/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const MODES = ["UPI", "ONLINE", "CARD", "CASH"] as const;
const selectCls = "h-9 w-full rounded-md border bg-transparent px-3 text-sm";

export function InvoiceActions({ invoiceId, invoiceNo, total }: { invoiceId: string; invoiceNo: string; total: number }) {
  const router = useRouter();
  const [payOpen, setPayOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [pending, start] = useTransition();

  return (
    <>
      <Dialog open={voidOpen} onOpenChange={setVoidOpen}>
        <DialogTrigger render={<Button variant="outline" size="sm" />}>
          <Ban className="h-4 w-4" /> Void
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Void {invoiceNo}</DialogTitle>
            <DialogDescription>Keeps the number in sequence but marks it as never due. Nothing posts to the ledger.</DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const reason = String(new FormData(e.currentTarget).get("reason") ?? "");
              start(async () => {
                const res = await voidInvoiceAction({ invoiceId, reason });
                if (!res.success) return void toast.error(res.error);
                toast.success(res.message);
                setVoidOpen(false);
                router.refresh();
              });
            }}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="void-reason">Reason</Label>
              <Input id="void-reason" name="reason" required autoFocus placeholder="Issued to the wrong entity" />
            </div>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "Voiding…" : "Void invoice"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogTrigger render={<Button size="sm" />}>
          <BadgeCheck className="h-4 w-4" /> Mark paid
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
            <DialogDescription>
              {formatPaise(total)} against {invoiceNo}. This posts one entry to the ledger.
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              start(async () => {
                const res = await markInvoicePaidAction({ invoiceId, paymentMode: fd.get("mode") as (typeof MODES)[number], reference: String(fd.get("reference") ?? "") });
                if (!res.success) return void toast.error(res.error);
                toast.success(res.message);
                setPayOpen(false);
                router.refresh();
              });
            }}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pay-mode">Paid by</Label>
              <select id="pay-mode" name="mode" defaultValue="ONLINE" className={selectCls} style={{ borderColor: "var(--color-border)" }}>
                {MODES.map((m) => (
                  <option key={m} value={m}>
                    {MODE_LABEL[m]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pay-ref">Reference (UTR, cheque no.)</Label>
              <Input id="pay-ref" name="reference" placeholder="Optional" />
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? "Posting…" : `Record ${formatPaise(total)}`}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
