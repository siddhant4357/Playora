import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getFreeThisWeek, getLeadDetail, getPublicPlans } from "@/lib/leads/queries";
import { Button } from "@/components/ui/button";
import { LeadDetail } from "@/components/leads/LeadDetail";

export const metadata: Metadata = { title: "Lead" };

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("FRONT_DESK", "MANAGER", "OWNER");
  const { id } = await params;
  const [lead, plans, club] = await Promise.all([getLeadDetail(user.clubId, id), getPublicPlans(user.clubId), prisma.club.findUniqueOrThrow({ where: { id: user.clubId }, select: { timezone: true, name: true } })]);
  if (!lead) notFound();
  const open = lead.stage !== "CONVERTED" && lead.stage !== "LOST";
  const slots = open && !lead.trial ? await getFreeThisWeek(user.clubId, { days: 7, perDay: 60, fromMinute: 6 * 60, dedupeTimes: false }) : [];

  return (
    <div className="flex flex-col gap-4">
      <Button variant="ghost" size="sm" className="w-fit" render={<Link href="/desk/leads" />} nativeButton={false}>
        <ChevronLeft className="h-4 w-4" /> All leads
      </Button>
      <LeadDetail
        lead={{
          ...lead,
          createdAt: lead.createdAt.toISOString(),
          updatedAt: lead.updatedAt.toISOString(),
          nextFollowUp: lead.nextFollowUp?.toISOString() ?? null,
          quoteSentAt: lead.quoteSentAt?.toISOString() ?? null,
          activities: lead.activities.map((a) => ({ id: a.id, type: a.type, content: a.content, byName: a.byName, createdAt: a.createdAt.toISOString() })),
          trial: lead.trial ? { id: lead.trial.id, courtName: lead.trial.court.name, startsAt: lead.trial.startsAt.toISOString(), status: lead.trial.status } : null,
        }}
        plans={plans.map((p) => ({ id: p.id, name: p.name, tier: p.tier, priceMonthly: p.priceMonthly, priceYearly: p.priceYearly }))}
        slots={slots}
        timezone={club.timezone}
        clubName={club.name}
      />
    </div>
  );
}
