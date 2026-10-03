import { ChefHat, CheckCircle2, Clock, Utensils } from "lucide-react";
import type { MemberOpenTab, MemberSettledTab } from "@/lib/bar/queries";
import { formatPaise } from "@/lib/money";
import { formatTime, formatDate } from "@/lib/time";

const KITCHEN_LABEL: Record<string, { label: string; icon: typeof Clock }> = {
  NEW: { label: "Sent", icon: Clock },
  PREPARING: { label: "Preparing", icon: ChefHat },
  READY: { label: "Ready", icon: Utensils },
  SERVED: { label: "Served", icon: CheckCircle2 },
};

export function OpenTabCard({ tab, tz }: { tab: MemberOpenTab; tz: string }) {
  const where = tab.table?.name ? `Table ${tab.table.name}` : tab.source === "QR" ? "Ordered by QR" : "At the bar";
  return (
    <section
      aria-labelledby="open-tab"
      className="flex flex-col gap-4 rounded-2xl p-5"
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-primary)", boxShadow: "0 0 0 4px color-mix(in oklab, var(--color-primary) 12%, transparent)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-primary)" }}>
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full opacity-75" style={{ background: "var(--color-primary)" }} />
              <span className="relative inline-flex size-2 rounded-full" style={{ background: "var(--color-primary)" }} />
            </span>
            Open now
          </span>
          <h2 id="open-tab" className="text-lg font-bold tracking-tight">
            Tab {tab.tabNo}
          </h2>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            {where} · opened {formatTime(tab.openedAt, tz)}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Running total
          </div>
          <div className="text-2xl font-bold tabular-nums tracking-tight">{formatPaise(tab.total)}</div>
        </div>
      </div>

      <ul className="flex flex-col divide-y" style={{ borderColor: "var(--color-border)" }}>
        {tab.items.map((it) => {
          const k = KITCHEN_LABEL[it.kitchenStatus] ?? KITCHEN_LABEL.NEW;
          const Icon = k.icon;
          const done = it.kitchenStatus === "SERVED";
          return (
            <li key={it.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-medium">
                  {it.qty} × {it.name}
                </span>
                {it.modifiers.length > 0 && (
                  <span className="truncate text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {it.modifiers.join(", ")}
                  </span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {it.needsKitchen && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      background: done ? "color-mix(in oklab, var(--color-success) 15%, transparent)" : "var(--color-surface-2)",
                      color: done ? "var(--color-success)" : "var(--color-text-muted)",
                    }}
                  >
                    <Icon className="h-3 w-3" />
                    {k.label}
                  </span>
                )}
                <span className="tabular-nums">{formatPaise(it.unitPrice * it.qty)}</span>
              </div>
            </li>
          );
        })}
      </ul>

      <dl className="grid grid-cols-3 gap-2 text-sm">
        <Row label="Subtotal" value={formatPaise(tab.subtotal)} />
        <Row label={tab.discountPct ? `Member discount ${tab.discountPct}%` : "Discount"} value={tab.discount ? `− ${formatPaise(tab.discount)}` : "—"} />
        <Row label="GST" value={formatPaise(tab.tax)} />
      </dl>
      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
        Settle at the bar when you&apos;re done — cash, card, UPI or club credit.
      </p>
    </section>
  );
}

export function SettledTabRow({ tab, tz }: { tab: MemberSettledTab; tz: string }) {
  const summary = tab.items.map((i) => (i.qty > 1 ? `${i.qty}× ${i.name}` : i.name)).join(", ");
  const modes = Array.from(new Set(tab.payments.map((p) => p.mode))).join(" + ");
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl p-3" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold">{tab.settledAt ? formatDate(tab.settledAt, tz) : "—"}</span>
          <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            {tab.tabNo}
            {tab.table?.name ? ` · Table ${tab.table.name}` : ""}
          </span>
        </div>
        <p className="truncate text-xs" style={{ color: "var(--color-text-muted)" }}>
          {summary || "No items"}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end">
        <span className="font-semibold tabular-nums">{formatPaise(tab.total)}</span>
        <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          {modes || "Paid"}
        </span>
      </div>
    </li>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col rounded-lg p-2" style={{ background: "var(--color-surface-2)" }}>
      <dt className="text-xs" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}
