import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getFloor, getMenu, getCurrentShift } from "@/lib/bar/queries";
import { BarPos } from "@/components/bar/BarPos";

export const metadata: Metadata = { title: "Bar POS" };

export default async function BarPosPage({ searchParams }: { searchParams: Promise<{ tab?: string; table?: string }> }) {
  const user = await requireUser("/bar/pos");
  const sp = await searchParams;
  const [menu, floor, shift] = await Promise.all([getMenu(user.clubId, { includeUnavailable: true }), getFloor(user.clubId), getCurrentShift(user.clubId)]);
  return (
    <BarPos
      menu={menu}
      tables={floor.tables.map((t) => ({ id: t.id, name: t.name, zone: t.zone, seats: t.seats }))}
      openTabs={floor.openTabs.map((t) => ({
        id: t.id,
        tabNo: t.tabNo,
        tableId: t.tableId,
        label: t.member ? `${t.member.firstName} ${t.member.lastName}` : t.guestName ?? t.tabNo,
        total: t.total,
        openedAt: t.openedAt.toISOString(),
        pendingKitchen: t.items.filter((i) => i.needsKitchen && i.kitchenStatus !== "SERVED").length,
        source: t.source,
      }))}
      initialTabId={sp.tab ?? null}
      initialTableId={sp.table ?? null}
      shiftOpen={Boolean(shift)}
    />
  );
}
