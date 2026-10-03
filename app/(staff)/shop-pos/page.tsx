import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/shared/PagePlaceholder";

export const metadata: Metadata = { title: "Counter sale" };

export default function ShopPosPage() {
  return (
    <PagePlaceholder
      title="Counter sale"
      phase="Phase 4 — Shop & inventory"
      description="Sell shuttles, grips and restrings at the counter. Attach a member and their plan discount applies itself; stock moves on the same row the online shop reads."
      bullets={[
        "Search or scan, cart, pay cash / card / UPI",
        "Attach member → discount badge → one ledger entry",
        "Receipt by WhatsApp or print",
      ]}
    />
  );
}
