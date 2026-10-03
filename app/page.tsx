import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import "./landing.css";
import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { LiveStrip } from "@/components/landing/LiveStrip";
import { Scenes } from "@/components/landing/Scenes";
import { Plans } from "@/components/landing/Plans";
import { Modules } from "@/components/landing/Modules";
import { Owner } from "@/components/landing/Owner";
import { Cta, Shift } from "@/components/landing/Shift";
import { Footer } from "@/components/landing/Footer";
import { Reveal } from "@/components/landing/Reveal";
import { getCurrentUser } from "@/lib/auth";
import { homeFor } from "@/lib/roles";
import { getDefaultClub } from "@/lib/club";
import { getFreeThisWeek } from "@/lib/leads/queries";

export const metadata: Metadata = {
  title: "Playora — The Champions Club",
  description:
    "Courts, members, bar, shop and the money on one screen. Book a court, join a plan or sign in to run the club.",
};

// The live strip is marketing, not a booking surface: a 60 s stale window is
// fine and keeps the landing page off the hot DB path. Booking actions call
// revalidatePath("/") so a fresh booking still drops a slot immediately.
const getLandingSlots = unstable_cache(
  async (clubId: string) => getFreeThisWeek(clubId, { days: 7, perDay: 2 }).catch(() => []),
  ["landing-free-slots"],
  { revalidate: 60 },
);

export default async function HomePage() {
  const [user, club] = await Promise.all([getCurrentUser(), getDefaultClub()]);
  const slots = club ? await getLandingSlots(club.id) : [];
  return (
    <div className="landing">
      <Nav appHref={user ? homeFor(user.role) : null} />
      <main>
        <Hero />
        <LiveStrip slots={slots.slice(0, 10)} />
        <Scenes />
        <Plans />
        <Modules />
        <Owner />
        <Shift />
        <Cta />
      </main>
      <Footer />
      <Reveal />
    </div>
  );
}
