import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/shared/PagePlaceholder";

export const metadata: Metadata = { title: "Bar POS" };

export default function BarPosPage() {
  return (
    <PagePlaceholder
      title="Bar & cafe POS"
      phase="Phase 3 — Bar & cafeteria"
      description="Table map → open tab → menu by category → send to kitchen. Attach a member to apply their discount and settle the tab to the club ledger."
      bullets={[
        "Open tabs by table, transfer and merge",
        "Split bill by item or by amount",
        "Void with reason — every void is audited",
      ]}
    />
  );
}
