import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getCurrentShift, getFloor, getMenu } from "@/lib/bar/queries";
import { PageHeader } from "@/components/shared/Primitives";
import { BarPos } from "@/components/bar/BarPos";

export const metadata: Metadata = { title: "Bar POS" };

export default async function BarPosPage({ searchParams }: { searchParams: Promise<{ tab?: string; table?: string }> }) {
  const user = await requireUser("/bar/pos");
  const sp = await searchParams;
  const [menu, floor, shift] = await Promise.all([getMenu(user.clubId, { includeUnavailable: true }), getFloor(user.clubId), getCurrentShift(user.clubId)]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow="Bar & cafe"
        title="Point of sale"
        subtitle={
          shift ? (
            `Shift open since ${shift.startsAt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })} · ${floor.openTabs.length} open tabs`
          ) : (
            <span>
              No shift open —{" "}
              <Link href="/bar/shift" className="underline">
                open one
              </Link>{" "}
              so sales roll into the Z-report.
            </span>
          )
        }
      />
      <BarPos menu={menu} tables={floor.tables} openTabs={floor.openTabs.map((t) => ({ id: t.id, tabNo: t.tabNo, tableId: t.tableId, total: t.total, guestName: t.guestName, memberName: t.member ? `${t.member.firstName} ${t.member.lastName}` : null, pending: t.items.filter((i) => i.needsKitchen && i.kitchenStatus !== "SERVED").length }))} initialTabId={sp.tab ?? null} initialTableId={sp.table ?? null} />
    </div>
  );
}
