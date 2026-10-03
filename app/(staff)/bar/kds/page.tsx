import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/shared/PagePlaceholder";

export const metadata: Metadata = { title: "Kitchen" };

export default function KitchenDisplayPage() {
  return (
    <PagePlaceholder
      title="Kitchen display"
      phase="Phase 3 — Bar & cafeteria"
      description="Tickets arrive the moment the bar sends them. Tap to move NEW → PREPARING → READY → SERVED; timers turn amber at 8 minutes and red at 15."
      bullets={["Large touch targets for a busy kitchen", "Sound on new ticket", "Full-screen mode for a wall-mounted tablet"]}
    />
  );
}
