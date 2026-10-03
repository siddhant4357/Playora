import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/shared/PagePlaceholder";

export const metadata: Metadata = { title: "Coaching" };

export default function CoachHomePage() {
  return (
    <PagePlaceholder
      title="My sessions"
      phase="Phase 2 — Members"
      description="Your coaching schedule for the week, the players booked into each session, and a quick note after every lesson."
      bullets={["Today's sessions with court and player list", "Mark attendance", "Player progress notes feed Member 360"]}
    />
  );
}
