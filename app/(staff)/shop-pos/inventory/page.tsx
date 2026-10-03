import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getCatalogue, getInventory, getMovements } from "@/lib/shop/queries";
import { formatPaise } from "@/lib/money";
import { PageHeader, Stat } from "@/components/shared/Primitives";
import { InventoryTable } from "@/components/shop/InventoryTable";

export const metadata: Metadata = { title: "Inventory" };

export default async function InventoryPage() {
  const user = await requireUser("/shop-pos/inventory");
  const [inv, movements, all] = await Promise.all([getInventory(user.clubId), getMovements(user.clubId), getCatalogue(user.clubId, { includeInactive: false, includeServices: true })]);
  const shopProducts = all.filter((p) => p.isForShop);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow="Pro shop" title="Inventory" subtitle="One stock number per product. The counter, the member app and the bar all read and write this same list." />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Tracked products" value={inv.products.length} />
        <Stat label="Low on stock" value={inv.low.length} tone={inv.low.length ? "warning" : "success"} hint={inv.low.length ? inv.low.slice(0, 3).map((p) => p.name).join(", ") + (inv.low.length > 3 ? "…" : "") : "Everything above threshold"} />
        <Stat label="Stock at cost" value={formatPaise(inv.value)} hint="Sum of cost price × on hand" />
      </div>
      <InventoryTable products={shopProducts} movements={movements.map((m) => ({ id: m.id, delta: m.delta, reason: m.reason, note: m.note, at: m.createdAt.toISOString(), product: m.product.name, refType: m.refType }))} canEdit={user.role === "MANAGER" || user.role === "OWNER"} />
    </div>
  );
}
