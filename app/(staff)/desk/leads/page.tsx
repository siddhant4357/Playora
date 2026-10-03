import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPipeline } from "@/lib/leads/queries";
import { PageHeader } from "@/components/shared/Primitives";
import { LeadKanban } from "@/components/leads/LeadKanban";
import { NewLeadDialog } from "@/components/leads/NewLeadDialog";

export const metadata: Metadata = { title: "Leads" };

export default async function LeadsPage() {
  const user = await requireRole("FRONT_DESK", "MANAGER", "OWNER");
  const [{ byStage, counts }, club] = await Promise.all([getPipeline(user.clubId), prisma.club.findUniqueOrThrow({ where: { id: user.clubId }, select: { timezone: true } })]);

  const columns = (["NEW", "CONTACTED", "QUOTE_SENT", "TRIAL_BOOKED", "CONVERTED", "LOST"] as const).map((stage) => ({
    stage,
    leads: (byStage.get(stage) ?? []).map((l) => ({ ...l, nextFollowUp: l.nextFollowUp?.toISOString() ?? null, createdAt: l.createdAt.toISOString(), updatedAt: l.updatedAt.toISOString() })),
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Front desk"
        title="Leads"
        subtitle={`${counts.open} open · ${counts.overdue} follow-up${counts.overdue === 1 ? "" : "s"} overdue · ${counts.converted30d} converted in 30 days`}
        actions={<NewLeadDialog />}
      />
      <LeadKanban columns={columns} timezone={club.timezone} />
    </div>
  );
}
