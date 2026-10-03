import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDefaultClub } from "@/lib/club";
import { getFreeThisWeek } from "@/lib/leads/queries";
import { TrialForm } from "@/components/public/TrialForm";

export const metadata: Metadata = {
  title: "Book a free trial — The Champions Club",
  description: "Pick a free slot this week and play your first session on us. No membership needed.",
};

export default async function TrialPage({ searchParams }: { searchParams: Promise<{ court?: string; at?: string }> }) {
  const club = await getDefaultClub();
  if (!club) notFound();
  const { court, at } = await searchParams;
  const slots = await getFreeThisWeek(club.id, { days: 7, perDay: 60, fromMinute: 6 * 60, dedupeTimes: false });

  return (
    <>
      <nav className="pub-crumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link> <span aria-hidden="true">/</span> <span>Free trial</span>
      </nav>
      <header className="pub-head">
        <span className="eyebrow">First session free</span>
        <h1>Pick a slot. Turn up. Play.</h1>
        <p>
          These are real free slots on the board right now. Booking one holds the court for you — the front desk sees it instantly and
          nobody else can take it.
        </p>
      </header>

      <TrialForm slots={slots} timezone={club.timezone} preselect={court && at ? { courtId: court, startsAt: at } : null} />
    </>
  );
}
