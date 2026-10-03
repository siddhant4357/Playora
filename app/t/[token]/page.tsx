import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMenu, getTableByToken } from "@/lib/bar/queries";
import { GuestMenu } from "@/components/bar/GuestMenu";

export const metadata: Metadata = { title: "Order to your table" };

export default async function GuestTablePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const table = await getTableByToken(token);
  if (!table || !table.isActive) notFound();
  const menu = await getMenu(table.clubId);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 py-6" style={{ background: "var(--color-bg)" }}>
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>{table.club.name}</p>
        <h1 className="text-2xl font-bold">Table {table.name}</h1>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Order here and we&apos;ll bring it over. Pay at the counter or add it to your member tab.</p>
      </header>
      <GuestMenu token={token} menu={menu.map((m) => ({ id: m.id, name: m.name, description: m.description, category: m.category, price: m.price }))} />
    </main>
  );
}
