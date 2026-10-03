import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getClub } from "@/lib/club";
import { getFloor } from "@/lib/bar/queries";
import { formatPaise } from "@/lib/money";
import { formatTime } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, Pill } from "@/components/shared/Primitives";

export const metadata: Metadata = { title: "Open tabs" };

export default async function TabsPage() {
  const user = await requireUser("/bar/tabs");
  const [floor, club] = await Promise.all([getFloor(user.clubId), getClub(user.clubId)]);
  const tz = club?.timezone ?? "Asia/Kolkata";
  const total = floor.openTabs.reduce((s, t) => s + t.total, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Bar" title="Open tabs" subtitle={`${floor.openTabs.length} open · ${formatPaise(total)} unsettled`} actions={<Button render={<Link href="/bar/pos" />}>New order</Button>} />
      {floor.openTabs.length === 0 ? (
        <EmptyState title="No open tabs" hint="Everything is settled. Start a new order from the POS." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {floor.openTabs.map((t) => {
            const table = floor.tables.find((x) => x.id === t.tableId);
            const pending = t.items.filter((i) => i.needsKitchen && i.kitchenStatus !== "SERVED").length;
            return (
              <li key={t.id}>
                <Link href={`/bar/tabs/${t.id}`} className="flex flex-col gap-2 rounded-2xl p-4 transition-colors hover:opacity-95" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold">{table?.name ?? "Counter"}</span>
                    <span className="text-lg font-bold tabular-nums">{formatPaise(t.total)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm" style={{ color: "var(--color-text-muted)" }}>
                    <span className="truncate">{t.member ? `${t.member.firstName} ${t.member.lastName}` : t.guestName ?? "Guest"}</span>
                    <span>since {formatTime(t.openedAt, tz)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Pill tone="neutral">{t.items.length} items</Pill>
                    {pending > 0 && <Pill tone="warning">{pending} in kitchen</Pill>}
                    {t.source === "QR" && <Pill tone="accent">QR order</Pill>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
