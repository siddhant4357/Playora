"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "cn";
import { Plus, Printer } from "lucide-react";
import { moveTabAction, setDiscountAction, settleTabAction, voidItemAction, voidTabAction } from "@/lib/actions/bar";
import { formatPaise } from "@/lib/money";
import type { TabDetail as Tab } from "@/lib/bar/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Panel, Pill, statusTone } from "@/components/shared/Primitives";

type Serialized<T> = { [K in keyof T]: T[K] extends Date ? string : T[K] extends Date | null ? string | null : T[K] extends object ? Serialized<T[K]> : T[K] };
type Props = { tab: Serialized<Tab>; tables: { id: string; name: string }[]; canManage: boolean };

const MODES = ["CASH", "UPI", "CARD", "CREDIT", "COMPLIMENTARY"] as const;
type Mode = (typeof MODES)[number];

export function TabDetail({ tab, tables, canManage }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const open = tab.status === "OPEN";
  const live = tab.items.filter((i) => i.kitchenStatus !== "CANCELLED");
  const name = tab.member ? `${tab.member.firstName} ${tab.member.lastName}` : tab.guestName ?? "Guest";

  const run = (fn: () => Promise<{ success: boolean; message?: string; error?: string }>) =>
    start(async () => {
      const res = await fn();
      if (!res.success) return void toast.error(res.error);
      if (res.message) toast.success(res.message);
      router.refresh();
    });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <div className="flex flex-col gap-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
              {tab.tabNo} · {tab.table?.name ?? "Counter"}
            </p>
            <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
            <div className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
              <Pill tone={statusTone(tab.status)}>{tab.status}</Pill>
              {tab.member?.plan && <span>{tab.member.plan.name}</span>}
              {tab.source === "QR" && <Pill tone="accent">QR order</Pill>}
            </div>
          </div>
          <div className="flex gap-2">
            {open && (
              <Button variant="outline" render={<Link href={`/bar/pos?tab=${tab.id}`} />}>
                <Plus className="h-4 w-4" /> Add items
              </Button>
            )}
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Bill
            </Button>
          </div>
        </header>

        <Panel title={`Items · ${live.length}`}>
          <ul className="flex flex-col divide-y text-sm" style={{ borderColor: "var(--color-border)" }}>
            {tab.items.map((i) => (
              <li key={i.id} className={cn("flex items-center gap-3 py-2", i.kitchenStatus === "CANCELLED" && "opacity-50 line-through")}>
                <span className="w-8 tabular-nums">{i.qty}×</span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{i.name}</span>
                  {i.voidReason && (
                    <span className="text-xs no-underline" style={{ color: "var(--color-danger)" }}>
                      Void: {i.voidReason}
                    </span>
                  )}
                </span>
                {i.needsKitchen && i.kitchenStatus !== "CANCELLED" && <Pill tone={statusTone(i.kitchenStatus)}>{i.kitchenStatus}</Pill>}
                <span className="w-20 text-right tabular-nums">{formatPaise(i.unitPrice * i.qty)}</span>
                {open && i.kitchenStatus !== "CANCELLED" && <VoidItem itemId={i.id} name={i.name} onDone={() => router.refresh()} />}
              </li>
            ))}
          </ul>
        </Panel>

        {open && (
          <div className="flex flex-wrap gap-3">
            <Panel title="Move table" className="flex-1">
              <div className="flex flex-wrap gap-1.5">
                {tables.map((t) => (
                  <button key={t.id} type="button" disabled={pending || t.id === tab.tableId} onClick={() => run(() => moveTabAction({ tabId: tab.id, tableId: t.id }))} className={cn("rounded-full px-3 py-1 text-xs font-semibold", t.id === tab.tableId && "text-white")} style={t.id === tab.tableId ? { background: "var(--color-primary-900)" } : { background: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
                    {t.name}
                  </button>
                ))}
              </div>
            </Panel>
            <Panel title="Discount" className="w-full sm:w-64">
              <div className="flex flex-wrap gap-1.5">
                {[0, 5, 10, 15, 20, ...(canManage ? [50, 100] : [])].map((d) => (
                  <button key={d} type="button" disabled={pending} onClick={() => run(() => setDiscountAction({ tabId: tab.id, discountPct: d }))} className={cn("rounded-full px-3 py-1 text-xs font-semibold", tab.discountPct === d && "text-white")} style={tab.discountPct === d ? { background: "var(--color-primary-900)" } : { background: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
                    {d}%
                  </button>
                ))}
              </div>
            </Panel>
          </div>
        )}
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
        <Panel title="Bill">
          <dl className="flex flex-col gap-1 text-sm">
            <Row k="Subtotal" v={formatPaise(tab.subtotal)} />
            {tab.discount > 0 && <Row k={`Discount ${tab.discountPct}%`} v={`−${formatPaise(tab.discount)}`} />}
            <Row k="GST (incl.)" v={formatPaise(tab.tax)} muted />
            <div className="my-1 border-t" style={{ borderColor: "var(--color-border)" }} />
            <div className="flex items-center justify-between">
              <dt className="font-semibold">Total</dt>
              <dd className="text-2xl font-bold tabular-nums">{formatPaise(tab.total)}</dd>
            </div>
          </dl>
          {tab.payments.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm">
              {tab.payments.map((p) => (
                <li key={p.id} className="flex justify-between" style={{ color: "var(--color-text-muted)" }}>
                  <span>
                    {p.mode}
                    {p.reference ? ` · ${p.reference}` : ""}
                  </span>
                  <span className="tabular-nums">{formatPaise(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {open && live.length > 0 && <Settle tabId={tab.id} total={tab.total} memberCredit={tab.member?.creditBalance ?? 0} hasMember={Boolean(tab.member)} canManage={canManage} />}
        {open && canManage && <VoidTab tabId={tab.id} />}
      </aside>
    </div>
  );
}

function Row({ k, v, muted }: { k: string; v: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between" style={muted ? { color: "var(--color-text-muted)" } : undefined}>
      <dt>{k}</dt>
      <dd className="tabular-nums">{v}</dd>
    </div>
  );
}

function Settle({ tabId, total, memberCredit, hasMember, canManage }: { tabId: string; total: number; memberCredit: number; hasMember: boolean; canManage: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [split, setSplit] = useState(false);
  const [lines, setLines] = useState<{ mode: Mode; amount: string; reference: string }[]>([{ mode: "UPI", amount: String(total / 100), reference: "" }]);
  const sum = lines.reduce((s, l) => s + Math.round((parseFloat(l.amount) || 0) * 100), 0);
  const remaining = total - sum;

  const quick = (mode: Mode) =>
    start(async () => {
      const res = await settleTabAction({ tabId, payments: [{ mode, amount: total }] });
      if (!res.success) return void toast.error(res.error);
      toast.success(res.message);
      router.push("/bar/tabs");
    });
  const submitSplit = () =>
    start(async () => {
      const res = await settleTabAction({ tabId, payments: lines.filter((l) => parseFloat(l.amount) > 0).map((l) => ({ mode: l.mode, amount: Math.round(parseFloat(l.amount) * 100), reference: l.reference || undefined })) });
      if (!res.success) return void toast.error(res.error);
      toast.success(res.message);
      router.push("/bar/tabs");
    });

  return (
    <Panel title="Settle">
      {!split ? (
        <>
          <div className="grid grid-cols-3 gap-2">
            {(["CASH", "UPI", "CARD"] as Mode[]).map((m) => (
              <Button key={m} variant="outline" size="lg" disabled={pending} onClick={() => quick(m)}>
                {m}
              </Button>
            ))}
          </div>
          {hasMember && memberCredit >= total && (
            <Button variant="outline" disabled={pending} onClick={() => quick("CREDIT")}>
              Use member credit ({formatPaise(memberCredit)})
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="flex-1" onClick={() => setSplit(true)}>
              Split payment
            </Button>
            {canManage && (
              <Button variant="ghost" size="sm" className="flex-1" disabled={pending} onClick={() => quick("COMPLIMENTARY")}>
                Comp
              </Button>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-2">
          {lines.map((l, i) => (
            <div key={i} className="grid grid-cols-[88px_1fr_1fr] gap-1.5">
              <select value={l.mode} onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, mode: e.target.value as Mode } : x)))} className="h-9 rounded-md border bg-transparent px-2 text-sm" style={{ borderColor: "var(--color-border)" }} aria-label="Payment mode">
                {MODES.filter((m) => m !== "COMPLIMENTARY" && (m !== "CREDIT" || hasMember)).map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
              <Input type="number" step="0.01" min="0" value={l.amount} onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} aria-label="Amount in rupees" />
              <Input value={l.reference} onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, reference: e.target.value } : x)))} placeholder="Ref" aria-label="Reference" />
            </div>
          ))}
          <div className="flex items-center justify-between text-sm">
            <button type="button" className="underline-offset-4 hover:underline" onClick={() => setLines((ls) => [...ls, { mode: "CASH", amount: remaining > 0 ? String(remaining / 100) : "", reference: "" }])}>
              + Add payment
            </button>
            <span className="tabular-nums" style={{ color: remaining === 0 ? "var(--color-success)" : "var(--color-danger)" }}>
              {remaining === 0 ? "Balanced" : remaining > 0 ? `${formatPaise(remaining)} remaining` : `${formatPaise(-remaining)} over`}
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSplit(false)}>
              Back
            </Button>
            <Button className="flex-1" disabled={pending || remaining !== 0} onClick={submitSplit}>
              Settle {formatPaise(total)}
            </Button>
          </div>
        </div>
      )}
    </Panel>
  );
}

function VoidItem({ itemId, name, onDone }: { itemId: string; name: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<button type="button" className="text-xs underline-offset-4 hover:underline" style={{ color: "var(--color-danger)" }} />}>Void</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Void {name}</DialogTitle>
          <DialogDescription>Stock is returned and the reason is logged for the manager.</DialogDescription>
        </DialogHeader>
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Wrong order, spilled, guest changed mind…" autoFocus />
        <Button
          variant="destructive"
          disabled={pending || !reason.trim()}
          onClick={() =>
            start(async () => {
              const res = await voidItemAction({ itemId, reason });
              if (!res.success) return void toast.error(res.error);
              toast.success(res.message);
              setOpen(false);
              onDone();
            })
          }
        >
          Void item
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function VoidTab({ tabId }: { tabId: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  return (
    <Panel title="Manager">
      <div className="flex gap-2">
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason to void the whole tab" />
        <Button
          variant="destructive"
          disabled={pending || !reason.trim()}
          onClick={() =>
            start(async () => {
              const res = await voidTabAction({ tabId, reason });
              if (!res.success) return void toast.error(res.error);
              toast.success(res.message);
              router.push("/bar/tabs");
            })
          }
        >
          Void tab
        </Button>
      </div>
    </Panel>
  );
}
