/**
 * lib/booking/policy.ts
 *
 * Club-level booking policy, read from club.settings (JSON). Defaults match
 * the hackathon brief; the owner can change them from /owner/settings later.
 */

export interface BookingPolicy {
  /** Session length in minutes. */
  sessionMinutes: number;
  /** A new slot starts every N minutes. */
  slotStepMinutes: number;
  /** Walk-ins / members without a plan: how far ahead they may book. */
  defaultAdvanceDays: number;
  /** Walk-ins / members without a plan: sessions per day. */
  defaultMaxPerDay: number;
  /** Cancelling at least this many hours before start returns full credit. */
  cancelFullCreditHours: number;
  /** Credit % returned when cancelling inside the window. */
  cancelLateCreditPct: number;
  /** Minutes a waitlist offer stays open. */
  waitlistOfferMinutes: number;
}

export const DEFAULT_POLICY: BookingPolicy = {
  sessionMinutes: 60,
  slotStepMinutes: 30,
  defaultAdvanceDays: 3,
  defaultMaxPerDay: 2,
  cancelFullCreditHours: 2,
  cancelLateCreditPct: 50,
  waitlistOfferMinutes: 10,
};

export function policyFrom(settings: unknown): BookingPolicy {
  const s = (settings && typeof settings === "object" ? settings : {}) as Record<string, unknown>;
  const booking = (s.booking && typeof s.booking === "object" ? s.booking : {}) as Partial<BookingPolicy>;
  return { ...DEFAULT_POLICY, ...booking };
}

export function creditPctForCancellation(
  startsAt: Date,
  now: Date,
  policy: BookingPolicy
): number {
  const hoursAhead = (startsAt.getTime() - now.getTime()) / 3_600_000;
  if (hoursAhead < 0) return 0;
  return hoursAhead >= policy.cancelFullCreditHours ? 100 : policy.cancelLateCreditPct;
}
