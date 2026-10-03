"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Minus, Plus } from "lucide-react";
import { getGuestTabAction, guestOrderAction } from "@/lib/actions/bar";
import { formatPaise } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pill, statusTone } from "@/components/shared/Primitives";

type Item = { id: string; name: string; description: string | null; category: string; price: number };
type Tab = NonNullable<Awaited<ReturnType<typeof getGuestTabAction>>>;

export function GuestMenu({ token, menu }: { token: string; menu: Item[] }) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  const [tabId, setTabId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    const saved = sessionStorage.getItem(`playora-tab-${token}`);
    if (saved) setTabId(saved);
    const savedName = sessionStorage.getItem("playora-guest-name");
    if (savedName) setName(savedName);
  }, [token]);

  useEffect(() => {
    if (!tabId) return;
    let alive = true;
    const load = async () => {
      const t = await getGuestTabAction({ token, tabId });
      if (alive) setTab(t);
    };
    load();
    const i = setInterval(load, 8000);
    return () => { alive = false; clearInterval(i); };
  }, [tabId, token]);

  const lines = Object.entries(cart).filter(([, q]) => q > 0);
  const total = lines.reduce((s, [id, q]) => s + (menu.find((m) => m.id === id)?.price ?? 0) * q, 0);
  const bump = (id: string, d: number) => setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) + d) }));

  const order = () =>
    start(async () => {
      const res = await guestOrderAction({ token, guestName: name, lines: lines.map(([productId, qty]) => ({ productId, qty })) });
      if (!res.success) return void toast.error(res.error);
      toast.success(res.message);
      sessionStorage.setItem(`playora-tab-${token}`, res.data.tabId);
      sessionStorage.setItem("playora-guest-name", name);
      setTabId(res.data.tabId);
      setCart({});
    });

  const groups = [
    { key: "FOOD", label: "Food" },
    { key: "BEVERAGE", label: "Drinks" },
  ];

  return (
    <div className="flex flex-col gap-5 pb-28">
      {tab && tab.status === "OPEN" && (
        <section className="flex flex-col gap-2 rounded-2xl p-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }} aria-live="polite">
          <div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>Your tab · {tab.tabNo}</span><span className="font-bold tabular-nums">{formatPaise(tab.total)}</span></div>
          <ul className="flex flex-col gap-1 text-sm">
            {tab.items.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-2">
                <span>{i.qty}× {i.name}</span>
                {i.needsKitchen ? <Pill tone={statusTone(i.kitchenStatus)}>{i.kitchenStatus === "NEW" ? "Received" : i.kitchenStatus}</Pill> : <Pill tone="success">Coming</Pill>}
              </li>
            ))}
          </ul>
        </section>
      )}
      {tab && tab.status !== "OPEN" && <p className="rounded-2xl p-4 text-sm" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>Thanks! Your tab {tab.tabNo} is closed. Order again any time.</p>}

      {groups.map((g) => (
        <section key={g.key} className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">{g.label}</h2>
          <ul className="flex flex-col gap-2">
            {menu.filter((m) => m.category === g.key).map((m) => {
              const q = cart[m.id] ?? 0;
              return (
                <li key={m.id} className="flex items-center gap-3 rounded-2xl p-3" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-semibold">{m.name}</span>
                    {m.description && <span className="text-xs text-pretty" style={{ color: "var(--color-text-muted)" }}>{m.description}</span>}
                    <span className="text-sm font-bold tabular-nums">{formatPaise(m.price)}</span>
                  </span>
                  {q === 0 ? (
                    <Button size="sm" variant="outline" onClick={() => bump(m.id, 1)} aria-label={`Add ${m.name}`}>Add</Button>
                  ) : (
                    <span className="flex items-center gap-1">
                      <button type="button" onClick={() => bump(m.id, -1)} className="rounded-md p-1.5" style={{ background: "var(--color-bg)" }} aria-label={`Remove one ${m.name}`}><Minus className="h-4 w-4" /></button>
                      <span className="w-5 text-center font-semibold tabular-nums">{q}</span>
                      <button type="button" onClick={() => bump(m.id, 1)} className="rounded-md p-1.5" style={{ background: "var(--color-bg)" }} aria-label={`Add one ${m.name}`}><Plus className="h-4 w-4" /></button>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {lines.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 mx-auto flex w-full max-w-md flex-col gap-2 p-4" style={{ background: "var(--color-surface)", borderTop: "1px solid var(--color-border)" }}>
          {!tabId && <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name (so we find you)" aria-label="Your name" required />}
          <Button size="lg" onClick={order} disabled={pending || (!tabId && !name.trim())}>
            {pending ? "Sending…" : `Order ${lines.reduce((s, [, q]) => s + q, 0)} items · ${formatPaise(total)}`}
          </Button>
        </div>
      )}
    </div>
  );
}
