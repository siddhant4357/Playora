import { Check } from "lucide-react";
import { cn } from "cn";
import { formatPaise } from "@/lib/money";
import { Pill } from "@/components/shared/Primitives";
import { FULFILMENT_LABEL, ORDER_STATUS_LABEL } from "@/components/shop/labels";

type Item = { id: string; name: string; qty: number; total: number };
type Order = { id: string; orderNo: string; status: string; channel: string; fulfilment: string; deliveryAddress: string | null; total: number; discountPct: number; items: Item[]; createdAt: string; updatedAt: string };

function steps(fulfilment: string) {
  return fulfilment === "DELIVERY" ? [{ key: "PAID", label: "Paid" }, { key: "PREPARING", label: "Packing" }, { key: "OUT_FOR_DELIVERY", label: "On its way" }, { key: "COMPLETED", label: "Delivered" }] : [{ key: "PAID", label: "Paid" }, { key: "PREPARING", label: "Picking" }, { key: "READY_FOR_PICKUP", label: "Ready to collect" }, { key: "COMPLETED", label: "Collected" }];
}

export function OrderTracker({ order, compact = false }: { order: Order; compact?: boolean }) {
  const s = steps(order.fulfilment);
  const idx = s.findIndex((x) => x.key === order.status);
  const cancelled = order.status === "CANCELLED";
  const when = new Date(order.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

  return (
    <article className="flex flex-col gap-3 rounded-2xl p-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
      <header className="flex items-start justify-between gap-2">
        <div className="flex flex-col">
          <span className="font-semibold">{order.orderNo}</span>
          <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            {order.channel === "COUNTER" ? "Counter" : FULFILMENT_LABEL[order.fulfilment]} · {when}
          </span>
        </div>
        <Pill tone={cancelled ? "danger" : order.status === "COMPLETED" ? "success" : "accent"}>{ORDER_STATUS_LABEL[order.status]}</Pill>
      </header>

      {!compact && !cancelled && order.channel === "ONLINE" && (
        <ol className="flex items-center gap-1" aria-label="Order progress">
          {s.map((st, i) => {
            const done = i <= idx;
            const current = i === idx;
            return (
              <li key={st.key} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full items-center">
                  <span className={cn("h-0.5 flex-1", i === 0 && "invisible")} style={{ background: done ? "var(--color-success)" : "var(--color-border)" }} />
                  <span className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold" style={done ? { background: "var(--color-success)", color: "#fff" } : { background: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }} aria-current={current ? "step" : undefined}>
                    {done && i < idx ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span className={cn("h-0.5 flex-1", i === s.length - 1 && "invisible")} style={{ background: i < idx ? "var(--color-success)" : "var(--color-border)" }} />
                </div>
                <span className={cn("text-center text-[11px] leading-tight", current && "font-semibold")} style={{ color: done ? "var(--color-text)" : "var(--color-text-muted)" }}>
                  {st.label}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {order.status === "READY_FOR_PICKUP" && (
        <p className="rounded-xl px-3 py-2 text-sm font-medium" style={{ background: "color-mix(in oklab, var(--color-success) 14%, transparent)" }}>
          Ready at the pro shop counter — show your member QR to collect.
        </p>
      )}
      {order.deliveryAddress && !compact && (
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          Delivering to {order.deliveryAddress}
        </p>
      )}

      <ul className={cn("flex flex-col gap-0.5 text-sm", compact && "text-xs")}>
        {order.items.map((i) => (
          <li key={i.id} className="flex justify-between gap-2">
            <span className="truncate">
              <span className="font-semibold tabular-nums">{i.qty}×</span> {i.name}
            </span>
            <span className="tabular-nums" style={{ color: "var(--color-text-muted)" }}>
              {formatPaise(i.total)}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between border-t pt-2 text-sm" style={{ borderColor: "var(--color-border)" }}>
        <span style={{ color: "var(--color-text-muted)" }}>{order.discountPct > 0 ? `Member price −${order.discountPct}%` : "Total"}</span>
        <span className="font-bold tabular-nums">{formatPaise(order.total)}</span>
      </div>
    </article>
  );
}
