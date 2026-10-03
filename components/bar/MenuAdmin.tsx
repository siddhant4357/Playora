"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { archiveMenuItemAction, toggleAvailabilityAction, upsertMenuItemAction } from "@/lib/actions/bar";
import { formatPaise } from "@/lib/money";
import type { MenuItem } from "@/lib/bar/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Panel, Pill } from "@/components/shared/Primitives";

export function MenuAdmin({ items, canEdit }: { items: MenuItem[]; canEdit: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const groups = [
    { key: "BEVERAGE", label: "Drinks" },
    { key: "FOOD", label: "Food (kitchen)" },
  ];
  const toggle = (id: string, on: boolean) =>
    start(async () => {
      const res = await toggleAvailabilityAction({ productId: id, isAvailable: on });
      res.success ? toast.success(res.message) : toast.error(res.error);
      router.refresh();
    });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {groups.map((g) => (
        <Panel key={g.key} title={g.label} actions={canEdit && <ItemDialog category={g.key as "FOOD" | "BEVERAGE"} onDone={() => router.refresh()} />}>
          <ul className="flex flex-col divide-y text-sm" style={{ borderColor: "var(--color-border)" }}>
            {items
              .filter((i) => i.category === g.key)
              .map((i) => (
                <li key={i.id} className="flex items-center gap-3 py-2">
                  <Switch checked={i.isAvailable} onCheckedChange={(v) => toggle(i.id, v)} disabled={pending} aria-label={`${i.name} available`} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className={i.isAvailable ? "font-medium" : "font-medium opacity-60"}>{i.name}</span>
                    {i.description && (
                      <span className="truncate text-xs" style={{ color: "var(--color-text-muted)" }}>
                        {i.description}
                      </span>
                    )}
                  </span>
                  {!i.isAvailable && <Pill tone="danger">86&apos;d</Pill>}
                  {i.trackStock && i.stockQty <= i.lowStockAt && <Pill tone="warning">{i.stockQty} left</Pill>}
                  <span className="w-20 text-right tabular-nums">{formatPaise(i.price)}</span>
                  {canEdit && <ItemDialog category={i.category as "FOOD" | "BEVERAGE"} item={i} onDone={() => router.refresh()} />}
                </li>
              ))}
          </ul>
        </Panel>
      ))}
    </div>
  );
}

function ItemDialog({ category, item, onDone }: { category: "FOOD" | "BEVERAGE"; item?: MenuItem; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [f, setF] = useState({ name: item?.name ?? "", description: item?.description ?? "", price: item ? String(item.price / 100) : "", trackStock: item?.trackStock ?? false });
  const save = () =>
    start(async () => {
      const res = await upsertMenuItemAction({ id: item?.id, name: f.name, description: f.description, category, price: Math.round(parseFloat(f.price || "0") * 100), trackStock: f.trackStock });
      if (!res.success) return void toast.error(res.error);
      toast.success(res.message);
      setOpen(false);
      onDone();
    });
  const archive = () =>
    start(async () => {
      if (!item) return;
      const res = await archiveMenuItemAction({ productId: item.id });
      if (!res.success) return void toast.error(res.error);
      toast.success(res.message);
      setOpen(false);
      onDone();
    });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={item ? <button type="button" className="text-xs underline-offset-4 hover:underline" style={{ color: "var(--color-text-muted)" }} /> : <Button size="sm" variant="outline" />}>
        {item ? "Edit" : <><Plus className="h-4 w-4" /> Add</>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{item ? `Edit ${item.name}` : `New ${category === "FOOD" ? "dish" : "drink"}`}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Name</Label>
            <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Description</Label>
            <Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Price (₹, incl. GST)</Label>
            <Input type="number" step="1" min="0" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
          </div>
          <label className="flex items-center justify-between text-sm">
            Track stock count
            <Switch checked={f.trackStock} onCheckedChange={(v) => setF({ ...f, trackStock: v })} />
          </label>
          <div className="flex gap-2">
            {item && (
              <Button variant="ghost" disabled={pending} onClick={archive} style={{ color: "var(--color-danger)" }}>
                Archive
              </Button>
            )}
            <Button className="flex-1" disabled={pending || !f.name.trim()} onClick={save}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
