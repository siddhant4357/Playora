import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getKitchenTickets } from "@/lib/bar/queries";
import { PageHeader } from "@/components/shared/Primitives";
import { KitchenBoard } from "@/components/bar/KitchenBoard";

export const metadata: Metadata = { title: "Kitchen" };

export default async function KdsPage() {
  const user = await requireUser("/bar/kds");
  const tickets = await getKitchenTickets(user.clubId);
  return (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow="Kitchen" title="Tickets" subtitle={`${tickets.length} open · oldest first · auto-refreshes`} />
      <KitchenBoard tickets={tickets.map((t) => ({ tabId: t.tabId, label: t.label, tabNo: t.tabNo, firstAt: t.firstAt.toISOString(), items: t.items.map((i) => ({ id: i.id, name: i.name, qty: i.qty, notes: i.notes, status: i.kitchenStatus })) }))} />
    </div>
  );
}
