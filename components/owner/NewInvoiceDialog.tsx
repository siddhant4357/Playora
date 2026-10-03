"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FilePlus2, Plus, Trash2 } from "lucide-react";
import { createInvoiceAction } from "@/lib/actions/finance";
import { formatPaise } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MemberPicker, type PickedMember } from "@/components/bar/MemberPicker";

const selectCls = "h-9 w-full rounded-md border bg-transparent px-3 text-sm";
const RATES = [0, 5, 12, 18, 28];

interface Line {
  key: number;
  description: string;
  qty: string;
  unitPriceRupees: string;
  taxRatePct: number;
}

const newLine = (key: number): Line => ({ key, description: "", qty: "1", unitPriceRupees: "", taxRatePct: 18 });

function toPaise(rupees: string) {
  const n = Number(rupees);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export function NewInvoiceDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [member, setMember] = useState<PickedMember | null>(null);
  const [lines, setLines] = useState<Line[]>([newLine(1)]);
  const [kind, setKind] = useState<"MEMBERSHIP" | "CORPORATE" | "OTHER">("CORPORATE");

  const totals = lines.reduce(
    (acc, l) => {
      const amount = (parseInt(l.qty, 10) || 0) * toPaise(l.unitPriceRupees);
      const tax = Math.round((amount * l.taxRatePct) / 100);
      return { subtotal: acc.subtotal + amount, tax: acc.tax + tax };
    },
    { subtotal: 0, tax: 0 }
  );

  function update(key: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function reset() {
    setMember(null);
    setLines([newLine(1)]);
    setKind("CORPORATE");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger render={<Button />}>
        <FilePlus2 className="h-4 w-4" /> New invoice
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New invoice</DialogTitle>
          <DialogDescription>Prices are ex-GST; tax is added per line. The invoice number is assigned on save.</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              const res = await createInvoiceAction({
                kind,
                memberId: member?.id ?? null,
                billToName: String(fd.get("billToName") ?? ""),
                billToEmail: String(fd.get("billToEmail") ?? ""),
                billToPhone: String(fd.get("billToPhone") ?? ""),
                billToAddress: String(fd.get("billToAddress") ?? ""),
                billToGstin: String(fd.get("billToGstin") ?? ""),
                dueInDays: Number(fd.get("dueInDays") ?? 7),
                notes: String(fd.get("notes") ?? ""),
                items: lines.map((l) => ({ description: l.description, qty: parseInt(l.qty, 10) || 0, unitPrice: toPaise(l.unitPriceRupees), taxRatePct: l.taxRatePct })),
              });
              if (!res.success) return void toast.error(res.error);
              toast.success(res.message);
              setOpen(false);
              reset();
              router.push(`/owner/invoices/${res.data.invoiceId}`);
            });
          }}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inv-kind">Kind</Label>
              <select id="inv-kind" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className={selectCls} style={{ borderColor: "var(--color-border)" }}>
                <option value="CORPORATE">Corporate</option>
                <option value="MEMBERSHIP">Membership</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>Member (optional)</Label>
              {member ? (
                <div className="flex h-9 items-center justify-between rounded-md border px-3 text-sm" style={{ borderColor: "var(--color-border)" }}>
                  <span>{member.name}</span>
                  <button type="button" className="text-xs underline" onClick={() => setMember(null)}>
                    Clear
                  </button>
                </div>
              ) : (
                <MemberPicker onPick={setMember} placeholder="Attach a member to this invoice" />
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inv-name">Bill to</Label>
              <Input id="inv-name" name="billToName" required defaultValue={member?.name ?? ""} key={member?.id ?? "none"} placeholder="Company or person" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inv-gstin">GSTIN (optional)</Label>
              <Input id="inv-gstin" name="billToGstin" placeholder="27AABCU9603R1ZX" maxLength={15} className="uppercase" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inv-email">Email</Label>
              <Input id="inv-email" name="billToEmail" type="email" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inv-phone">Phone</Label>
              <Input id="inv-phone" name="billToPhone" />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="inv-address">Billing address</Label>
              <Input id="inv-address" name="billToAddress" />
            </div>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">Lines</legend>
            <div className="hidden gap-2 text-xs sm:grid sm:grid-cols-[1fr_4rem_7rem_5rem_2rem]" style={{ color: "var(--color-text-muted)" }}>
              <span>Description</span>
              <span>Qty</span>
              <span>Unit ₹ (ex-GST)</span>
              <span>GST</span>
              <span />
            </div>
            {lines.map((l) => (
              <div key={l.key} className="grid gap-2 sm:grid-cols-[1fr_4rem_7rem_5rem_2rem]">
                <Input aria-label="Description" value={l.description} onChange={(e) => update(l.key, { description: e.target.value })} required placeholder="Court block · 4 courts × 6 hrs" />
                <Input aria-label="Quantity" inputMode="numeric" value={l.qty} onChange={(e) => update(l.key, { qty: e.target.value.replace(/[^\d]/g, "") })} required />
                <Input aria-label="Unit price in rupees" inputMode="decimal" value={l.unitPriceRupees} onChange={(e) => update(l.key, { unitPriceRupees: e.target.value.replace(/[^\d.]/g, "") })} required placeholder="1500" />
                <select aria-label="GST rate" value={l.taxRatePct} onChange={(e) => update(l.key, { taxRatePct: Number(e.target.value) })} className={selectCls} style={{ borderColor: "var(--color-border)" }}>
                  {RATES.map((r) => (
                    <option key={r} value={r}>
                      {r}%
                    </option>
                  ))}
                </select>
                <Button type="button" variant="ghost" size="icon" aria-label="Remove line" disabled={lines.length === 1} onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div>
              <Button type="button" variant="outline" size="sm" onClick={() => setLines((ls) => [...ls, newLine((ls.at(-1)?.key ?? 0) + 1)])}>
                <Plus className="h-4 w-4" /> Add line
              </Button>
            </div>
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inv-notes">Notes on invoice</Label>
              <Textarea id="inv-notes" name="notes" rows={2} placeholder="Payment terms, PO number, bank details…" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inv-due">Due in (days)</Label>
              <Input id="inv-due" name="dueInDays" type="number" min={0} max={90} defaultValue={15} />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl p-3 text-sm" style={{ background: "var(--color-bg)" }}>
            <div className="flex flex-col text-xs" style={{ color: "var(--color-text-muted)" }}>
              <span>Subtotal {formatPaise(totals.subtotal)}</span>
              <span>GST {formatPaise(totals.tax)}</span>
            </div>
            <div className="text-lg font-bold tabular-nums">{formatPaise(totals.subtotal + totals.tax)}</div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || totals.subtotal === 0}>
              {pending ? "Issuing…" : "Issue invoice"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
