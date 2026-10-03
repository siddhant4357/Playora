"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "cn";
import { Minus, Plus, Send, Trash2, UserRound } from "lucide-react";
import type { MenuItem } from "@/lib/bar/queries";
import { sendOrderAction } from "@/lib/actions/bar";
import { formatPaise } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MemberPicker } from "@/components/bar/MemberPicker";

type Table = { id: string; name: string; zone: string; seats: number };
type OpenTab = { id: string; tabNo: string; tableId: string | null; total: number; guestName: string | null; memberName: string | null; pending: number };
type CartLine = { product: MenuItem; qty: number; notes?: string };

const CATS: { key: string; label: string }[] = [
  { key: "BEVERAGE", label: "Drinks" },
  { key: "FOOD", label: "Food" },
];

export function BarPos({ menu, tables, openTabs, initialTabId, initialTableId }: { menu: MenuItem[]; tables: Table[]; openTabs: OpenTab[]; initialTabId: string | null; initialTableId: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [cat, setCat] = useState("BEVERAGE");
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [tableId, setTableId] = useState<string | null>(initialTableId ?? openTabs.find((t) => t.id === initialTabId)?.tableId ?? null);
  const [tabId, setTabId] = useState<string | null>(initialTabId ?? (initialTableId ? openTabs.find((t) => t.tableId === initialTableId)?.id ?? null : null));
  const [member, setMember] = useState<{ id: string; name: string } | null>(null);
  const [guestName, setGuestName] = useState("");

  const visible = useMemo(() => menu.filter((m) => m.category === cat && (!q || m.name.toLowerCase().includes(q.toLowerCase()))), [menu, cat, q]);
  const subtotal = cart.reduce((s, l) => s + l.product.price * l.qty, 0);
  const activeTab = openTabs.find((t) => t.id === tabId) ?? null;

  const add = (p: MenuItem) => {
    if (!p.isAvailable) return toast.error(`${p.name} is 86'd.`);
    setCart((c) => {
      const i = c.findIndex((l) => l.product.id === p.id);
      if (i >= 0) return c.map((l, j) => (j === i ? { ...l, qty: l.qty + 1 } : l));
      return [...c, { product: p, qty: 1 }];
    });
  };
  const bump = (id: string, d: number) => setCart((c) => c.map((l) => (l.product.id === id ? { ...l, qty: l.qty + d } : l)).filter((l) => l.qty > 0));

  const pickTable = (t: Table) => {
    setTableId(t.id);
    setTabId(openTabs.find((o) => o.tableId === t.id)?.id ?? null);
  };

  const send = () =>
    start(async () => {
      const res = await sendOrderAction({ tabId, tableId, memberId: member?.id, guestName: guestName || undefined, lines: cart.map((l) => ({ productId: l.product.id, qty: l.qty, notes: l.notes })) });
      if (!res.success) return void toast.error(res.error);
      toast.success(res.message);
      setCart([]);
      setTabId(res.data.tabId);
      router.refresh();
    });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-4">
        <section aria-label="Tables" className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { setTableId(null); setTabId(null); }} className={cn("rounded-xl px-3 py-2 text-sm font-medium", !tableId && "text-white")} style={!tableId ? { background: "var(--color-primary-900)" } : { background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              Counter
            </button>
            {tables.map((t) => {
              const open = openTabs.find((o) => o.tableId === t.id);
              const sel = tableId === t.id;
              return (
                <button key={t.id} type="button" onClick={() => pickTable(t)} className={cn("flex min-w-20 flex-col items-start rounded-xl px-3 py-2 text-left text-sm", sel && "text-white")} style={sel ? { background: "var(--color-primary-900)" } : { background: open ? "color-mix(in oklab, var(--color-warning) 14%, var(--color-surface))" : "var(--color-surface)", border: `1px solid ${open ? "var(--color-warning)" : "var(--color-border)"}` }} aria-pressed={sel}>
                  <span className="font-semibold">{t.name}</span>
                  <span className={cn("text-[11px] tabular-nums", !sel && "opacity-70")}>{open ? formatPaise(open.total) : `${t.seats} seats`}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section aria-label="Menu" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {CATS.map((c) => (
              <button key={c.key} type="button" onClick={() => setCat(c.key)} className={cn("rounded-full px-4 py-1.5 text-sm font-medium", cat === c.key && "text-white")} style={cat === c.key ? { background: "var(--color-accent-600)" } : { background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                {c.label}
              </button>
            ))}
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search menu" aria-label="Search menu" className="ml-auto w-44" />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
            {visible.map((p) => (
              <button key={p.id} type="button" onClick={() => add(p)} disabled={!p.isAvailable} className="flex min-h-24 flex-col justify-between rounded-2xl p-3 text-left transition-transform active:scale-[0.98] disabled:opacity-40" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                <span className="text-sm font-semibold leading-tight text-pretty">{p.name}</span>
                <span className="flex items-center justify-between text-xs">
                  <span className="font-bold tabular-nums">{formatPaise(p.price)}</span>
                  {!p.isAvailable ? <span style={{ color: "var(--color-danger)" }}>86&apos;d</span> : p.trackStock && p.stockQty <= p.lowStockAt ? <span style={{ color: "var(--color-warning)" }}>{p.stockQty} left</span> : null}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>

      <aside className="flex flex-col gap-3 rounded-2xl p-4 lg:sticky lg:top-4 lg:self-start" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }} aria-label="Order">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{activeTab ? `${activeTab.tabNo}` : tableId ? `New tab · ${tables.find((t) => t.id === tableId)?.name}` : "New counter tab"}</h2>
          {activeTab && (
            <Button size="sm" variant="outline" onClick={() => router.push(`/bar/tabs/${activeTab.id}`)}>
              Tab · {formatPaise(activeTab.total)}
            </Button>
          )}
        </div>

        {!activeTab && (
          <div className="flex flex-col gap-2">
            {member ? (
              <div className="flex items-center justify-between rounded-xl px-3 py-2 text-sm" style={{ background: "color-mix(in oklab, var(--color-accent-500) 12%, transparent)" }}>
                <span className="flex items-center gap-2">
                  <UserRound className="h-4 w-4" /> {member.name}
                </span>
                <button type="button" className="text-xs underline" onClick={() => setMember(null)}>
                  Remove
                </button>
              </div>
            ) : (
              <MemberPicker onPick={(m) => setMember(m)} />
            )}
            {!member && <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Guest name (optional)" aria-label="Guest name" />}
          </div>
        )}

        {cart.length === 0 ? (
          <p className="py-8 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
            Tap items to add them.
          </p>
        ) : (
          <ul className="flex flex-col divide-y" style={{ borderColor: "var(--color-border)" }}>
            {cart.map((l) => (
              <li key={l.product.id} className="flex items-center gap-2 py-2 text-sm">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{l.product.name}</span>
                  <span className="text-xs tabular-nums" style={{ color: "var(--color-text-muted)" }}>
                    {formatPaise(l.product.price)} × {l.qty}
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <button type="button" onClick={() => bump(l.product.id, -1)} className="rounded-md p-1" style={{ background: "var(--color-bg)" }} aria-label={`Remove one ${l.product.name}`}>
                    {l.qty === 1 ? <Trash2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                  </button>
                  <span className="w-6 text-center tabular-nums">{l.qty}</span>
                  <button type="button" onClick={() => bump(l.product.id, 1)} className="rounded-md p-1" style={{ background: "var(--color-bg)" }} aria-label={`Add one ${l.product.name}`}>
                    <Plus className="h-4 w-4" />
                  </button>
                </span>
                <span className="w-16 text-right font-semibold tabular-nums">{formatPaise(l.product.price * l.qty)}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center justify-between border-t pt-3" style={{ borderColor: "var(--color-border)" }}>
          <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            To send
          </span>
          <span className="text-xl font-bold tabular-nums">{formatPaise(subtotal, { free: "₹0" })}</span>
        </div>
        <Button size="lg" onClick={send} disabled={pending || cart.length === 0}>
          <Send className="h-4 w-4" /> {pending ? "Sending…" : activeTab ? "Add to tab" : "Open tab & send"}
        </Button>
      </aside>
    </div>
  );
}
