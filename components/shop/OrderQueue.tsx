"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bike, MessageCircle, PackageCheck, Store } from "lucide-react";
import type { OrderStatus } from "@/generated/prisma/client";
import type { QueueOrder } from "@/lib/shop/queries";
import { advanceOrderAction } from "@/lib/actions/shop";
import { formatPaise } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, Panel, Pill } from "@/components/shared/Primitives";
import { FULFILMENT_LABEL, ORDER_STATUS_LABEL } from "@/components/shop/labels";

function tone(status: string): "neutral" | "success" | "warning" | "danger" | "accent" {
  if (status === "PAID") return "accent";
  if (status === "PREPARING") return "warning";
  if (status === "READY_FOR_PICKUP" || status === "OUT_FOR_DELIVERY" || status === "COMPLETED") return "success";
  if (status === "CANCELLED") return "danger";
  return "neutral";
}

function nextStep(o: QueueOrder): { to: OrderStatus; label: string } | null {
  if (o.status === "PAID") return { to: "PREPARING", label: "Start picking" };
  if (o.status === "PREPARING") return o.fulfilment === "DELIVERY" ? { to: "OUT_FOR_DELIVERY", label: "Out for delivery" } : { to: "READY_FOR_PICKUP", label: "Ready for pickup" };
  if (o.status === "READY_FOR_PICKUP") return { to: "COMPLETED", label: "Handed over" };
  if (o.status === "OUT_FOR_DELIVERY") return { to: "COMPLETED", label: "Delivered" };
  return null;
}

function customer(o: QueueOrder) {
  return o.member ? { name: `${o.member.firstName} ${o.member.lastName}`, phone: o.member.phone, code: o.member.memberCode } : { name: o.guestName ?? "Guest", phone: o.guestPhone ?? "", code: null };
}

function whatsapp(phone: string, text: string) {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

export function OrderQueue({ active, recent }: { active: QueueOrder[]; recent: QueueOrder[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const run = (orderId: string, to: OrderStatus, r?: string) =>
    start(async () => {
      const res = await advanceOrderAction({ orderId, to, reason: r });
      if (!res.success) return void toast.error(res.error);
      toast.success(res.message);
      setCancelling(null);
      setReason("");
      router.refresh();
    });

  const groups: { key: string; title: string; items: QueueOrder[] }[] = [
    { key: "new", title: "New", items: active.filter((o) => o.status === "PAID") },
    { key: "picking", title: "Picking", items: active.filter((o) => o.status === "PREPARING") },
    { key: "waiting", title: "Awaiting customer / courier", items: active.filter((o) => o.status === "READY_FOR_PICKUP" || o.status === "OUT_FOR_DELIVERY") },
  ];

  return (
    <div className="flex flex-col gap-4">
      {active.length === 0 ? (
        <EmptyState title="No open orders" hint="Click & collect and delivery orders from the member app appear here." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {groups.map((g) => (
            <section key={g.key} aria-label={g.title} className="flex flex-col gap-2">
              <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                {g.title} <span className="rounded-full px-1.5 text-[10px]" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>{g.items.length}</span>
              </h2>
              {g.items.length === 0 && (
                <p className="rounded-2xl p-4 text-center text-xs" style={{ border: "1px dashed var(--color-border)", color: "var(--color-text-muted)" }}>
                  Empty
                </p>
              )}
              {g.items.map((o) => {
                const c = customer(o);
                const step = nextStep(o);
                const readyMsg = o.fulfilment === "DELIVERY" ? `Hi ${c.name.split(" ")[0]}, your Champions Club order ${o.orderNo} is on its way.` : `Hi ${c.name.split(" ")[0]}, your Champions Club order ${o.orderNo} is ready to collect at the pro shop.`;
                return (
                  <article key={o.id} className="flex flex-col gap-3 rounded-2xl p-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                    <header className="flex items-start justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="font-semibold">{o.orderNo}</span>
                        <span className="text-sm">{c.name}{c.code && <span style={{ color: "var(--color-text-muted)" }}> · {c.code}</span>}</span>
                      </div>
                      <Pill tone={tone(o.status)}>{ORDER_STATUS_LABEL[o.status]}</Pill>
                    </header>
                    <p className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
                      {o.fulfilment === "DELIVERY" ? <Bike className="h-3.5 w-3.5" /> : <Store className="h-3.5 w-3.5" />}
                      {FULFILMENT_LABEL[o.fulfilment]}
                      {o.deliveryAddress && <span className="truncate"> · {o.deliveryAddress}</span>}
                    </p>
                    <ul className="flex flex-col gap-0.5 text-sm">
                      {o.items.map((i) => (
                        <li key={i.id} className="flex justify-between gap-2">
                          <span className="truncate">
                            <span className="tabular-nums font-semibold">{i.qty}×</span> {i.name}
                          </span>
                          <span className="tabular-nums" style={{ color: "var(--color-text-muted)" }}>{formatPaise(i.total)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center justify-between border-t pt-2 text-sm" style={{ borderColor: "var(--color-border)" }}>
                      <span style={{ color: "var(--color-text-muted)" }}>Paid online{o.discountPct > 0 && ` · −${o.discountPct}%`}</span>
                      <span className="font-bold tabular-nums">{formatPaise(o.total)}</span>
                    </div>
                    {cancelling === o.id ? (
                      <div className="flex flex-col gap-2">
                        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (stock returned, refund posted)" aria-label="Cancellation reason" />
                        <div className="flex gap-2">
                          <Button size="sm" variant="destructive" disabled={pending || !reason.trim()} onClick={() => run(o.id, "CANCELLED", reason)}>
                            Cancel order
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setCancelling(null)}>
                            Keep
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        {step && (
                          <Button size="sm" disabled={pending} onClick={() => run(o.id, step.to)}>
                            <PackageCheck className="h-4 w-4" /> {step.label}
                          </Button>
                        )}
                        {(o.status === "READY_FOR_PICKUP" || o.status === "OUT_FOR_DELIVERY") && c.phone && (
                          <Button size="sm" variant="outline" render={<a href={whatsapp(c.phone, readyMsg)} target="_blank" rel="noreferrer" />} nativeButton={false}>
                            <MessageCircle className="h-4 w-4" /> Notify
                          </Button>
                        )}
                        {(o.status === "PAID" || o.status === "PREPARING") && (
                          <button type="button" className="ml-auto text-xs underline" style={{ color: "var(--color-text-muted)" }} onClick={() => setCancelling(o.id)}>
                            Cancel
                          </button>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </section>
          ))}
        </div>
      )}

      <Panel title="Recent">
        {recent.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            No completed orders yet.
          </p>
        ) : (
          <ul className="flex flex-col divide-y text-sm" style={{ borderColor: "var(--color-border)" }}>
            {recent.map((o) => {
              const c = customer(o);
              return (
                <li key={o.id} className="flex items-center gap-3 py-2">
                  <span className="w-36 shrink-0 font-medium tabular-nums">{o.orderNo}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {c.name} <span style={{ color: "var(--color-text-muted)" }}>· {o.items.reduce((s, i) => s + i.qty, 0)} items · {o.channel === "COUNTER" ? "Counter" : FULFILMENT_LABEL[o.fulfilment]}</span>
                  </span>
                  <Pill tone={tone(o.status)}>{ORDER_STATUS_LABEL[o.status]}</Pill>
                  <span className="w-24 text-right font-semibold tabular-nums">{formatPaise(o.total)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
