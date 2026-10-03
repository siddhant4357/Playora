import { StaffArea } from "@/components/shared/StaffArea";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <StaffArea area="/account">{children}</StaffArea>;
}
