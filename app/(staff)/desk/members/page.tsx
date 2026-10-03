import type { Metadata } from "next";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listMembers, type MemberFilter } from "@/lib/members/queries";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/Primitives";
import { MembersTable } from "@/components/members/MembersTable";
import { MembersToolbar } from "@/components/members/MembersToolbar";

export const metadata: Metadata = { title: "Members" };

const FILTERS: MemberFilter[] = ["ALL", "ACTIVE", "EXPIRING", "EXPIRED", "TRIAL", "LEAD"];

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ q?: string; f?: string }> }) {
  const user = await requireUser("/desk/members");
  const sp = await searchParams;
  const filter = (FILTERS.includes(sp.f as MemberFilter) ? sp.f : "ALL") as MemberFilter;
  const { rows, counts } = await listMembers(user.clubId, { q: sp.q, filter });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Front desk"
        title="Members"
        subtitle={`${counts.byStatus.ACTIVE ?? 0} active · ${counts.expiring} expiring in 14 days · ${counts.byStatus.TRIAL ?? 0} on trial`}
        actions={
          <Button render={<Link href="/desk/members/new" />}>
            <UserPlus className="h-4 w-4" /> Register member
          </Button>
        }
      />
      <MembersToolbar q={sp.q ?? ""} filter={filter} counts={{ ...counts.byStatus, EXPIRING: counts.expiring }} />
      <MembersTable rows={rows} />
    </div>
  );
}
