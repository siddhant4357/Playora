import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getClub } from "@/lib/club";
import { getCatalogue, getInventory, getTodayShopStats } from "@/lib/shop/queries";
import { dayStart, todayKey } from "@/lib/time";
import { formatPaise } from "@/lib/money";
import { PageHeader } from "@/components/shared/Primitives";
import { ShopPos } from "@/components/shop/ShopPos";

export const metadata: Metadata = { title: "Counter sale" };

export default async function ShopPosPage() {
  const user = await requireUser("/shop-pos");
  const club = await getClub(user.clubId);
  const tz = club?.timezone ?? "Asia/Kolkata";
  const [catalogue, inv, stats] = await Promise.all([getCatalogue(user.clubId), getInventory(user.clubId), getTodayShopStats(user.clubId, dayStart(todayKey(tz), tz))]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Pro shop"
        title="Counter sale"
        subtitle={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              Today {formatPaise(stats.revenue, { free: "₹0" })} across {stats.txns} payment{stats.txns === 1 ? "" : "s"}
            </span>
            {stats.pendingOnline > 0 && (
              <Link href="/shop-pos/orders" className="underline" style={{ color: "var(--color-accent-600)" }}>
                {stats.pendingOnline} online order{stats.pendingOnline === 1 ? "" : "s"} to pick
              </Link>
            )}
            {inv.low.length > 0 && (
              <Link href="/shop-pos/inventory" className="underline" style={{ color: "var(--color-warning)" }}>
                {inv.low.length} low on stock
              </Link>
            )}
          </span>
        }
      />
      <ShopPos catalogue={catalogue} role={user.role} />
    </div>
  );
}
