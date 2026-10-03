import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getServiceQueue } from "@/lib/shop/queries";
import { PageHeader } from "@/components/shared/Primitives";
import { ServiceDesk } from "@/components/shop/ServiceDesk";

export const metadata: Metadata = { title: "Service jobs" };

export default async function ServicesPage() {
  const user = await requireUser("/shop-pos/services");
  const { open, done, services } = await getServiceQueue(user.clubId);
  const serialize = (j: (typeof open)[number]) => ({ ...j, dueAt: j.dueAt.toISOString(), readyAt: j.readyAt?.toISOString() ?? null, collectedAt: j.collectedAt?.toISOString() ?? null, createdAt: j.createdAt.toISOString(), updatedAt: j.updatedAt.toISOString() });
  return (
    <div className="flex flex-col gap-4">
      <PageHeader eyebrow="Pro shop" title="Service jobs" subtitle="Restrings and regrips: paid up front, tracked to a due time, customer pinged when ready." />
      <ServiceDesk open={open.map(serialize)} done={done.map(serialize)} services={services} role={user.role} />
    </div>
  );
}
