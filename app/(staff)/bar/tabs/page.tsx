import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getClub } from "@/lib/club";
import { formatPaise } from "@/lib/money";
import { formatTime } from "@/lib/time";
import { EmptyState, PageHeader, Panel, Pill, statusTone } from "@/components/shared/Primitives";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Tabs" };

export default async function TabsPage() {
  const user = await requireUser("/bar/tabs");
  const club = await getClub(user.clubId);
  const tz = club?.timezone ?? "Asia/Kolkata";
  const since = new Date(Date.now() - 24 * 3600_000);
  const tabs = await prisma.barTab.findMany({
    where: { clubId: user.clubId, OR: [{ status: "OPEN" }, { settledAt: { gte: since } }] },
    include: { table: { select: { name: true } }, member: { select: { firstName: true, lastName: true } }, items: { where: { kitchenStatus: { not: "CANCELLED" } }, select: { qty: true, needsKitchen: true, kitchenStatus: true } } },
    orderBy: [{ status: "asc" }, { openedAt: "desc" }],
  });
  const open = tabs.filter((t) => t.status === "OPEN");
  const closed = tabs.filter((t) => t.status !== "OPEN");

  const Row = ({ t }: { t: (typeof tabs)[number] }) => {
    const who = t.table?.name ?? (t.member ? `${t.member.firstName} ${t.member.lastName}` : t.guestName ?? "Counter");
    const pendingFood = t.items.filter((i) => i.needsKitchen && i.kitchenStatus !== "SERVED").length;
    return (
      <li>
        <Link href={`/bar/tabs/${t.id}`} className="flex items-center justify-between gap-3 py-3 text-sm">
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-semibold">
              {who} <span className="font-normal" style={{ color: "var(--color-text-muted)" }}>· {t.tabNo}</span>
            </span>
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {formatTime(t.openedAt, tz)} · {t.items.reduce((s, i) => s + i.qty, 0)} items{t.source === "QR" ? " · QR order" : ""}
              {pendingFood > 0 && ` · ${pendingFood} in kitchen`}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="font-bold tabular-nums">{formatPaise(t.total)}</span>
            <Pill tone={statusTone(t.status)}>{t.status}</Pill>
          </span>
        </Link>
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Bar & cafe" title="Tabs" subtitle={`${open.length} open · ${closed.length} closed in the last 24h`} actions={<Button nativeButton={false} render={<Link href="/bar/pos" />}>New order</Button>} />
      <Panel title="Open">
        {open.length === 0 ? <EmptyState title="No open tabs" hint="Orders from the POS or table QR codes will show up here." /> : <ul className="divide-y" style={{ borderColor: "var(--color-border)" }}>{open.map((t) => <Row key={t.id} t={t} />)}</ul>}
      </Panel>
      {closed.length > 0 && (
        <Panel title="Recently closed">
          <ul className="divide-y" style={{ borderColor: "var(--color-border)" }}>{closed.map((t) => <Row key={t.id} t={t} />)}</ul>
        </Panel>
      )}
    </div>
  );
}
