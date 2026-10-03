import { StaffArea } from "@/components/shared/StaffArea";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  // We don't pass area="/owner" here because Manager needs access to nested routes 
  // like /owner/hr. The middleware handles precise route-level authorization.
  return <StaffArea area="">{children}</StaffArea>;
}
