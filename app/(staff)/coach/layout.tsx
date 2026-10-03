import { StaffArea } from "@/components/shared/StaffArea";

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return <StaffArea area="/coach">{children}</StaffArea>;
}
