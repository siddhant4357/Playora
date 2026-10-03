import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getKitchenTickets } from "@/lib/bar/queries";
import { KitchenBoard } from "@/components/bar/KitchenBoard";

export const metadata: Metadata = { title: "Kitchen" };

export default async function KdsPage() {
  const user = await requireUser("/bar/kds");
  const tickets = await getKitchenTickets(user.clubId);
  return (
    <KitchenBoard
      tickets={tickets.map((t) => ({
        tabId: t.tabId,
        label: t.label,
        tabNo: t.tabNo,
        firstAt: t.firstAt.toISOString(),
        items: t.items.map((i) => ({ id: i.id, name: i.name, qty: i.qty, status: i.kitchenStatus, notes: i.notes, modifiers: i.modifiers })),
      }))}
    />
  );
}
