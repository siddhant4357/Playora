"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "cn";
import { Bike, CircleDot, Footprints, Minus, Plus, Shirt, ShoppingBag, Store, Tag, Trash2, X, type LucideIcon } from "lucide-react";
import type { CatalogueItem } from "@/lib/shop/queries";
import { placeMemberOrderAction } from "@/lib/actions/shop";
import { totalLines } from "@/lib/kernel";
import { formatPaise } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CATEGORY_LABEL } from "@/components/shop/labels";

type Line = { product: CatalogueItem; qty: number };
const CATS = ["ALL", "RACKET", "BALL", "SHOES", "ACCESSORY", "APPAREL"] as const;
const GLYPH: Record<string, LucideIcon> = { RACKET: Tag, BALL: CircleDot, SHOES: Footprints, ACCESSORY: ShoppingBag, APPAREL: Shirt };

export function MemberShop({ catalogue, discountPct, planName, canOrder }: { catalogue: CatalogueItem[]; discountPct: number; planName: string | null; canOrder: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [cat, setCat] = useState<(typeof CATS)[number]>("ALL");
  const [cart, setCart] = useState<Line[]>([]);
  const [open, setOpen] = useState(false);
  const [fulfilment, setFulfilment] = useState<"CLICK_COLLECT" | "DELIVERY">("CLICK_COLLECT");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [placed, setPlaced] = useState<string | null>(null);

  const visible = useMemo(() => catalogue.filter((p) => cat === "ALL" || p.category === cat), [catalogue, cat]);
  const totals = totalLines(cart.map((l) => ({ unitPrice: l.product.price, qty: l.qty, taxRatePct: l.product.taxRatePct })), discountPct);
  const count = cart.reduce((s, l) => s + l.qty, 0);
  const memberPrice = (p: number) => Math.round(p * (1 - discountPct / 100));

  const add = (p: CatalogueItem) =>
    setCart((c) => {
      const i = c.findIndex((l) => l.product.id === p.id);
      const have = i >= 0 ? c[i].qty : 0;
      if (p.trackStock && have + 1 > p.stockQty) {
        toast.error(have === 0 ? `${p.name} is out of stock.` : `Only ${p.stockQty} left.`);
        return c;
      }
      return i >= 0 ? c.map((l, j) => (j === i ? { ...l, qty: l.qty + 1 } : l)) : [...c, { product: p, qty: 1 }];
    });
  const bump = (id: string, d: number) => setCart((c) => c.map((l) => (l.product.id === id ? { ...l, qty: l.qty + d } : l)).filter((l) => l.qty > 0));

  const place = () =>
    start(async () => {
      const res = await placeMemberOrderAction({ fulfilment, deliveryAddress: fulfilment === "DELIVERY" ? address : undefined, notes: notes || undefined, lines: cart.map((l) => ({ productId: l.product.id, qty: l.qty })) });
      if (!res.success) return void toast.error(res.error);
      toast.success(res.message);
      setOpen(false);
      setPlaced(res.data.orderNo);
      setCart([]);
      setAddress("");
      setNotes("");
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Category">
        {CATS.map((c) => (
          <button key={c} type="button" role="tab" aria-selected={cat === c} onClick={() => setCat(c)} className={cn("shrink-0 rounded-full px-4 py-1.5 text-sm font-medium", cat === c && "text-white")} style={cat === c ? { background: "var(--color-accent-600)" } : { background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            {c === "ALL" ? "All" : CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {visible.map((p) => {
          const Glyph = GLYPH[p.category] ?? ShoppingBag;
          const out = p.trackStock && p.stockQty <= 0;
          const low = p.trackStock && !out && p.stockQty <= p.lowStockAt;
          const inCart = cart.find((l) => l.product.id === p.id)?.qty ?? 0;
          return (
            <li key={p.id} className="flex flex-col overflow-hidden rounded-2xl" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              <div className="flex aspect-[4/3] items-center justify-center" style={{ background: "color-mix(in oklab, var(--color-primary-500) 8%, var(--color-bg))" }} aria-hidden="true">
                <Glyph className="h-10 w-10 opacity-55" style={{ color: "var(--color-primary-900)" }} />
              </div>
              <div className="flex flex-1 flex-col gap-2 p-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                    {CATEGORY_LABEL[p.category]}
                  </span>
                  <span className="text-sm font-semibold leading-tight text-pretty">{p.name}</span>
                  {p.description && (
                    <span className="line-clamp-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
                      {p.description}
                    </span>
                  )}
                </div>
                <div className="mt-auto flex items-end justify-between gap-2">
                  <span className="flex flex-col">
                    <span className="font-bold tabular-nums">{formatPaise(memberPrice(p.price))}</span>
                    {discountPct > 0 && (
                      <span className="text-[11px] tabular-nums line-through" style={{ color: "var(--color-text-muted)" }}>
                        {formatPaise(p.price)}
                      </span>
                    )}
                  </span>
                  {out ? (
                    <span className="text-xs font-medium" style={{ color: "var(--color-danger)" }}>
                      Sold out
                    </span>
                  ) : inCart > 0 ? (
                    <span className="flex items-center gap-1 rounded-full px-1" style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
                      <button type="button" onClick={() => bump(p.id, -1)} className="p-1.5" aria-label={`Remove one ${p.name}`}>
                        {inCart === 1 ? <Trash2 className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                      </button>
                      <span className="w-4 text-center text-sm font-semibold tabular-nums">{inCart}</span>
                      <button type="button" onClick={() => add(p)} className="p-1.5" aria-label={`Add one ${p.name}`}>
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ) : (
                    <Button size="sm" onClick={() => add(p)} disabled={!canOrder} aria-label={`Add ${p.name}`}>
                      <Plus className="h-4 w-4" /> Add
                    </Button>
                  )}
                </div>
                {low && (
                  <span className="text-[11px]" style={{ color: "var(--color-warning)" }}>
                    Only {p.stockQty} left
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {!canOrder && (
        <p className="rounded-2xl p-4 text-center text-sm" style={{ background: "var(--color-surface)", border: "1px dashed var(--color-border-strong)", color: "var(--color-text-muted)" }}>
          Your login isn&apos;t linked to a membership yet — ask the front desk and ordering unlocks.
        </p>
      )}

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-20 z-30 mx-auto w-full max-w-md px-4 sm:bottom-6">
          <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left shadow-lg" style={{ background: "var(--color-primary-900)", color: "#fff" }}>
            <span className="flex items-center gap-2 text-sm font-semibold">
              <ShoppingBag className="h-4 w-4" /> {count} item{count === 1 ? "" : "s"}
            </span>
            <span className="text-sm font-bold tabular-nums">
              {formatPaise(totals.total)} · Checkout
            </span>
          </button>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Checkout</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <ul className="flex flex-col divide-y text-sm" style={{ borderColor: "var(--color-border)" }}>
              {cart.map((l) => (
                <li key={l.product.id} className="flex items-center gap-2 py-2">
                  <span className="min-w-0 flex-1 truncate font-medium">{l.product.name}</span>
                  <span className="flex items-center gap-1">
                    <button type="button" onClick={() => bump(l.product.id, -1)} className="rounded-md p-1" style={{ background: "var(--color-bg)" }} aria-label={`Remove one ${l.product.name}`}>
                      {l.qty === 1 ? <Trash2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                    </button>
                    <span className="w-6 text-center tabular-nums">{l.qty}</span>
                    <button type="button" onClick={() => add(l.product)} className="rounded-md p-1" style={{ background: "var(--color-bg)" }} aria-label={`Add one ${l.product.name}`}>
                      <Plus className="h-4 w-4" />
                    </button>
                  </span>
                  <span className="w-20 text-right font-semibold tabular-nums">{formatPaise(memberPrice(l.product.price) * l.qty)}</span>
                </li>
              ))}
            </ul>

            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="How would you like it?">
              {(
                [
                  { key: "CLICK_COLLECT", label: "Click & collect", sub: "Ready at the pro shop", Icon: Store },
                  { key: "DELIVERY", label: "Home delivery", sub: "Within the city", Icon: Bike },
                ] as const
              ).map(({ key, label, sub, Icon }) => (
                <button key={key} type="button" role="radio" aria-checked={fulfilment === key} onClick={() => setFulfilment(key)} className={cn("flex flex-col items-start gap-1 rounded-xl p-3 text-left", fulfilment === key && "text-white")} style={fulfilment === key ? { background: "var(--color-primary-900)" } : { background: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-semibold">{label}</span>
                  <span className={cn("text-xs", fulfilment !== key && "opacity-70")}>{sub}</span>
                </button>
              ))}
            </div>
            {fulfilment === "DELIVERY" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="addr">Delivery address</Label>
                <Input id="addr" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Flat, street, area, pincode" autoFocus />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="onotes">Note for the shop (optional)</Label>
              <Input id="onotes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Grip size 3, please" />
            </div>

            <dl className="flex flex-col gap-1 border-t pt-3 text-sm" style={{ borderColor: "var(--color-border)" }}>
              <div className="flex justify-between">
                <dt style={{ color: "var(--color-text-muted)" }}>Subtotal</dt>
                <dd className="tabular-nums">{formatPaise(totals.subtotal)}</dd>
              </div>
              {totals.discount > 0 && (
                <div className="flex justify-between" style={{ color: "var(--color-success)" }}>
                  <dt>{planName} discount</dt>
                  <dd className="tabular-nums">−{formatPaise(totals.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between text-xs" style={{ color: "var(--color-text-muted)" }}>
                <dt>Incl. GST</dt>
                <dd className="tabular-nums">{formatPaise(totals.tax)}</dd>
              </div>
              <div className="flex items-baseline justify-between pt-1">
                <dt className="font-semibold">To pay</dt>
                <dd className="text-2xl font-bold tabular-nums">{formatPaise(totals.total)}</dd>
              </div>
            </dl>
            <Button size="lg" onClick={place} disabled={pending || cart.length === 0 || (fulfilment === "DELIVERY" && !address.trim())}>
              {pending ? "Placing order…" : `Pay ${formatPaise(totals.total)} online`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!placed} onOpenChange={(o) => !o && setPlaced(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Order placed</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <p className="text-sm">
              <strong>{placed}</strong> is with the pro shop. {fulfilment === "DELIVERY" ? "You will get a message when it is out for delivery." : "You will get a message when it is ready to collect."}
            </p>
            <div className="flex gap-2">
              <Button onClick={() => { setPlaced(null); setOpen(false); router.push("/me/orders"); }}>Track order</Button>
              <Button variant="ghost" onClick={() => { setPlaced(null); setOpen(false); }}>
                <X className="h-4 w-4" /> Keep shopping
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
