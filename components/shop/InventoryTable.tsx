"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "cn";
import { AlertTriangle, PackagePlus, Pencil, Plus } from "lucide-react";
import type { CatalogueItem } from "@/lib/shop/queries";
import { adjustStockAction, archiveProductAction, upsertProductAction } from "@/lib/actions/shop";
import { formatPaise, rupees } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Panel, Pill } from "@/components/shared/Primitives";
import { CATEGORY_LABEL } from "@/components/shop/labels";

type Movement = { id: string; delta: number; reason: string; note: string | null; at: string; product: string; refType: string | null };
type Reason = "RESTOCK" | "ADJUSTMENT" | "WASTAGE" | "RETURN";
const REASONS: { key: Reason; label: string }[] = [
  { key: "RESTOCK", label: "Restock" },
  { key: "ADJUSTMENT", label: "Count correction" },
  { key: "WASTAGE", label: "Damaged / wastage" },
  { key: "RETURN", label: "Customer return" },
];
const SHOP_CATS = ["RACKET", "BALL", "SHOES", "ACCESSORY", "APPAREL", "SERVICE"] as const;

type Draft = { id?: string; sku: string; name: string; description: string; category: (typeof SHOP_CATS)[number]; price: string; costPrice: string; taxRatePct: string; lowStockAt: string; trackStock: boolean; isService: boolean };
const blank: Draft = { sku: "", name: "", description: "", category: "ACCESSORY", price: "", costPrice: "", taxRatePct: "18", lowStockAt: "5", trackStock: true, isService: false };

