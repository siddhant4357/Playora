"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "cn";
import { Plus, Trash2 } from "lucide-react";
import type { TabDetail } from "@/lib/bar/queries";
import { moveTabAction, setDiscountAction, settleTabAction, voidItemAction, voidTabAction } from "@/lib/actions/bar";
import { formatPaise } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, Panel, Pill, statusTone } from "@/components/shared/Primitives";

const MODES = ["UPI", "CASH", "CARD", "CREDIT", "COMPLIMENTARY"] as const;
type Mode = (typeof MODES)[number];

export function TabDetailView({ tab, tables, role }: { tab: TabDetail; tables: { id: string; name: string }[]; role: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [payments, setPayments] = useState<{ mode: Mode; amount: number }[]>([{ mode: "UPI", amount: tab.total }]);
  const [discount, setDiscount] = useState(tab.discountPct);
  const who = tab.table?.name ?? (tab.member ? `${tab.member.firstName} ${tab.member.lastName}` : tab.guestName ?? "Counter");
  const isOpen = tab.status === "OPEN";
  const manager = role === "MANAGER" || role === "OWNER";
  const paid = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = tab.total - paid;
  const live = tab.items.filter((i) => i.kitchenStatus !== "CANCELLED");

  const run = (fn: () => Promise<{ success: boolean; message?: string; error?: string }>, after?: () => void) =>
    start(async () => {
      const res = await fn();
      if (!res.success) return void toast.error(res.error);
      toast.success(res.message);
      after?.();
      router.refresh();
    });

  const setPay = (i: number, patch: Partial<{ mode: Mode; amount: number }>) => setPayments((p) => p.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const addSplit = () => setPayments((p) => [...p, { mode: "CASH", amount: Math.max(0, remaining) }]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow={tab.tabNo}
        title={who}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Pill tone={statusTone(tab.status)}>{tab.status}</Pill>
            {tab.member && (
              <Link href={`/desk/members/${tab.member.id}`} className="underline">
                {tab.member.memberCode} · {tab.member.plan?.name ?? "Trial"}
              </Link>
            )}
            {tab.source === "QR" && <span>Ordered from table QR</span>}
          </span>
        }
        actions={
          isOpen && (
            <>
              <Button variant="outline" nativeButton={false} render={<Link href={`/bar/pos?tab=${tab.id}`} />}>
                <Plus className="h-4 w-4" /> Add items
              </Button>
              {isOpen && (
                <select aria-label="Move to table" value={tab.tableId ?? ""} onChange={(e) => run(() => moveTabAction({ tabId: tab.id, tableId: e.target.value || null }))} className="h-9 rounded-md border bg-transparent px-2 text-sm" style={{ borderColor: "var(--color-border)" }}>
                  <option value="">Counter</option>
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              )}
              {manager && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    const reason = window.prompt("Reason for voiding the whole tab?");
                    if (reason) run(() => voidTabAction({ tabId: tab.id, reason }), () => router.push("/bar/tabs"));
                  }}
                >
                  Void tab
                </Button>
              )}
            </>
          )
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <Panel title="Items">
          {live.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>No items.</p>
          ) : (
            <ul className="flex flex-col divide-y text-sm" style={{ borderColor: "var(--color-border)" }}>
              {live.map((i) => (
                <li key={i.id} className="flex items-center gap-3 py-2">
                  <span className="w-6 text-right tabular-nums" style={{ color: "var(--color-text-muted)" }}>
                    {i.qty}×
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">{i.name}</span>
                    {i.notes && <span className="text-xs italic" style={{ color: "var(--color-text-muted)" }}>{i.notes}</span>}
                  </span>
                  {i.needsKitchen && <Pill tone={statusTone(i.kitchenStatus)}>{i.kitchenStatus}</Pill>}
                  <span className="w-20 text-right font-semibold tabular-nums">{formatPaise(i.unitPrice * i.qty)}</span>
                  {isOpen && (
                    <button
                      type="button"
                      aria-label={`Void ${i.name}`}
                      className="rounded-md p-1"
                      style={{ color: "var(--color-danger)" }}
                      onClick={() => {
                        const reason = window.prompt(`Void ${i.qty}× ${i.name} — reason?`);
                        if (reason) run(() => voidItemAction({ itemId: i.id, reason }));
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {tab.items.some((i) => i.kitchenStatus === "CANCELLED") && (
            <details className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              <summary className="cursor-pointer">Voided items</summary>
              <ul className="mt-1 flex flex-col gap-0.5">
                {tab.items.filter((i) => i.kitchenStatus === "CANCELLED").map((i) => (
                  <li key={i.id}>
                    {i.qty}× {i.name} — {i.voidReason}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel title="Bill">
            <dl className="flex flex-col gap-1 text-sm">
              <Row k="Subtotal" v={formatPaise(tab.subtotal)} />
              {isOpen ? (
                <div className="flex items-center justify-between gap-2">
                  <dt style={{ color: "var(--color-text-muted)" }}>Discount</dt>
                  <dd className="flex items-center gap-1">
                    <Input type="number" min={0} max={100} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} onBlur={() => discount !== tab.discountPct && run(() => setDiscountAction({ tabId: tab.id, discountPct: discount }))} className="h-7 w-16 text-right" aria-label="Discount percent" />
                    <span>%</span>
                  </dd>
                </div>
              ) : (
                tab.discount > 0 && <Row k={`Discount ${tab.discountPct}%`} v={`−${formatPaise(tab.discount)}`} />
              )}
              <Row k="Incl. GST" v={formatPaise(tab.tax)} muted />
              <div className="mt-1 flex items-center justify-between border-t pt-2" style={{ borderColor: "var(--color-border)" }}>
                <dt className="font-semibold">Total</dt>
                <dd className="text-2xl font-bold tabular-nums">{formatPaise(tab.total)}</dd>
              </div>
            </dl>
          </Panel>

          {isOpen ? (
            <Panel title="Settle">
              <div className="flex flex-col gap-2">
                {payments.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <select value={p.mode} onChange={(e) => setPay(i, { mode: e.target.value as Mode })} className="h-9 flex-1 rounded-md border bg-transparent px-2 text-sm" style={{ borderColor: "var(--color-border)" }} aria-label="Payment mode">
                      {MODES.filter((m) => (m !== "CREDIT" || tab.member) && (m !== "COMPLIMENTARY" || manager)).map((m) => (
                        <option key={m} value={m}>
                          {m}
                          {m === "CREDIT" && tab.member ? ` (${formatPaise(tab.member.creditBalance)})` : ""}
                        </option>
                      ))}
                    </select>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--color-text-muted)" }}>₹</span>
                      <Input type="number" min={0} step="1" value={p.amount / 100} onChange={(e) => setPay(i, { amount: Math.round(Number(e.target.value) * 100) })} className="w-28 pl-6 text-right tabular-nums" aria-label="Amount" />
                    </div>
                    {payments.length > 1 && (
                      <button type="button" aria-label="Remove split" onClick={() => setPayments((ps) => ps.filter((_, j) => j !== i))} className="p-1" style={{ color: "var(--color-text-muted)" }}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                <div className="flex items-center justify-between text-xs">
                  <button type="button" onClick={addSplit} className="underline">
                    Split payment
                  </button>
                  <span className={cn("tabular-nums", remaining !== 0 && "font-semibold")} style={{ color: remaining === 0 ? "var(--color-success)" : "var(--color-warning)" }}>
                    {remaining === 0 ? "Balanced" : remaining > 0 ? `${formatPaise(remaining)} remaining` : `${formatPaise(-remaining)} over`}
                  </span>
                </div>
                <Button size="lg" disabled={pending || remaining !== 0 || tab.total === 0} onClick={() => run(() => settleTabAction({ tabId: tab.id, payments }), () => router.push("/bar/tabs"))}>
                  {pending ? "Posting…" : `Settle ${formatPaise(tab.total)}`}
                </Button>
              </div>
            </Panel>
          ) : (
            <Panel title="Payments">
              <ul className="flex flex-col gap-1 text-sm">
                {tab.payments.map((p) => (
                  <li key={p.id} className="flex justify-between">
                    <span>{p.mode}</span>
                    <span className="tabular-nums">{formatPaise(p.amount)}</span>
                  </li>
                ))}
                {tab.voidReason && <li style={{ color: "var(--color-danger)" }}>Voided: {tab.voidReason}</li>}
              </ul>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, muted }: { k: string; v: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between" style={muted ? { color: "var(--color-text-muted)" } : undefined}>
      <dt style={{ color: "var(--color-text-muted)" }}>{k}</dt>
      <dd className="tabular-nums">{v}</dd>
    </div>
  );
}
