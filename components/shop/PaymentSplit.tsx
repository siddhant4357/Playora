"use client";

import { Plus, Trash2 } from "lucide-react";
import { cn } from "cn";
import { formatPaise, rupees } from "@/lib/money";
import { Input } from "@/components/ui/input";

export const PAY_MODES = ["UPI", "CASH", "CARD", "CREDIT", "COMPLIMENTARY"] as const;
export type PayMode = (typeof PAY_MODES)[number];
export type PaymentLine = { mode: PayMode; amount: number };

export function balanceOf(payments: PaymentLine[], total: number) {
  const paid = payments.reduce((s, p) => s + p.amount, 0);
  return { paid, remaining: total - paid, balanced: paid === total && total > 0 };
}

export function PaymentSplit({ total, payments, onChange, allowComp = true }: { total: number; payments: PaymentLine[]; onChange: (p: PaymentLine[]) => void; allowComp?: boolean }) {
  const { remaining, balanced } = balanceOf(payments, total);
  const set = (i: number, patch: Partial<PaymentLine>) => onChange(payments.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const modes = allowComp ? PAY_MODES : PAY_MODES.filter((m) => m !== "COMPLIMENTARY");

  return (
    <div className="flex flex-col gap-2">
      {payments.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="flex flex-1 flex-wrap gap-1" role="radiogroup" aria-label={`Payment ${i + 1} method`}>
            {modes.map((m) => (
              <button key={m} type="button" role="radio" aria-checked={p.mode === m} onClick={() => set(i, { mode: m })} className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide", p.mode === m && "text-white")} style={p.mode === m ? { background: "var(--color-primary-900)" } : { background: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
                {m === "COMPLIMENTARY" ? "Comp" : m}
              </button>
            ))}
          </div>
          <Input type="number" inputMode="decimal" min={0} step="0.01" value={p.amount ? (p.amount / 100).toString() : ""} onChange={(e) => set(i, { amount: rupees(Number(e.target.value || 0)) })} aria-label={`Payment ${i + 1} amount in rupees`} className="w-28 text-right tabular-nums" />
          {payments.length > 1 && (
            <button type="button" onClick={() => onChange(payments.filter((_, j) => j !== i))} className="rounded-md p-1" aria-label="Remove payment">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
      <div className="flex items-center justify-between text-xs">
        <button type="button" onClick={() => onChange([...payments, { mode: "CASH", amount: Math.max(0, remaining) }])} className="flex items-center gap-1 underline">
          <Plus className="h-3 w-3" /> Split payment
        </button>
        <span className="tabular-nums" style={{ color: balanced ? "var(--color-success)" : remaining < 0 ? "var(--color-danger)" : "var(--color-text-muted)" }}>
          {balanced ? "Balanced" : remaining > 0 ? `${formatPaise(remaining)} remaining` : `${formatPaise(-remaining)} over`}
        </span>
      </div>
    </div>
  );
}
