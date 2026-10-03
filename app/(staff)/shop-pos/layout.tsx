import { StaffArea } from "@/components/shared/StaffArea";

export default function ShopPosLayout({ children }: { children: React.ReactNode }) {
  return <StaffArea area="/shop-pos">{children}</StaffArea>;
}
