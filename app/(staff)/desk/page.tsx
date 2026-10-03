import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/shared/PagePlaceholder";

export const metadata: Metadata = { title: "Front desk" };

export default function DeskHomePage() {
  return (
    <PagePlaceholder
      title="Today board"
      phase="Phase 1 — Booking engine"
      description="The front desk home screen: every court across the day, who is checked in right now, and the alerts that need a human."
      bullets={[
        "Courts × slots grid coloured by status, quick-book in a modal",
        "Who's here — live check-ins with plan tags",
        "Alerts: expiring memberships, low stock, new leads",
      ]}
    />
  );
}
