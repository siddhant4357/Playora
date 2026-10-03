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
  const [menu, tables] = await Promise.all([getMenu(user.clubId, { includeUnavailable: true }), prisma.barTable.findMany({ where: { clubId: user.clubId, isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, zone: true, qrToken: true } })]);
  const manager = user.role === "MANAGER" || user.role === "OWNER";
  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Bar & cafe" title="Menu" subtitle={`${menu.length} items · toggle to 86 an item instantly across POS and table QR menus`} />
      <MenuAdmin items={menu} canEdit={manager} />
      <TableQrSheet tables={tables} />
    </div>
  );
}
