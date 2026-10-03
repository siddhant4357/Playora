/**
 * components/shared/StaffArea.tsx
 *
 * Server wrapper used by every staff-side layout (/desk, /shop-pos, /bar,
 * /coach, /owner, /admin, /account). Verifies the session and role on the
 * server (middleware already did, but layouts must not trust it blindly),
 * loads the club name, and renders the DashboardShell with role-based nav.
 */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getClub } from "@/lib/club";
import { canAccess, homeFor } from "@/lib/roles";
import { DashboardShell } from "@/components/shared/DashboardShell";

interface StaffAreaProps {
  /** Route prefix this layout owns, e.g. "/desk". Used for the role check. */
  area: string;
  children: React.ReactNode;
}

export async function StaffArea({ area, children }: StaffAreaProps) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(area)}`);
  if (!canAccess(user.role, area)) redirect(`${homeFor(user.role)}?error=forbidden`);

  const club = await getClub(user.clubId);

  return (
    <DashboardShell user={user} clubName={club?.name}>
      {children}
    </DashboardShell>
  );
}
