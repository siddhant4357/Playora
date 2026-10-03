/**
 * lib/booking/price.ts
 *
 * Pure pricing: (court pricing bands, member plan, instant) → quote.
 * No DB access so it can be unit-tested and reused by the WhatsApp/voice
 * agents, which must quote the same number the desk sees.
 */

import type { CourtPricing, DayType, MembershipPlan } from "@/generated/prisma/client";
import { isWeekend, toLocalParts } from "@/lib/time";

export interface PriceQuote {
  listPrice: number; // paise
  discountPct: number;
  priceCharged: number; // paise
  bandLabel: string; // "Peak" / "Off-peak"
  reason: string; // human explanation shown in UI and stored on the booking
}

type PlanLike = Pick<MembershipPlan, "name" | "courtDiscountPct"> | null | undefined;
type BandLike = Pick<CourtPricing, "dayType" | "startHour" | "endHour" | "walkInPrice" | "label">;

export function dayTypeFor(startsAt: Date, tz: string): DayType {
  return isWeekend(startsAt, tz) ? "WEEKEND" : "WEEKDAY";
}

export function findBand(bands: BandLike[], startsAt: Date, tz: string): BandLike | null {
  const dayType = dayTypeFor(startsAt, tz);
  const hour = toLocalParts(startsAt, tz).hour;
  return (
    bands.find((b) => b.dayType === dayType && hour >= b.startHour && hour < b.endHour) ??
    bands.find((b) => b.dayType === dayType) ??
    null
  );
}

export function quote(bands: BandLike[], plan: PlanLike, startsAt: Date, tz: string): PriceQuote {
  const band = findBand(bands, startsAt, tz);
  const listPrice = band?.walkInPrice ?? 0;
  const bandLabel = band?.label ?? "Standard";
  const discountPct = Math.min(100, Math.max(0, plan?.courtDiscountPct ?? 0));
  const priceCharged = Math.round((listPrice * (100 - discountPct)) / 100);

  let reason: string;
  if (!plan) reason = `Walk-in ${bandLabel.toLowerCase()} rate`;
  else if (discountPct === 100) reason = `${plan.name} plan — courts included`;
  else if (discountPct > 0) reason = `${plan.name} plan — ${discountPct}% off ${bandLabel.toLowerCase()} rate`;
  else reason = `${plan.name} plan — ${bandLabel.toLowerCase()} rate`;

  return { listPrice, discountPct, priceCharged, bandLabel, reason };
}
