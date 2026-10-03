import type { Metadata } from "next";
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

export default async function HomePage() {
  const [user, club] = await Promise.all([getCurrentUser(), getDefaultClub()]);
  const slots = club ? await getFreeThisWeek(club.id, { days: 7, perDay: 2 }).catch(() => []) : [];
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
