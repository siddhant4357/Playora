import { StaffArea } from "@/components/shared/StaffArea";

export default function BarLayout({ children }: { children: React.ReactNode }) {
  // We don't pass area="/bar" here because KITCHEN needs access to nested routes 
  // like /bar/kds, even though they can't access the rest of /bar.
  return <StaffArea area="">{children}</StaffArea>;
}
