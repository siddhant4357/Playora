/**
 * app/(dashboard)/layout.tsx
 *
 * Dashboard shell — sidebar + topbar + Cmd+K palette.
 * This layout wraps all protected routes.
 * getCurrentUser() is safe here because middleware already verified the session.
 */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { DashboardShell } from "@/components/shared/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Extra safety — middleware should have redirected, but guard here too
  if (!user) {
    redirect("/login");
  }

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
