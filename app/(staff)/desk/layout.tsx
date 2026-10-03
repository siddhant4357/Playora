import { StaffArea } from "@/components/shared/StaffArea";

export default function DeskLayout({ children }: { children: React.ReactNode }) {
  return <StaffArea area="/desk">{children}</StaffArea>;
}
