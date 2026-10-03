import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/shared/PagePlaceholder";

export const metadata: Metadata = { title: "Owner dashboard" };

export default function OwnerHomePage() {
  return (
    <PagePlaceholder
      title="Owner dashboard"
      phase="Phase 6 — Owner"
      description="Today, this week, this month — revenue by source and by payment mode, court utilisation, and the handful of alerts worth a phone call."
      bullets={[
        "KPI cards that reconcile with the ledger to the rupee",
        "Revenue by source: courts, memberships, bar, shop",
        "Ask Yolla — plain-English questions over your own data",
      ]}
    />
  );
}
