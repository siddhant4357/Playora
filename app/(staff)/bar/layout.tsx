import { StaffArea } from "@/components/shared/StaffArea";

export default function BarLayout({ children }: { children: React.ReactNode }) {
  return <StaffArea area="/bar">{children}</StaffArea>;
}
