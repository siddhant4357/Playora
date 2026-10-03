/**
 * app/admin/layout.tsx
 *
 * Admin section layout — wraps admin pages in the dashboard shell.
 * Role check is also enforced in middleware.ts (ADMIN only).
 */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { DashboardShell } from "@/components/shared/DashboardShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user || user.role !== "ADMIN") {
    redirect("/dashboard?error=forbidden");
  }

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
