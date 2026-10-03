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

export const metadata: Metadata = {
  title: "CourtOS — The Champions Club",
  description:
    "Courts, members, bar, shop and the money on one screen. Book a court, join a plan or sign in to run the club.",
};

export default function HomePage() {
  return (
    <div className="landing">
      <Nav />
      <main>
        <Hero />
        <LiveStrip />
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
