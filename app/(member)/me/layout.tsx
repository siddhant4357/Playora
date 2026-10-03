import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getClub } from "@/lib/club";
import { canAccess, homeFor } from "@/lib/roles";
import { MemberShell } from "@/components/member/MemberShell";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=%2Fme");
  if (!canAccess(user.role, "/me")) redirect(`${homeFor(user.role)}?error=forbidden`);

  const club = await getClub(user.clubId);

  return (
    <MemberShell user={user} clubName={club?.name ?? "Playora"}>
      {children}
    </MemberShell>
  );
}
