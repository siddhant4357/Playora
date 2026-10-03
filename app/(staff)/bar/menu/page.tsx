import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getMenu } from "@/lib/bar/queries";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/shared/Primitives";
import { MenuAdmin } from "@/components/bar/MenuAdmin";
import { TableQrSheet } from "@/components/bar/TableQrSheet";

export const metadata: Metadata = { title: "Menu" };

export default async function MenuPage() {
  const user = await requireUser("/bar/menu");
  const [menu, tables] = await Promise.all([getMenu(user.clubId, { includeUnavailable: true }), prisma.barTable.findMany({ where: { clubId: user.clubId, isActive: true }, orderBy: [{ zone: "asc" }, { sortOrder: "asc" }] })]);
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Bar" title="Menu" subtitle="Toggle availability when something runs out — the POS and guest QR menus update instantly." />
      <MenuAdmin items={menu} canEdit={user.role === "MANAGER" || user.role === "OWNER"} />
      <TableQrSheet tables={tables.map((t) => ({ id: t.id, name: t.name, zone: t.zone, url: `${base}/t/${t.qrToken}` }))} />
    </div>
  );
}
