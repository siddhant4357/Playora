"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ChefHat, Flame } from "lucide-react";
import { advanceItemAction, bumpTicketAction } from "@/lib/actions/bar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/Primitives";

type Item = { id: string; name: string; qty: number; status: string; notes: string | null; modifiers: string[] };
type Ticket = { tabId: string; label: string; tabNo: string; firstAt: string; items: Item[] };

function useNow(ms = 15_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export function KitchenBoard({ tickets }: { tickets: Ticket[] }) {
  const router = useRouter();
  const now = useNow();
  const [pending, start] = useTransition();

  // Poll for new tickets — the kitchen screen is a dumb display with no interaction between orders.
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 8000);
    return () => clearInterval(t);
  }, [router]);

  const bump = (tabId: string, to: "PREPARING" | "READY" | "SERVED") =>
    start(async () => {
      const res = await bumpTicketAction({ tabId, to });
      if (!res.success) toast.error(res.error);
      router.refresh();
    });
  const advance = (itemId: string, to: "PREPARING" | "READY" | "SERVED") =>
    start(async () => {
      const res = await advanceItemAction({ itemId, to });
      if (!res.success) toast.error(res.error);
      router.refresh();
    });

  const active = tickets.filter((t) => t.items.some((i) => i.status !== "READY"));
  const ready = tickets.filter((t) => t.items.every((i) => i.status === "READY"));

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold tracking-tight">Kitchen</h1>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            {active.length} cooking · {ready.length} waiting for pickup · refreshes automatically
          </p>
        </div>
      </header>

      {tickets.length === 0 ? (
        <EmptyState title="All clear" hint="Food orders from the bar POS and table QR menus appear here the moment they are sent." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[...active, ...ready].map((t) => {
            const mins = Math.floor((now - new Date(t.firstAt).getTime()) / 60_000);
            const allReady = t.items.every((i) => i.status === "READY");
            const anyNew = t.items.some((i) => i.status === "NEW");
            const tone = allReady ? "var(--color-success)" : mins >= 15 ? "var(--color-danger)" : mins >= 8 ? "var(--color-warning)" : "var(--color-border)";
            return (
              <article key={t.tabId} className="flex flex-col gap-3 rounded-2xl p-3" style={{ background: "var(--color-surface)", border: `2px solid ${tone}` }} aria-label={`Ticket for ${t.label}`}>
                <header className="flex items-center justify-between">
                  <span className="text-lg font-bold">{t.label}</span>
                  <span className="flex items-center gap-1 text-sm tabular-nums" style={{ color: tone === "var(--color-border)" ? "var(--color-text-muted)" : tone }}>
                    <Flame className="h-4 w-4" /> {mins}m
                  </span>
                </header>
                <ul className="flex flex-col gap-1.5">
                  {t.items.map((i) => (
                    <li key={i.id} className="flex items-start gap-2">
                      <button
                        type="button"
                        onClick={() => advance(i.id, i.status === "NEW" ? "PREPARING" : "READY")}
                        disabled={pending || i.status === "READY"}
                        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border"
                        style={{ borderColor: i.status === "READY" ? "var(--color-success)" : "var(--color-border)", background: i.status === "READY" ? "var(--color-success)" : i.status === "PREPARING" ? "color-mix(in oklab, var(--color-warning) 30%, transparent)" : "transparent" }}
                        aria-label={`${i.name}: ${i.status.toLowerCase()}`}
                      >
                        {i.status === "READY" && <Check className="h-3.5 w-3.5 text-white" />}
                      </button>
                      <span className="flex min-w-0 flex-col">
                        <span className={i.status === "READY" ? "line-through opacity-60" : "font-medium"}>
                          <span className="tabular-nums">{i.qty}×</span> {i.name}
                        </span>
                        {(i.notes || i.modifiers.length > 0) && (
                          <span className="text-xs" style={{ color: "var(--color-warning)" }}>
                            {[...i.modifiers, i.notes].filter(Boolean).join(" · ")}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto flex gap-2">
                  {anyNew && (
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => bump(t.tabId, "PREPARING")} disabled={pending}>
                      <ChefHat className="h-4 w-4" /> Start
                    </Button>
                  )}
                  {!allReady ? (
                    <Button size="sm" className="flex-1" onClick={() => bump(t.tabId, "READY")} disabled={pending}>
                      Ready
                    </Button>
                  ) : (
                    <Button size="sm" className="flex-1" onClick={() => bump(t.tabId, "SERVED")} disabled={pending} style={{ background: "var(--color-success)" }}>
                      <Check className="h-4 w-4" /> Picked up
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
