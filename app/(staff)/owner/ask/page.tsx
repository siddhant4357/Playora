import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { SUGGESTED_QUESTIONS } from "@/lib/ask/labels";
import { PageHeader } from "@/components/shared/Primitives";
import { AskPanel } from "@/components/owner/AskPanel";

export const metadata: Metadata = { title: "Ask AI · Yolla" };

export default async function AskPage() {
  await requireRole("OWNER");
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Owner · Analytics"
        title="Ask the club anything"
        subtitle="Plain-English questions over the ledger, bookings, members, bar, shop and HR. Every answer is a read-only query you can inspect."
      />
      <AskPanel suggestions={SUGGESTED_QUESTIONS} />
    </div>
  );
}
