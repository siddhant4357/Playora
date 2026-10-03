"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { bumpTicketAction } from "@/lib/actions/bar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/Primitives";

type Ticket = { tabId: string; label: string; tabNo: string; firstAt: string; items: { id: string; name: string; qty: number; notes: string | null; status: string }[] };

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

  useEffect(() => {
    const t = setInterval(() => router.refresh(), 10_000);
    return () => clearInterval(t);
  }, [router]);

  const bump = (tabId: string, to: "PREPARING" | "READY" | "SERVED") =>
    start(async () => {
      const res = await bumpTicketAction({ tabId, to });
      res.success ? router.refresh() : toast.error(res.error);
    });

  if (tickets.length === 0) return <EmptyState title="All caught up" hint="New food orders appear here the moment they are sent from the POS or a table QR." />;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {tickets.map((t) => {
        const mins = Math.floor((now - new Date(t.firstAt).getTime()) / 60_000);
        const stage = t.items.every((i) => i.status === "READY") ? "READY" : t.items.some((i) => i.status !== "NEW") ? "PREPARING" : "NEW";
        const urgency = mins >= 15 ? "var(--color-danger)" : mins >= 8 ? "var(--color-warning)" : "var(--color-success)";
        return (
          <article key={t.tabId} className="flex flex-col gap-3 rounded-2xl p-4" style={{ background: "var(--color-surface)", border: `2px solid ${stage === "READY" ? "var(--color-success)" : urgency}` }} aria-label={`Ticket for ${t.label}`}>
            <header className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="text-xl font-bold">{t.label}</span>
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {t.tabNo}
                </span>
              </div>
              <span className="rounded-full px-2 py-0.5 text-sm font-bold tabular-nums" style={{ background: urgency, color: "#fff" }}>
                {mins}m
              </span>
            </header>
            <ul className="flex flex-col gap-1.5">
              {t.items.map((i) => (
                <li key={i.id} className="flex flex-col text-base" style={{ textDecoration: i.status === "READY" ? "line-through" : undefined, opacity: i.status === "READY" ? 0.6 : 1 }}>
                  <span>
                    <span className="font-bold tabular-nums">{i.qty}×</span> {i.name}
                  </span>
                  {i.notes && <span className="text-sm italic" style={{ color: "var(--color-warning)" }}>{i.notes}</span>}
                </li>
              ))}
            </ul>
            <div className="mt-auto grid grid-cols-2 gap-2">
              {stage === "NEW" && (
                <Button variant="outline" onClick={() => bump(t.tabId, "PREPARING")} disabled={pending}>
                  Start
                </Button>
              )}
              {stage !== "READY" ? (
                <Button className={stage === "NEW" ? "" : "col-span-2"} onClick={() => bump(t.tabId, "READY")} disabled={pending}>
                  Ready
                </Button>
              ) : (
                <Button className="col-span-2" variant="secondary" onClick={() => bump(t.tabId, "SERVED")} disabled={pending}>
                  Served — clear
                </Button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
