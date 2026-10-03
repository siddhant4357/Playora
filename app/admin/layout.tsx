/**
 * app/admin/layout.tsx
 *
 * System pages (health, audit). Owner only — enforced by lib/roles.ts via
 * StaffArea and again in middleware.
 */

import { StaffArea } from "@/components/shared/StaffArea";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <StaffArea area="/admin">{children}</StaffArea>;
}
