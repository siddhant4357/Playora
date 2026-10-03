"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import type { MenuItem } from "@/lib/bar/queries";
import { archiveMenuItemAction, toggleAvailabilityAction, upsertMenuItemAction } from "@/lib/actions/bar";
import { formatPaise } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Panel } from "@/components/shared/Primitives";

type Draft = { id?: string; name: string; description: string; category: "FOOD" | "BEVERAGE"; price: string; costPrice: string; trackStock: boolean };
const empty: Draft = { name: "", description: "", category: "FOOD", price: "", costPrice: "", trackStock: false };

export function MenuAdmin({ items, canEdit }: { items: MenuItem[]; canEdit: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<Draft | null>(null);

  const toggle = (p: MenuItem) =>
    start(async () => {
      const res = await toggleAvailabilityAction({ productId: p.id, isAvailable: !p.isAvailable });
      res.success ? router.refresh() : toast.error(res.error);
    });

  const save = () => {
    if (!draft) return;
    start(async () => {
      const res = await upsertMenuItemAction({ id: draft.id, name: draft.name, description: draft.description, category: draft.category, price: Math.round(Number(draft.price) * 100), costPrice: draft.costPrice ? Math.round(Number(draft.costPrice) * 100) : undefined, trackStock: draft.trackStock });
      if (!res.success) return void toast.error(res.error);
      toast.success(res.message);
      setDraft(null);
      router.refresh();
    });
  };

  const groups = [
    { key: "FOOD", label: "Food (kitchen)" },
    { key: "BEVERAGE", label: "Drinks (bar)" },
  ];

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map((g) => (
          <Panel key={g.key} title={g.label} actions={canEdit && <Button size="sm" variant="outline" onClick={() => setDraft({ ...empty, category: g.key as Draft["category"] })}><Plus className="h-4 w-4" /> Add</Button>}>
            <ul className="flex flex-col divide-y text-sm" style={{ borderColor: "var(--color-border)" }}>
              {items.filter((i) => i.category === g.key).map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2">
                  <Switch checked={p.isAvailable} onCheckedChange={() => toggle(p)} disabled={pending} aria-label={`${p.name} available`} />
                  <button type="button" className="flex min-w-0 flex-1 flex-col text-left disabled:cursor-default" disabled={!canEdit} onClick={() => setDraft({ id: p.id, name: p.name, description: p.description ?? "", category: p.category as Draft["category"], price: String(p.price / 100), costPrice: p.costPrice ? String(p.costPrice / 100) : "", trackStock: p.trackStock })}>
                    <span className="truncate font-medium" style={{ opacity: p.isAvailable ? 1 : 0.5 }}>{p.name}</span>
                    <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                      {p.trackStock ? `${p.stockQty} in stock` : "Made to order"} · {p.taxRatePct}% GST
                    </span>
                  </button>
                  <span className="font-semibold tabular-nums">{formatPaise(p.price)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit item" : "New menu item"}</DialogTitle>
          </DialogHeader>
          {draft && (
            <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); save(); }}>
              <div className="flex flex-col gap-1.5"><Label className="text-xs">Name</Label><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required autoFocus /></div>
              <div className="flex flex-col gap-1.5"><Label className="text-xs">Description</Label><Input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5"><Label className="text-xs">Price (₹)</Label><Input type="number" min={0} step="1" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} required /></div>
                <div className="flex flex-col gap-1.5"><Label className="text-xs">Cost (₹)</Label><Input type="number" min={0} step="1" value={draft.costPrice} onChange={(e) => setDraft({ ...draft, costPrice: e.target.value })} /></div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {(["FOOD", "BEVERAGE"] as const).map((c) => (
                    <button key={c} type="button" onClick={() => setDraft({ ...draft, category: c })} className="rounded-full px-3 py-1 text-xs font-semibold" style={draft.category === c ? { background: "var(--color-primary-900)", color: "#fff" } : { background: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
                      {c === "FOOD" ? "Food" : "Drink"}
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-2 text-xs"><Switch checked={draft.trackStock} onCheckedChange={(v) => setDraft({ ...draft, trackStock: v })} /> Track stock</label>
              </div>
              <div className="flex justify-between pt-1">
                {draft.id ? <Button type="button" variant="ghost" onClick={() => start(async () => { const r = await archiveMenuItemAction({ productId: draft.id! }); r.success ? (setDraft(null), router.refresh()) : toast.error(r.error); })}>Archive</Button> : <span />}
                <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
