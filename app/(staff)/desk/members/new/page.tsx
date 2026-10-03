import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listPlans } from "@/lib/members/queries";
import { PageHeader } from "@/components/shared/Primitives";
import { RegisterMemberForm } from "@/components/members/RegisterMemberForm";

export const metadata: Metadata = { title: "Register member" };

export default async function NewMemberPage({ searchParams }: { searchParams: Promise<{ lead?: string }> }) {
  const user = await requireUser("/desk/members/new");
  const { lead: leadId } = await searchParams;
  const [plans, lead] = await Promise.all([
    listPlans(user.clubId),
    leadId ? prisma.lead.findFirst({ where: { id: leadId, clubId: user.clubId } }) : null,
  ]);

  const prefill = lead
    ? {
        leadId: lead.id,
        firstName: lead.name.split(" ")[0] ?? "",
        lastName: lead.name.split(" ").slice(1).join(" "),
        phone: lead.phone,
        email: lead.email ?? "",
        planId: lead.quotePlanId ?? undefined,
        billing: (lead.quoteBilling as "MONTHLY" | "YEARLY" | null) ?? undefined,
      }
    : undefined;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Front desk"
        title={lead ? `Convert ${lead.name}` : "Register a member"}
        subtitle={lead ? "Details carried over from the lead. Pick a plan to activate the membership." : "One contact record. Plan is optional — leave it blank to start a trial."}
      />
      <RegisterMemberForm plans={plans.map((p) => ({ id: p.id, name: p.name, tier: p.tier, priceMonthly: p.priceMonthly, priceYearly: p.priceYearly }))} prefill={prefill} />
    </div>
  );
}
