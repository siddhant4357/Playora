"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, ShoppingBag } from "lucide-react";
import { placeGuestOrderAction } from "@/lib/actions/public";
import { formatPaise } from "@/lib/money";
import { CATEGORY_LABEL } from "@/lib/public/labels";

export interface PublicProduct {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  stockQty: number;
  imageUrl: string | null;
  taxRatePct: number;
}

interface Props {
  products: PublicProduct[];
  member: { firstName: string; discountPct: number } | null;
}

type Line = { product: PublicProduct; qty: number };

export function ShopCatalogue({ products, member }: Props) {
  const params = useSearchParams();
  const [cat, setCat] = useState<string>("ALL");
  const [lines, setLines] = useState<Line[]>([]);
  const [fulfilment, setFulfilment] = useState<"CLICK_COLLECT" | "DELIVERY">("CLICK_COLLECT");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ orderNo: string; total: number; asMember: boolean } | null>(null);

  // /shop/[sku] "Add to bag" lands here with ?add=SKU.
  useEffect(() => {
    const sku = params.get("add");
    if (!sku) return;
    const p = products.find((x) => x.sku === sku);
    if (p) add(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cats = useMemo(() => Array.from(new Set(products.map((p) => p.category))), [products]);
  const visible = cat === "ALL" ? products : products.filter((p) => p.category === cat);

  const subtotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
  const discount = member ? Math.round((subtotal * member.discountPct) / 100) : 0;
  const total = subtotal - discount;

  function add(p: PublicProduct) {
    setLines((ls) => {
      const i = ls.findIndex((l) => l.product.id === p.id);
      if (i === -1) return [...ls, { product: p, qty: 1 }];
      const next = [...ls];
      next[i] = { ...next[i], qty: Math.min(p.stockQty, next[i].qty + 1) };
      return next;
    });
  }
  function bump(id: string, d: number) {
    setLines((ls) => ls.map((l) => (l.product.id === id ? { ...l, qty: l.qty + d } : l)).filter((l) => l.qty > 0 && l.qty <= l.product.stockQty));
  }

  if (done) {
    return (
      <div className="pub-done" role="status">
        <CheckCircle2 size={28} color="#1a7f6f" />
        <h2>Order {done.orderNo} is in.</h2>
        <p className="big">{formatPaise(done.total)} · {fulfilment === "DELIVERY" ? "Delivery" : "Collect at the front desk"}</p>
        <p>The shop sees it on their queue right now. You&apos;ll get a message when it&apos;s ready{done.asMember ? ", and it&apos;s on your account under My orders" : ""}.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="btn btn-outline" onClick={() => { setDone(null); setLines([]); }}>
            Keep shopping
          </button>
          {done.asMember && (
            <Link href="/me/orders" className="btn btn-primary">
              Track my order
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="pub-split">
      <section aria-label="Catalogue">
        <div className="shop-tabs" role="tablist" aria-label="Category">
          <button type="button" className="pick-day" role="tab" aria-selected={cat === "ALL"} onClick={() => setCat("ALL")}>
            Everything
          </button>
          {cats.map((c) => (
            <button key={c} type="button" className="pick-day" role="tab" aria-selected={cat === c} onClick={() => setCat(c)}>
              {CATEGORY_LABEL[c] ?? c}
            </button>
          ))}
        </div>
        <div className="shop-grid">
          {visible.map((p) => (
            <article className="prod" key={p.id}>
              <Link href={`/shop/${p.sku}`} className="img" aria-label={`View ${p.name}`}>
                {p.imageUrl ? (
                  <Image src={p.imageUrl} alt="" width={480} height={360} sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" />
                ) : (
                  <span aria-hidden="true">{p.name.slice(0, 2).toUpperCase()}</span>
                )}
              </Link>
              <div className="bd">
                <span className="cat">{CATEGORY_LABEL[p.category] ?? p.category}</span>
                <h3>
                  <Link href={`/shop/${p.sku}`}>{p.name}</Link>
                </h3>
                <div className="ft">
                  <b>{formatPaise(p.price)}</b>
                  {p.stockQty > 0 ? (
                    <button type="button" className="btn btn-outline" onClick={() => add(p)}>
                      Add
                    </button>
                  ) : (
                    <span className="oos">Out of stock</span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <aside className="pub-card pub-side" aria-labelledby="bag-title">
        <h2 id="bag-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ShoppingBag size={18} /> Your bag {lines.length > 0 && <span className="tag">{lines.reduce((n, l) => n + l.qty, 0)}</span>}
        </h2>
        {lines.length === 0 ? (
          <p className="pub-note">Nothing yet. Add something from the shelf.</p>
        ) : (
          <>
            <div className="bag-lines">
              {lines.map((l) => (
                <div className="bag-line" key={l.product.id}>
                  <div>
                    <div style={{ fontWeight: 600, color: "var(--ink)" }}>{l.product.name}</div>
                    <div className="pub-note">{formatPaise(l.product.price)} each</div>
                  </div>
                  <div className="qty" aria-label={`Quantity of ${l.product.name}`}>
                    <button type="button" onClick={() => bump(l.product.id, -1)} aria-label="Remove one">−</button>
                    <span>{l.qty}</span>
                    <button type="button" onClick={() => bump(l.product.id, 1)} aria-label="Add one" disabled={l.qty >= l.product.stockQty}>+</button>
                  </div>
                </div>
              ))}
            </div>
            {discount > 0 && (
              <div className="bag-line">
                <span className="pub-note">{member?.firstName}&apos;s member discount ({member?.discountPct}%)</span>
                <span style={{ color: "#1a7f6f", fontWeight: 600 }}>−{formatPaise(discount)}</span>
              </div>
            )}
            <div className="bag-total">
              <span>Total</span>
              <span>{formatPaise(total)}</span>
            </div>

            <form
              className="pub-form"
              onSubmit={(e) => {
                e.preventDefault();
                setError(null);
                const fd = new FormData(e.currentTarget);
                start(async () => {
                  const res = await placeGuestOrderAction({
                    name: String(fd.get("name") ?? member?.firstName ?? ""),
                    phone: String(fd.get("phone") ?? ""),
                    email: String(fd.get("email") ?? ""),
                    fulfilment,
                    deliveryAddress: String(fd.get("address") ?? ""),
                    lines: lines.map((l) => ({ productId: l.product.id, qty: l.qty })),
                    company: String(fd.get("company") ?? ""),
                  });
                  if (res.success) setDone(res.data);
                  else setError(res.error);
                });
              }}
            >
              <div className="seg-toggle" role="radiogroup" aria-label="Fulfilment">
                <button type="button" role="radio" aria-checked={fulfilment === "CLICK_COLLECT"} onClick={() => setFulfilment("CLICK_COLLECT")}>
                  Click &amp; collect
                </button>
                <button type="button" role="radio" aria-checked={fulfilment === "DELIVERY"} onClick={() => setFulfilment("DELIVERY")}>
                  Delivery
                </button>
              </div>
              {!member && (
                <>
                  <label>
                    Name
                    <input name="name" required autoComplete="name" />
                  </label>
                  <label>
                    Phone
                    <input name="phone" required type="tel" autoComplete="tel" />
                  </label>
                  <label>
                    Email <span style={{ fontWeight: 400, color: "var(--muted)" }}>(optional)</span>
                    <input name="email" type="email" autoComplete="email" />
                  </label>
                </>
              )}
              {fulfilment === "DELIVERY" && (
                <label>
                  Delivery address
                  <textarea name="address" required rows={2} />
                </label>
              )}
              <div className="hp" aria-hidden="true">
                <label>
                  Company
                  <input name="company" tabIndex={-1} autoComplete="off" />
                </label>
              </div>
              {error && (
                <p className="pub-error" role="alert">
                  {error}
                </p>
              )}
              <button type="submit" className="btn btn-primary btn-lg" disabled={pending}>
                {pending ? "Placing order…" : `Pay ${formatPaise(total)} & order`}
              </button>
              <p className="pub-note">Payment is recorded as online for this demo. Stock is reserved the moment you order.</p>
            </form>
          </>
        )}
      </aside>
    </div>
  );
}
