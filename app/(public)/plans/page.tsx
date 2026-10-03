import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { getDefaultClub } from "@/lib/club";
import { getPublicPlans } from "@/lib/leads/queries";
import { formatPaise } from "@/lib/money";

export const metadata: Metadata = {
  title: "Membership plans — The Champions Club",
  description: "Gold, Silver and Junior memberships. Court access, bar and shop discounts, booking windows — one price, decided once.",
};

const WHO: Record<string, string> = {
  GOLD: "Plays most evenings. Wants the court to just be there.",
  SILVER: "Two or three times a week. Wants a fair price and a fast app.",
  JUNIOR: "Under 18. Coaching, social play and a safe place to improve.",
};

export default async function PlansPage() {
  const club = await getDefaultClub();
  if (!club) notFound();
  const plans = await getPublicPlans(club.id);

  return (
    <>
      <nav className="pub-crumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link> <span aria-hidden="true">/</span> <span>Plans</span>
      </nav>
      <header className="pub-head">
        <span className="eyebrow">Membership</span>
        <h1>Three plans. The price is decided once, then it just applies.</h1>
        <p>
          Court price, bar and shop discounts, how far ahead you can book, how many sessions a day. Every rule lives on the plan, and
          the app, the front desk and the bar read the same rule.
        </p>
      </header>

      <div className="plan-grid">
        {plans.map((p) => {
          const hot = p.tier === "SILVER";
          const yearlySaving = p.priceMonthly * 12 - p.priceYearly;
          const perks = [
            p.courtDiscountPct >= 100 ? "Courts included — book and play" : p.courtDiscountPct > 0 ? `${p.courtDiscountPct}% off every court booking` : "Walk-in court rates",
            `Book up to ${p.advanceBookingDays} days ahead`,
            `${p.maxBookingsPerDay} session${p.maxBookingsPerDay === 1 ? "" : "s"} per day`,
            p.barDiscountPct > 0 ? `${p.barDiscountPct}% off at the bar & café` : null,
            p.shopDiscountPct > 0 ? `${p.shopDiscountPct}% off in the pro shop` : null,
            p.guestPassesPerMonth > 0 ? `${p.guestPassesPerMonth} guest pass${p.guestPassesPerMonth === 1 ? "" : "es"} a month` : null,
          ].filter((x): x is string => Boolean(x));

          return (
            <article className={`plan ${hot ? "hot" : ""}`} key={p.id} aria-label={`${p.name} plan`}>
              {hot && <span className="ribbon">Most members</span>}
              <div>
                <h3>{p.name}</h3>
                <p className="who">{WHO[p.tier] ?? ""}</p>
              </div>
              <div className="price">
                <b>{formatPaise(p.priceMonthly)}</b>
                <span>/ month</span>
              </div>
              <p className="pub-note">
                or {formatPaise(p.priceYearly)} a year{yearlySaving > 0 ? ` — save ${formatPaise(yearlySaving)}` : ""}
              </p>
              <ul>
                {perks.map((perk) => (
                  <li key={perk}>
                    <Check size={15} /> <span>{perk}</span>
                  </li>
                ))}
              </ul>
              <Link href={`/register?plan=${p.tier.toLowerCase()}`} className={`btn ${hot ? "btn-primary" : "btn-outline"}`}>
                Join as {p.name}
              </Link>
            </article>
          );
        })}
      </div>

      <p className="plan-note" style={{ marginTop: 20 }}>
        Not sure which? <Link href="/trial">Book a free trial</Link> first, or <Link href="/contact">ask us</Link> and the front desk will
        send a quote the same day.
      </p>
    </>
  );
}
