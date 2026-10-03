import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PackageSearch } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCatalogue, getMemberShopContext } from "@/lib/shop/queries";
import { Button } from "@/components/ui/button";
import { MemberShop } from "@/components/shop/MemberShop";

export const metadata: Metadata = { title: "Pro shop" };

export default async function MemberShopPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=%2Fme%2Fshop");
  const ctx = await getMemberShopContext(user.userId);
  if (!ctx) redirect("/login");
  const [catalogue, openOrders] = await Promise.all([getCatalogue(ctx.clubId), ctx.member ? prisma.shopOrder.count({ where: { memberId: ctx.member.id, status: { in: ["PAID", "PREPARING", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY"] } } }) : 0]);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Pro shop</h1>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            {ctx.discountPct > 0 ? `${ctx.member?.plan?.name} price: ${ctx.discountPct}% off everything, applied at checkout.` : "Order from the sofa, collect at the club or get it delivered."}
          </p>
        </div>
        <Button size="sm" variant="outline" render={<Link href="/me/orders" />} nativeButton={false}>
          <PackageSearch className="h-4 w-4" />
          Orders{openOrders > 0 && ` · ${openOrders}`}
        </Button>
      </header>
      <MemberShop catalogue={catalogue} discountPct={ctx.discountPct} planName={ctx.member?.plan?.name ?? null} canOrder={!!ctx.member} />
    </div>
  );
}
