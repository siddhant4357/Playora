"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "cn";
import { ChefHat, Minus, Plus, Receipt, Search, Send, Trash2, UserRound, X } from "lucide-react";
import { sendOrderAction } from "@/lib/actions/bar";
import { formatPaise } from "@/lib/money";
import type { MenuItem } from "@/lib/bar/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/shared/Primitives";
import { MemberPicker, type PickedMember } from "@/components/bar/MemberPicker";

type Table = { id: string; name: string; zone: string; seats: number };
type OpenTab = { id: string; tabNo: string; tableId: string | null; label: string; total: number; openedAt: string; pendingKitchen: number; source: string };
type CartLine = { productId: string; name: string; unitPrice: number; qty: number; category: string; notes?: string };

const CATS: { key: string; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "BEVERAGE", label: "Drinks" },
  { key: "FOOD", label: "Food" },
];

export function BarPos({ menu, tables, openTabs, initialTabId, initialTableId, shiftOpen }: { menu: MenuItem[]; tables: Table[]; openTabs: OpenTab[]; initialTabId: string | null; initialTableId: string | null; shiftOpen: boolean }) {
  const router = useRouter();
  const [tabId, setTabId] = useState<string | null>(initialTabId);
  const [tableId, setTableId] = useState<string | null>(initialTableId ?? openTabs.find((t) => t.id === initialTabId)?.tableId ?? null);
  const [member, setMember] = useState<PickedMember | null>(null);
  const [guestName, setGuestName] = useState("");
  const [cat, setCat] = useState("ALL");
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [pending, start] = useTransition();

  const activeTab = openTabs.find((t) => t.id === tabId) ?? null;
  const tableTab = (id: string) => openTabs.find((t) => t.tableId === id) ?? null;

  const items = useMemo(() => menu.filter((m) => (cat === "ALL" || m.category === cat) && (!q || m.name.toLowerCase().includes(q.toLowerCase()))), [menu, cat, q]);
  const cartTotal = cart.reduce((s, l) => s + l.unitPrice * l.qty, 0);

  const add = (m: MenuItem) => {
    if (!m.isAvailable) return toast.error(`${m.name} is 86'd.`);
    setCart((c) => {
      const i = c.findIndex((l) => l.productId === m.id);
      if (i >= 0) return c.map((l, idx) => (idx === i ? { ...l, qty: l.qty + 1 } : l));
      return [...c, { productId: m.id, name: m.name, unitPrice: m.price, qty: 1, category: m.category }];
    });
  };
  const bump = (productId: string, d: number) => setCart((c) => c.map((l) => (l.productId === productId ? { ...l, qty: l.qty + d } : l)).filter((l) => l.qty > 0));

  const pickTable = (t: Table) => {
    setTableId(t.id);
    const existing = tableTab(t.id);
    setTabId(existing?.id ?? null);
  };

  const send = () =>
    start(async () => {
      const res = await sendOrderAction({
        tabId,
        tableId,
        memberId: member?.id ?? null,
        guestName: guestName.trim() || null,
        lines: cart.map((l) => ({ productId: l.productId, qty: l.qty, notes: l.notes })),
      });
      if (!res.success) return void toast.error(res.error);
      toast.success(res.message);
      setCart([]);
      setTabId(res.data.tabId);
      router.refresh();
    });

  const zones = [...new Set(tables.map((t) => t.zone))];

  return (
    <div className="flex flex-col gap-4">
      {!shiftOpen && (
        <div className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm" style={{ background: "color-mix(in oklab, var(--color-warning) 14%, var(--color-surface))", border: "1px solid var(--color-warning)" }}>
          <span>No shift is open. Sales still post to the ledger, but the Z-report will not include them.</span>
          <Button size="sm" variant="outline" render={<Link href="/bar/shift" />}>
            Open shift
          </Button>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[260px_1fr_360px]">
        {/* Floor */}
        <aside className="flex flex-col gap-3 rounded-2xl p-3" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
            Floor · {openTabs.length} open
          </h2>
          {zones.map((z) => (
            <div key={z} className="flex flex-col gap-1.5">
              <p className="px-1 text-[11px] font-medium" style={{ color: "var(--color-text-muted)" }}>
                {z}
              </p>
              <div className="grid grid-cols-3 gap-1.5 xl:grid-cols-2">
                {tables
                  .filter((t) => t.zone === z)
                  .map((t) => {
                    const tab = tableTab(t.id);
                    const sel = tableId === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => pickTable(t)}
                        className={cn("flex flex-col items-start gap-0.5 rounded-xl px-2.5 py-2 text-left text-sm transition-colors", sel && "text-white")}
                        style={sel ? { background: "var(--color-primary-900)" } : tab ? { background: "color-mix(in oklab, var(--color-accent-500) 14%, var(--color-surface))", border: "1px solid var(--color-accent-500)" } : { background: "var(--color-bg)", border: "1px solid var(--color-border)" }}
                        aria-pressed={sel}
                      >
                        <span className="font-semibold">{t.name}</span>
                        <span className="text-[11px] tabular-nums opacity-80">{tab ? formatPaise(tab.total) : `${t.seats} seats`}</span>
                        {tab && tab.pendingKitchen > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] opacity-80">
                            <ChefHat className="h-3 w-3" /> {tab.pendingKitchen}
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
          <button type="button" onClick={() => { setTableId(null); setTabId(null); }} className="rounded-xl px-2.5 py-2 text-left text-sm" style={{ background: !tableId && !tabId ? "var(--color-primary-900)" : "var(--color-bg)", color: !tableId && !tabId ? "#fff" : undefined, border: "1px solid var(--color-border)" }}>
            Counter / takeaway
          </button>
          {openTabs.filter((t) => !t.tableId).length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="px-1 text-[11px] font-medium" style={{ color: "var(--color-text-muted)" }}>
                Counter tabs
              </p>
              {openTabs
                .filter((t) => !t.tableId)
                .map((t) => (
                  <button key={t.id} type="button" onClick={() => { setTabId(t.id); setTableId(null); }} className="flex items-center justify-between rounded-xl px-2.5 py-1.5 text-sm" style={{ background: tabId === t.id ? "var(--color-primary-900)" : "var(--color-bg)", color: tabId === t.id ? "#fff" : undefined, border: "1px solid var(--color-border)" }}>
                    <span className="truncate">{t.label}</span>
                    <span className="tabular-nums text-xs opacity-80">{formatPaise(t.total)}</span>
                  </button>
                ))}
            </div>
          )}
        </aside>

        {/* Menu */}
        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1" role="tablist">
              {CATS.map((c) => (
                <button key={c.key} role="tab" aria-selected={cat === c.key} onClick={() => setCat(c.key)} className={cn("rounded-full px-3 py-1.5 text-sm font-medium", cat === c.key && "text-white")} style={cat === c.key ? { background: "var(--color-primary-900)" } : { background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                  {c.label}
                </button>
              ))}
            </div>
            <div className="relative ml-auto w-full sm:w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--color-text-muted)" }} />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search menu" className="pl-9" aria-label="Search menu" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => add(m)}
                disabled={!m.isAvailable}
                className="flex min-h-24 flex-col justify-between rounded-2xl p-3 text-left transition-transform active:scale-[0.98] disabled:opacity-50"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
              >
                <span className="flex w-full items-start justify-between gap-1">
                  <span className="text-sm font-semibold leading-tight text-pretty">{m.name}</span>
                  {m.category === "FOOD" && <ChefHat className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--color-text-muted)" }} aria-label="Kitchen item" />}
                </span>
                <span className="flex w-full items-end justify-between">
                  <span className="tabular-nums text-sm">{formatPaise(m.price)}</span>
                  {!m.isAvailable ? <Pill tone="danger">86&apos;d</Pill> : m.trackStock && m.stockQty <= m.lowStockAt ? <Pill tone="warning">{m.stockQty} left</Pill> : null}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Order */}
        <aside className="flex flex-col gap-3 rounded-2xl p-4 xl:sticky xl:top-4 xl:self-start" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
              {activeTab ? `${activeTab.tabNo}` : "New order"}
            </h2>
            <span className="text-sm font-medium">{tableId ? tables.find((t) => t.id === tableId)?.name : "Counter"}</span>
          </div>

          {activeTab ? (
            <div className="flex items-center justify-between rounded-xl px-3 py-2 text-sm" style={{ background: "var(--color-bg)" }}>
              <span className="truncate">
                {activeTab.label} · running {formatPaise(activeTab.total)}
              </span>
              <Button size="sm" variant="outline" render={<Link href={`/bar/tabs/${activeTab.id}`} />}>
                <Receipt className="h-3.5 w-3.5" /> Tab
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {member ? (
                <div className="flex items-center justify-between rounded-xl px-3 py-2 text-sm" style={{ background: "color-mix(in oklab, var(--color-accent-500) 12%, transparent)" }}>
                  <span className="flex items-center gap-2">
                    <UserRound className="h-4 w-4" /> {member.firstName} {member.lastName} <span style={{ color: "var(--color-text-muted)" }}>{member.plan ?? ""}</span>
                  </span>
                  <button type="button" onClick={() => setMember(null)} aria-label="Remove member">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <MemberPicker onPick={setMember} />
              )}
              {!member && <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Guest name (optional)" aria-label="Guest name" />}
            </div>
          )}

          {cart.length === 0 ? (
            <p className="py-6 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
              Tap items to add them.
            </p>
          ) : (
            <ul className="flex flex-col divide-y" style={{ borderColor: "var(--color-border)" }}>
              {cart.map((l) => (
                <li key={l.productId} className="flex items-center gap-2 py-2 text-sm">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">{l.name}</span>
                    <span className="text-xs tabular-nums" style={{ color: "var(--color-text-muted)" }}>
                      {formatPaise(l.unitPrice)} each
                    </span>
                  </span>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => bump(l.productId, -1)} aria-label={`Remove one ${l.name}`}>
                      {l.qty === 1 ? <Trash2 className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                    </Button>
                    <span className="w-6 text-center tabular-nums">{l.qty}</span>
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => bump(l.productId, 1)} aria-label={`Add one ${l.name}`}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <span className="w-16 text-right tabular-nums">{formatPaise(l.unitPrice * l.qty)}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center justify-between border-t pt-3" style={{ borderColor: "var(--color-border)" }}>
            <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              This round
            </span>
            <span className="text-xl font-bold tabular-nums">{formatPaise(cartTotal)}</span>
          </div>
          <Button size="lg" onClick={send} disabled={pending || cart.length === 0}>
            <Send className="h-4 w-4" /> {pending ? "Sending…" : cart.some((l) => l.category === "FOOD") ? "Send to kitchen" : "Add to tab"}
          </Button>
        </aside>
      </div>
    </div>
  );
}
