import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getOrderQueue } from "@/lib/shop/queries";
import { PageHeader } from "@/components/shared/Primitives";
import { OrderQueue } from "@/components/shop/OrderQueue";

export const metadata: Metadata = { title: "Online orders" };

export default async function ShopOrdersPage() {
  const user = await requireUser("/shop-pos/orders");
  const { active, recent } = await getOrderQueue(user.clubId);
  return (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow="Pro shop" title="Online orders" subtitle={active.length === 0 ? "Nothing waiting. Orders placed in the member app land here the moment they are paid." : `${active.length} order${active.length === 1 ? "" : "s"} in flight — stock was reserved when they were placed.`} />
      <OrderQueue active={active} recent={recent} />
    </div>
  );
}
