import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, MapPin, Phone } from "lucide-react";
import { getDefaultClub } from "@/lib/club";
import { EnquiryForm } from "@/components/public/EnquiryForm";

export const metadata: Metadata = {
  title: "Contact — The Champions Club",
  description: "Ask about memberships, coaching, events or anything else. The front desk calls back the same day.",
};

export default async function ContactPage() {
  const club = await getDefaultClub();
  if (!club) notFound();

  return (
    <>
      <nav className="pub-crumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link> <span aria-hidden="true">/</span> <span>Contact</span>
      </nav>
      <header className="pub-head">
        <span className="eyebrow">Enquiry</span>
        <h1>Ask us anything. A person calls back.</h1>
        <p>Your message lands on the front desk board the second you send it — nothing gets lost in a WhatsApp thread.</p>
      </header>

      <div className="pub-split">
        <div className="pub-card">
          <EnquiryForm />
        </div>
        <aside className="pub-side">
          <div className="pub-card">
            <h2>{club.name}</h2>
            {club.address && (
              <p className="pub-note" style={{ display: "flex", gap: 8 }}>
                <MapPin size={16} /> {club.address}
              </p>
            )}
            {club.phone && (
              <p className="pub-note" style={{ display: "flex", gap: 8 }}>
                <Phone size={16} /> <a href={`tel:${club.phone}`}>{club.phone}</a>
              </p>
            )}
            <p className="pub-note" style={{ display: "flex", gap: 8 }}>
              <Clock size={16} /> Open daily {club.opensAt}–{club.closesAt}
            </p>
            <Link href="/trial" className="btn btn-outline">
              Or just book a free trial
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
