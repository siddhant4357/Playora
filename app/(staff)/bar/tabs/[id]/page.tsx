import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getFloor, getTab } from "@/lib/bar/queries";
import { TabDetail } from "@/components/bar/TabDetail";

export const metadata: Metadata = { title: "Tab" };

export default async function TabPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const [tab, floor] = await Promise.all([getTab(user.clubId, id), getFloor(user.clubId)]);
  if (!tab) notFound();
  const canManage = user.role === "MANAGER" || user.role === "OWNER";

  return (
    <div className="flex flex-col gap-4">
      <Link href="/bar/tabs" className="inline-flex items-center gap-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
        <ArrowLeft className="h-4 w-4" /> Open tabs
      </Link>
      <TabDetail
        tab={JSON.parse(JSON.stringify(tab))}
        tables={floor.tables.map((t) => ({ id: t.id, name: t.name }))}
        canManage={canManage}
      />
    </div>
  );
}
