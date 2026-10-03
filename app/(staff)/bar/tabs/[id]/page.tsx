import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getTab } from "@/lib/bar/queries";
import { prisma } from "@/lib/db";
import { TabDetailView } from "@/components/bar/TabDetailView";

export const metadata: Metadata = { title: "Tab" };

export default async function TabPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const [tab, tables] = await Promise.all([getTab(user.clubId, id), prisma.barTable.findMany({ where: { clubId: user.clubId, isActive: true }, select: { id: true, name: true }, orderBy: { sortOrder: "asc" } })]);
  if (!tab) notFound();
  return (
    <div className="flex flex-col gap-4">
      <Link href="/bar/tabs" className="inline-flex items-center gap-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
        <ArrowLeft className="h-4 w-4" /> Tabs
      </Link>
      <TabDetailView tab={tab} tables={tables} role={user.role} />
    </div>
  );
}
