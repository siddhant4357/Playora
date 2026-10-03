"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "cn";
import { BadgePercent, Minus, Plus, Printer, Trash2, UserRound } from "lucide-react";
import type { CatalogueItem } from "@/lib/shop/queries";
import { counterSaleAction } from "@/lib/actions/shop";
import { totalLines } from "@/lib/kernel";
import { formatPaise } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MemberPicker } from "@/components/bar/MemberPicker";
import { PaymentSplit, balanceOf, type PaymentLine } from "@/components/shop/PaymentSplit";
import { CATEGORY_LABEL } from "@/components/shop/labels";

type Line = { product: CatalogueItem; qty: number };
type Member = { id: string; name: string; discountPct: number; plan: string | null };
type Receipt = { orderNo: string; total: number; lines: Line[]; member: Member | null; payments: PaymentLine[]; discount: number };

const CATS = ["ALL", "RACKET", "BALL", "SHOES", "ACCESSORY", "APPAREL"] as const;

export function ShopPos({ catalogue, role }: { catalogue: CatalogueItem[]; role: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [cat, setCat] = useState<(typeof CATS)[number]>("ALL");
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<Line[]>([]);
  const [member, setMember] = useState<Member | null>(null);
  const [guestName, setGuestName] = useState("");
  const [payments, setPayments] = useState<PaymentLine[]>([{ mode: "UPI", amount: 0 }]);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return catalogue.filter((p) => (cat === "ALL" || p.category === cat) && (!needle || p.name.toLowerCase().includes(needle) || p.sku.toLowerCase().includes(needle)));
  }, [catalogue, cat, q]);

  const totals = totalLines(cart.map((l) => ({ unitPrice: l.product.price, qty: l.qty, taxRatePct: l.product.taxRatePct })), member?.discountPct ?? 0);
  const { balanced } = balanceOf(payments, totals.total);

  const syncPayments = (total: number) => setPayments((p) => (p.length === 1 ? [{ ...p[0], amount: total }] : p));

  const add = (p: CatalogueItem) => {
    if (p.trackStock && p.stockQty <= 0) return toast.error(`${p.name} is out of stock.`);
    setCart((c) => {
      const i = c.findIndex((l) => l.product.id === p.id);
      if (i >= 0) {
        if (p.trackStock && c[i].qty + 1 > p.stockQty) {
          toast.error(`Only ${p.stockQty} × ${p.name} in stock.`);
          return c;
        }
        return c.map((l, j) => (j === i ? { ...l, qty: l.qty + 1 } : l));
      }
      return [...c, { product: p, qty: 1 }];
    });
  };
  const bump = (id: string, d: number) => setCart((c) => c.map((l) => (l.product.id === id ? { ...l, qty: l.qty + d } : l)).filter((l) => l.qty > 0));

  // Keep a single payment line pinned to the running total.
  const cartKey = cart.map((l) => `${l.product.id}:${l.qty}`).join("|") + (member?.id ?? "");
  const [lastKey, setLastKey] = useState(cartKey);
  if (lastKey !== cartKey) {
    setLastKey(cartKey);
    syncPayments(totals.total);
  }

  // Enter on the search box with exactly one hit adds it (barcode-scanner friendly).
  const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || e.nativeEvent.isComposing || e.keyCode === 229) return;
    const exact = catalogue.find((p) => p.sku.toLowerCase() === q.trim().toLowerCase());
    const hit = exact ?? (visible.length === 1 ? visible[0] : null);
    if (hit) {
      add(hit);
      setQ("");
    }
  };

  const charge = () =>
    start(async () => {
      const res = await counterSaleAction({ memberId: member?.id ?? null, guestName: guestName || undefined, lines: cart.map((l) => ({ productId: l.product.id, qty: l.qty })), payments });
      if (!res.success) return void toast.error(res.error);
      toast.success(res.message);
      setReceipt({ orderNo: res.data.orderNo, total: res.data.total, lines: cart, member, payments, discount: totals.discount });
      setCart([]);
      setMember(null);
      setGuestName("");
      setPayments([{ mode: "UPI", amount: 0 }]);
      router.refresh();
    });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <section aria-label="Products" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {CATS.map((c) => (
            <button key={c} type="button" onClick={() => setCat(c)} className={cn("rounded-full px-4 py-1.5 text-sm font-medium", cat === c && "text-white")} style={cat === c ? { background: "var(--color-accent-600)" } : { background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              {c === "ALL" ? "All" : CATEGORY_LABEL[c]}
            </button>
          ))}
          <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onSearchKey} placeholder="Search or scan SKU" aria-label="Search products" className="ml-auto w-52" autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
          {visible.map((p) => {
            const out = p.trackStock && p.stockQty <= 0;
            const low = p.trackStock && !out && p.stockQty <= p.lowStockAt;
            return (
              <button key={p.id} type="button" onClick={() => add(p)} disabled={out} className="flex min-h-28 flex-col justify-between rounded-2xl p-3 text-left transition-transform active:scale-[0.98] disabled:opacity-40" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                <span className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                    {p.sku}
                  </span>
                  <span className="text-sm font-semibold leading-tight text-pretty">{p.name}</span>
                </span>
                <span className="flex items-center justify-between text-xs">
                  <span className="font-bold tabular-nums">{formatPaise(p.price)}</span>
                  {out ? <span style={{ color: "var(--color-danger)" }}>Out</span> : low ? <span style={{ color: "var(--color-warning)" }}>{p.stockQty} left</span> : p.trackStock ? <span style={{ color: "var(--color-text-muted)" }}>{p.stockQty} in stock</span> : null}
                </span>
              </button>
            );
          })}
          {visible.length === 0 && (
            <p className="col-span-full py-10 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
              Nothing matches.
            </p>
          )}
        </div>
      </section>

      <aside className="flex flex-col gap-3 rounded-2xl p-4 lg:sticky lg:top-4 lg:self-start" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }} aria-label="Sale">
        <h2 className="font-semibold">Counter sale</h2>

        {member ? (
          <div className="flex items-center justify-between rounded-xl px-3 py-2 text-sm" style={{ background: "color-mix(in oklab, var(--color-accent-500) 12%, transparent)" }}>
            <span className="flex items-center gap-2">
              <UserRound className="h-4 w-4" /> {member.name}
              {member.discountPct > 0 && (
                <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: "var(--color-success)", color: "#fff" }}>
                  <BadgePercent className="h-3 w-3" /> {member.plan} −{member.discountPct}%
                </span>
              )}
            </span>
            <button type="button" className="text-xs underline" onClick={() => setMember(null)}>
              Remove
            </button>
          </div>
        ) : (
          <>
            <MemberPicker onPick={(m) => setMember({ id: m.id, name: m.name, discountPct: m.shopDiscountPct ?? 0, plan: m.plan ?? null })} />
            <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Guest name (optional)" aria-label="Guest name" />
          </>
        )}

        {cart.length === 0 ? (
          <p className="py-8 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
            Tap products or scan a SKU.
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
                  <button type="button" onClick={() => add(l.product)} className="rounded-md p-1" style={{ background: "var(--color-bg)" }} aria-label={`Add one ${l.product.name}`}>
                    <Plus className="h-4 w-4" />
                  </button>
                </span>
                <span className="w-20 text-right font-semibold tabular-nums">{formatPaise(l.product.price * l.qty)}</span>
              </li>
            ))}
          </ul>
        )}

        <dl className="flex flex-col gap-1 border-t pt-3 text-sm" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex justify-between">
            <dt style={{ color: "var(--color-text-muted)" }}>Subtotal</dt>
            <dd className="tabular-nums">{formatPaise(totals.subtotal, { free: "₹0" })}</dd>
          </div>
          {totals.discount > 0 && (
            <div className="flex justify-between" style={{ color: "var(--color-success)" }}>
              <dt>Member discount</dt>
              <dd className="tabular-nums">−{formatPaise(totals.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between text-xs" style={{ color: "var(--color-text-muted)" }}>
            <dt>Incl. GST</dt>
            <dd className="tabular-nums">{formatPaise(totals.tax, { free: "₹0" })}</dd>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <dt className="font-semibold">Total</dt>
            <dd className="text-2xl font-bold tabular-nums">{formatPaise(totals.total, { free: "₹0" })}</dd>
          </div>
        </dl>

        {cart.length > 0 && <PaymentSplit total={totals.total} payments={payments} onChange={setPayments} allowComp={role !== "FRONT_DESK"} />}

        <Button size="lg" onClick={charge} disabled={pending || cart.length === 0 || !balanced}>
          {pending ? "Charging…" : `Charge ${formatPaise(totals.total, { free: "₹0" })}`}
        </Button>

        {receipt && (
          <div className="flex flex-col gap-2 rounded-xl p-3 text-sm" style={{ background: "var(--color-bg)", border: "1px dashed var(--color-border)" }} role="status">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{receipt.orderNo}</span>
              <span className="font-bold tabular-nums">{formatPaise(receipt.total)}</span>
            </div>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {receipt.lines.reduce((s, l) => s + l.qty, 0)} items · {receipt.payments.map((p) => `${p.mode} ${formatPaise(p.amount)}`).join(" + ")}
              {receipt.member && ` · ${receipt.member.name}`}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Print
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setReceipt(null)}>
                Dismiss
              </Button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
