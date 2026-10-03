import { StaffArea } from "@/components/shared/StaffArea";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return <StaffArea area="/owner">{children}</StaffArea>;
}