export function InventoryTable({ products, movements, canEdit }: { products: CatalogueItem[]; movements: Movement[]; canEdit: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [q, setQ] = useState("");
  const [onlyLow, setOnlyLow] = useState(false);
  const [adjusting, setAdjusting] = useState<CatalogueItem | null>(null);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState<Reason>("RESTOCK");
  const [note, setNote] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return products.filter((p) => (!onlyLow || (p.trackStock && p.stockQty <= p.lowStockAt)) && (!needle || p.name.toLowerCase().includes(needle) || p.sku.toLowerCase().includes(needle)));
  }, [products, q, onlyLow]);

  const run = (fn: () => Promise<{ success: boolean; message?: string; error?: string }>, after?: () => void) =>
    start(async () => {
      const res = await fn();
      if (!res.success) return void toast.error(res.error);
      toast.success(res.message);
      after?.();
      router.refresh();
    });

  const submitAdjust = () => {
    if (!adjusting) return;
    const n = Number(delta);
    const signed = reason === "WASTAGE" ? -Math.abs(n) : reason === "RESTOCK" || reason === "RETURN" ? Math.abs(n) : n;
    run(() => adjustStockAction({ productId: adjusting.id, delta: signed, reason, note: note || undefined }), () => {
      setAdjusting(null);
      setDelta("");
      setNote("");
    });
  };

  const openEdit = (p?: CatalogueItem) =>
    setDraft(p ? { id: p.id, sku: p.sku, name: p.name, description: p.description ?? "", category: (SHOP_CATS as readonly string[]).includes(p.category) ? (p.category as Draft["category"]) : "ACCESSORY", price: (p.price / 100).toString(), costPrice: p.costPrice ? (p.costPrice / 100).toString() : "", taxRatePct: String(p.taxRatePct), lowStockAt: String(p.lowStockAt), trackStock: p.trackStock, isService: p.isService } : { ...blank });

  const submitDraft = () => {
    if (!draft) return;
    run(
      () =>
        upsertProductAction({
          id: draft.id,
          sku: draft.sku,
          name: draft.name,
          description: draft.description || undefined,
          category: draft.isService ? "SERVICE" : draft.category,
          price: rupees(Number(draft.price || 0)),
          costPrice: draft.costPrice ? rupees(Number(draft.costPrice)) : undefined,
          taxRatePct: Number(draft.taxRatePct || 18),
          lowStockAt: Number(draft.lowStockAt || 0),
          trackStock: draft.trackStock,
          isService: draft.isService,
        }),
      () => setDraft(null)
    );
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
      <Panel
        title="Products"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setOnlyLow((v) => !v)} className={cn("flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium", onlyLow && "text-white")} style={onlyLow ? { background: "var(--color-warning)" } : { background: "var(--color-bg)", border: "1px solid var(--color-border)" }} aria-pressed={onlyLow}>
              <AlertTriangle className="h-3 w-3" /> Low stock
            </button>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search products" className="w-40" />
            {canEdit && (
              <Button size="sm" onClick={() => openEdit()}>
                <Plus className="h-4 w-4" /> Product
              </Button>
            )}
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                <th className="py-2 pr-3 font-medium">Product</th>
                <th className="py-2 pr-3 font-medium">Category</th>
                <th className="py-2 pr-3 text-right font-medium">Price</th>
                <th className="py-2 pr-3 text-right font-medium">On hand</th>
                <th className="py-2 pr-3 text-right font-medium">Low at</th>
                <th className="py-2 font-medium"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--color-border)" }}>
              {rows.map((p) => {
                const out = p.trackStock && p.stockQty <= 0;
                const low = p.trackStock && !out && p.stockQty <= p.lowStockAt;
                return (
                  <tr key={p.id}>
                    <td className="py-2 pr-3">
                      <div className="flex flex-col">
                        <span className="font-medium">{p.name}</span>
                        <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{p.sku}</span>
                      </div>
                    </td>
                    <td className="py-2 pr-3">{CATEGORY_LABEL[p.category]}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{formatPaise(p.price)}</td>
                    <td className="py-2 pr-3 text-right">
                      {p.trackStock ? (
                        <span className="inline-flex items-center justify-end gap-2">
                          <span className="font-semibold tabular-nums">{p.stockQty}</span>
                          {out ? <Pill tone="danger">Out</Pill> : low ? <Pill tone="warning">Low</Pill> : null}
                        </span>
                      ) : (
                        <span style={{ color: "var(--color-text-muted)" }}>{p.isService ? "Service" : "—"}</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums" style={{ color: "var(--color-text-muted)" }}>{p.trackStock ? p.lowStockAt : "—"}</td>
                    <td className="py-2 text-right">
                      <span className="inline-flex gap-1">
                        {p.trackStock && (
                          <Button size="sm" variant="outline" onClick={() => { setAdjusting(p); setReason(low || out ? "RESTOCK" : "RESTOCK"); }}>
                            <PackagePlus className="h-4 w-4" /> Stock
                          </Button>
                        )}
                        {canEdit && (
                          <Button size="sm" variant="ghost" onClick={() => openEdit(p)} aria-label={`Edit ${p.name}`}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center" style={{ color: "var(--color-text-muted)" }}>
                    {onlyLow ? "Nothing is low on stock." : "No products match."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Movement log">
        {movements.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            No stock movements yet.
          </p>
        ) : (
          <ul className="flex max-h-[32rem] flex-col divide-y overflow-y-auto text-sm" style={{ borderColor: "var(--color-border)" }}>
            {movements.map((m) => (
              <li key={m.id} className="flex items-start gap-3 py-2">
                <span className={cn("w-10 shrink-0 text-right font-bold tabular-nums")} style={{ color: m.delta < 0 ? "var(--color-danger)" : "var(--color-success)" }}>
                  {m.delta > 0 ? `+${m.delta}` : m.delta}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{m.product}</span>
                  <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {m.reason.toLowerCase()}
                    {m.refType ? ` · ${m.refType === "BarTab" ? "bar" : "shop"}` : ""}
                    {m.note ? ` · ${m.note}` : ""} · {new Date(m.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Dialog open={!!adjusting} onOpenChange={(o) => !o && setAdjusting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust stock · {adjusting?.name}</DialogTitle>
          </DialogHeader>
          {adjusting && (
            <div className="flex flex-col gap-4">
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                On hand <strong className="tabular-nums" style={{ color: "var(--color-text)" }}>{adjusting.stockQty}</strong> · low at {adjusting.lowStockAt}
              </p>
              <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Reason">
                {REASONS.map((r) => (
                  <button key={r.key} type="button" role="radio" aria-checked={reason === r.key} onClick={() => setReason(r.key)} className={cn("rounded-full px-3 py-1 text-xs font-semibold", reason === r.key && "text-white")} style={reason === r.key ? { background: "var(--color-primary-900)" } : { background: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
                    {r.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="delta">{reason === "ADJUSTMENT" ? "Change (use − to reduce)" : "Quantity"}</Label>
                <Input id="delta" type="number" inputMode="numeric" value={delta} onChange={(e) => setDelta(e.target.value)} autoFocus />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="note">Note</Label>
                <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder={reason === "RESTOCK" ? "Supplier / invoice no." : "Why?"} />
              </div>
              <Button onClick={submitAdjust} disabled={pending || !delta || Number(delta) === 0}>
                {pending ? "Saving…" : "Apply"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit product" : "New product"}</DialogTitle>
          </DialogHeader>
          {draft && (
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                submitDraft();
              }}
            >
              <div className="grid grid-cols-[120px_1fr] gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="sku">SKU</Label>
                  <Input id="sku" value={draft.sku} onChange={(e) => setDraft({ ...draft, sku: e.target.value.toUpperCase() })} required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="desc">Description</Label>
                <Input id="desc" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </div>
              <div className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background: "var(--color-bg)" }}>
                <Label htmlFor="svc">Service (restring, regrip) — no stock, has turnaround</Label>
                <Switch id="svc" checked={draft.isService} onCheckedChange={(v) => setDraft({ ...draft, isService: v, trackStock: v ? false : draft.trackStock })} />
              </div>
              {!draft.isService && (
                <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Category">
                  {SHOP_CATS.filter((c) => c !== "SERVICE").map((c) => (
                    <button key={c} type="button" role="radio" aria-checked={draft.category === c} onClick={() => setDraft({ ...draft, category: c })} className={cn("rounded-full px-3 py-1 text-xs font-semibold", draft.category === c && "text-white")} style={draft.category === c ? { background: "var(--color-primary-900)" } : { background: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
                      {CATEGORY_LABEL[c]}
                    </button>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="price">Price (₹)</Label>
                  <Input id="price" type="number" min={0} step="0.01" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cost">Cost (₹)</Label>
                  <Input id="cost" type="number" min={0} step="0.01" value={draft.costPrice} onChange={(e) => setDraft({ ...draft, costPrice: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="tax">GST %</Label>
                  <Input id="tax" type="number" min={0} max={28} value={draft.taxRatePct} onChange={(e) => setDraft({ ...draft, taxRatePct: e.target.value })} />
                </div>
              </div>
              {!draft.isService && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background: "var(--color-bg)" }}>
                    <Label htmlFor="track">Track stock</Label>
                    <Switch id="track" checked={draft.trackStock} onCheckedChange={(v) => setDraft({ ...draft, trackStock: v })} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="low">Low-stock alert at</Label>
                    <Input id="low" type="number" min={0} value={draft.lowStockAt} onChange={(e) => setDraft({ ...draft, lowStockAt: e.target.value })} disabled={!draft.trackStock} />
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between pt-1">
                {draft.id ? (
                  <button type="button" className="text-xs underline" style={{ color: "var(--color-danger)" }} onClick={() => run(() => archiveProductAction({ productId: draft.id! }), () => setDraft(null))}>
                    Archive product
                  </button>
                ) : (
                  <span />
                )}
                <Button type="submit" disabled={pending}>
                  {pending ? "Saving…" : draft.id ? "Save" : "Add product"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
