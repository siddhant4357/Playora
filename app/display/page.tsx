import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/shared/PagePlaceholder";

export const metadata: Metadata = { title: "Court display" };

export default function DisplayPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <PagePlaceholder
        title="Court-side display"
        phase="Phase 9 — Wow features"
        description="A wall TV that shows who is on which court, the next free slot, and tonight's social-play pairings."
      />
    </div>
  );
}
