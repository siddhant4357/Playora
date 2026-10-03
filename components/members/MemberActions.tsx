"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "cn";
import { RefreshCw } from "lucide-react";
import { renewMembershipAction, setMemberStatusAction } from "@/lib/actions/members";
import { formatPaise } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type Plan = { id: string; name: string; priceMonthly: number; priceYearly: number };
const PAY = ["UPI", "CASH", "CARD", "ONLINE", "CREDIT", "COMPLIMENTARY"] as const;

export function MemberActions({ memberId, status, currentPlanId, creditBalance, plans, canManage }: { memberId: string; status: string; currentPlanId: string | null; creditBalance: number; plans: Plan[]; canManage: boolean }) {
  const [open, setOpen] = useState(false);
  const [planId, setPlanId] = useState(currentPlanId ?? plans[0]?.id ?? "");
  const [billing, setBilling] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [mode, setMode] = useState<(typeof PAY)[number]>("UPI");
  const [pending, start] = useTransition();
  const plan = plans.find((p) => p.id === planId);
  const fee = plan ? (billing === "YEARLY" ? plan.priceYearly : plan.priceMonthly) : 0;

  const renew = () =>
    start(async () => {
      const res = await renewMembershipAction({ memberId, planId, billing, paymentMode: mode });
      if (!res.success) return void toast.error(res.error);
      toast.success(res.message);
      setOpen(false);
    });

  const setStatus = (s: "ACTIVE" | "FROZEN" | "CANCELLED") =>
    start(async () => {
      const res = await setMemberStatusAction({ memberId, status: s });
      if (res.success) toast.success(res.message);
      else toast.error(res.error);
    });

  return (
    <div className="flex items-center gap-2">
      {canManage && status === "ACTIVE" && (
        <Button variant="outline" onClick={() => setStatus("FROZEN")} disabled={pending}>
          Freeze
        </Button>
      )}
      {canManage && status === "FROZEN" && (
        <Button variant="outline" onClick={() => setStatus("ACTIVE")} disabled={pending}>
          Unfreeze
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button />}>
          <RefreshCw className="h-4 w-4" /> {currentPlanId ? "Renew" : "Activate plan"}
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{currentPlanId ? "Renew membership" : "Activate a plan"}</DialogTitle>
            <DialogDescription>Fee posts to the ledger as a MEMBERSHIP transaction. Renewals extend from the current expiry.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="Plan">
              {plans.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={planId === p.id}
                  onClick={() => setPlanId(p.id)}
                  className="flex items-center justify-between rounded-xl px-3 py-2 text-sm"
                  style={{ background: planId === p.id ? "color-mix(in oklab, var(--color-accent-500) 12%, transparent)" : "var(--color-bg)", border: `1px solid ${planId === p.id ? "var(--color-accent-500)" : "var(--color-border)"}` }}
                >
                  <span className="font-semibold">{p.name}</span>
                  <span className="tabular-nums" style={{ color: "var(--color-text-muted)" }}>
                    {formatPaise(p.priceMonthly)}/mo
                  </span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(["MONTHLY", "YEARLY"] as const).map((b) => (
                <button key={b} type="button" onClick={() => setBilling(b)} className={cn("rounded-xl px-3 py-2 text-sm font-medium", billing === b && "text-white")} style={billing === b ? { background: "var(--color-primary-900)" } : { background: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
                  {b === "MONTHLY" ? "Monthly" : "Yearly"}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Payment mode">
              {PAY.map((m) => {
                const disabled = m === "CREDIT" && creditBalance < fee;
                return (
                  <button key={m} type="button" role="radio" aria-checked={mode === m} disabled={disabled} onClick={() => setMode(m)} className={cn("rounded-full px-3 py-1 text-xs font-semibold disabled:opacity-40", mode === m && "text-white")} style={mode === m ? { background: "var(--color-primary-900)" } : { background: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
                    {m}
                    {m === "CREDIT" && ` (${formatPaise(creditBalance)})`}
                  </button>
                );
              })}
            </div>
            <Button size="lg" onClick={renew} disabled={pending || !plan}>
              {pending ? "Posting…" : `Collect ${formatPaise(fee)}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
