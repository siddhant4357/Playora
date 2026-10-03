import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getMemberOrders, getMemberShopContext } from "@/lib/shop/queries";
import { Button } from "@/components/ui/button";
import { OrderTracker } from "@/components/shop/OrderTracker";

export const metadata: Metadata = { title: "My orders" };

export default async function MemberOrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=%2Fme%2Forders");
  const ctx = await getMemberShopContext(user.userId);
  if (!ctx?.member) redirect("/me/shop");
  const orders = await getMemberOrders(ctx.member.id);
  const live = orders.filter((o) => !["COMPLETED", "CANCELLED"].includes(o.status));
  const past = orders.filter((o) => ["COMPLETED", "CANCELLED"].includes(o.status));

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">My orders</h1>
        <Button size="sm" render={<Link href="/me/shop" />} nativeButton={false}>
          <ShoppingBag className="h-4 w-4" />
          Shop
        </Button>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
          In progress · {live.length}
        </h2>
        {live.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl p-8 text-center" style={{ background: "var(--color-surface)", border: "1px dashed var(--color-border-strong)" }}>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              Nothing on the way.
            </p>
            <Button variant="outline" size="sm" render={<Link href="/me/shop" />} nativeButton={false}>
              Browse the shop
            </Button>
          </div>
        ) : (
          live.map((o) => <OrderTracker key={o.id} order={{ ...o, createdAt: o.createdAt.toISOString(), updatedAt: o.updatedAt.toISOString() }} />)
        )}
      </section>

      {past.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
            Earlier
          </h2>
          {past.map((o) => (
            <OrderTracker key={o.id} order={{ ...o, createdAt: o.createdAt.toISOString(), updatedAt: o.updatedAt.toISOString() }} compact />
          ))}
        </section>
      )}
    </div>
  );
}
