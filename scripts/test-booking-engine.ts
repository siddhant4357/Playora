/**
 * scripts/test-booking-engine.ts
 *
 * Integration test for the booking kernel against the real database.
 * Run: set -a && source /vercel/share/.env.project && set +a && npx tsx scripts/test-booking-engine.ts
 *
 * Creates bookings on a far-future day and deletes them afterwards.
 */

import { prisma } from "../lib/db";
import { book, cancel, BookingError } from "../lib/booking/engine";
import { getSlotGrid } from "../lib/booking/slots";
import { addDaysToKey, dayStart, todayKey } from "../lib/time";

let failures = 0;
function check(name: string, ok: boolean, detail?: unknown) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? `  → ${JSON.stringify(detail)}` : ""}`);
  if (!ok) failures++;
}

async function main() {
  const club = await prisma.club.findUniqueOrThrow({ where: { slug: "champions" } });
  const tz = club.timezone;
  const courts = await prisma.court.findMany({ where: { clubId: club.id }, orderBy: { sortOrder: "asc" } });
  const gold = await prisma.member.findUniqueOrThrow({ where: { memberCode: "CC-0001" } });
  const silver = await prisma.member.findUniqueOrThrow({ where: { memberCode: "CC-0002" } });
  const desk = await prisma.user.findUniqueOrThrow({ where: { email: "desk@champions.club" } });

  // Use a weekday evening 2 days out so advance-window checks pass for everyone.
  const dateKey = addDaysToKey(todayKey(tz), 2);
  const base = dayStart(dateKey, tz);
  const at = (h: number, m = 0) => new Date(base.getTime() + (h * 60 + m) * 60_000);
  const court = courts[0];
  const created: string[] = [];

  // 1. Race: two walk-ins, same court, same slot, in parallel → exactly one wins.
  const results = await Promise.allSettled([
    book({ clubId: club.id, courtId: court.id, startsAt: at(18), walkIn: { name: "Racer A" }, source: "FRONT_DESK", createdById: desk.id }),
    book({ clubId: club.id, courtId: court.id, startsAt: at(18), walkIn: { name: "Racer B" }, source: "FRONT_DESK", createdById: desk.id }),
  ]);
  const wins = results.filter((r) => r.status === "fulfilled");
  const losses = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
  check("parallel race → exactly one booking", wins.length === 1 && losses.length === 1);
  check(
    "loser gets SLOT_TAKEN",
    losses[0]?.reason instanceof BookingError && losses[0].reason.code === "SLOT_TAKEN",
    losses[0]?.reason?.message
  );
  if (wins[0]?.status === "fulfilled") created.push(wins[0].value.bookingId);

  // 2. Half-hour overlap is also rejected (18:30 overlaps 18:00–19:00).
  try {
    const r = await book({ clubId: club.id, courtId: court.id, startsAt: at(18, 30), walkIn: { name: "Overlap" }, source: "FRONT_DESK" });
    created.push(r.bookingId);
    check("18:30 overlapping 18:00 rejected", false);
  } catch (e) {
    check("18:30 overlapping 18:00 rejected", e instanceof BookingError && e.code === "SLOT_TAKEN");
  }

  // 3. Gold member pays nothing; Silver pays 50% of peak.
  const g = await book({ clubId: club.id, courtId: court.id, startsAt: at(19), memberId: gold.id, source: "WEB" });
  created.push(g.bookingId);
  check("gold price is free", g.priceCharged === 0, g.priceReason);

  const s = await book({ clubId: club.id, courtId: courts[1].id, startsAt: at(19), memberId: silver.id, source: "WEB" });
  created.push(s.bookingId);
  const band = await prisma.courtPricing.findFirst({ where: { courtId: courts[1].id, dayType: "WEEKDAY", startHour: { lte: 19 }, endHour: { gt: 19 } } });
  const weekendBand = await prisma.courtPricing.findFirst({ where: { courtId: courts[1].id, dayType: "WEEKEND" } });
  const expected = Math.round(((band ?? weekendBand)!.walkInPrice * 50) / 100);
  check("silver pays 50%", s.priceCharged === expected, { charged: s.priceCharged, expected });

  const tx = await prisma.transaction.findFirst({ where: { refId: s.bookingId } });
  check("silver booking has a ledger transaction", !!tx && tx.amount === s.priceCharged && tx.source === "COURT");

  // 4. Daily cap: gold has 2/day → third booking fails.
  const g2 = await book({ clubId: club.id, courtId: courts[2].id, startsAt: at(20), memberId: gold.id, source: "WEB" });
  created.push(g2.bookingId);
  try {
    const g3 = await book({ clubId: club.id, courtId: courts[3].id, startsAt: at(21), memberId: gold.id, source: "WEB" });
    created.push(g3.bookingId);
    check("daily cap enforced", false);
  } catch (e) {
    check("daily cap enforced", e instanceof BookingError && e.code === "DAILY_CAP", (e as Error).message);
  }

  // 5. Misaligned and out-of-hours slots.
  for (const [label, when, code] of [
    ["misaligned :15", at(10, 15), "INVALID_SLOT"],
    ["before opening", at(5), "OUTSIDE_HOURS"],
    ["ends after close", at(22, 30), "OUTSIDE_HOURS"],
  ] as const) {
    try {
      const r = await book({ clubId: club.id, courtId: courts[4].id, startsAt: when, walkIn: { name: "X" }, source: "FRONT_DESK" });
      created.push(r.bookingId);
      check(label, false);
    } catch (e) {
      check(label, e instanceof BookingError && e.code === code, (e as Error).message);
    }
  }

  // 6. Cancel >2h ahead → 100% credit lands on member balance; slot frees up.
  const before = (await prisma.member.findUniqueOrThrow({ where: { id: silver.id } })).creditBalance;
  const c = await cancel({ clubId: club.id, bookingId: s.bookingId, actingMemberId: silver.id, reason: "test" });
  const after = (await prisma.member.findUniqueOrThrow({ where: { id: silver.id } })).creditBalance;
  check("cancel → 100% credit", c.creditPct === 100 && after - before === s.priceCharged, { before, after });

  const rebook = await book({ clubId: club.id, courtId: courts[1].id, startsAt: at(19), walkIn: { name: "After cancel" }, source: "FRONT_DESK" });
  created.push(rebook.bookingId);
  check("cancelled slot is bookable again", true);

  // 7. Grid reflects state.
  const grid = await getSlotGrid({ clubId: club.id, dateKey, viewerMemberId: gold.id, planId: gold.planId, revealNames: true });
  const row = grid.courts.find((r) => r.id === court.id)!;
  const slot18 = row.slots.find((s) => s.label === "6pm")!;
  const slot19 = row.slots.find((s) => s.label === "7pm")!;
  check("grid: 6pm booked with name", slot18.state === "booked" && slot18.booking?.label === "Racer A" || slot18.booking?.label === "Racer B", slot18.booking?.label);
  check("grid: 7pm is mine", slot19.state === "mine");
  check("grid: gold sees free price", slot19.price.priceCharged === 0);
  check("grid: 6:30pm blocked by overlap", row.slots.find((s) => s.label === "6:30pm")!.state === "booked");

  // Cleanup
  await prisma.transaction.deleteMany({ where: { refId: { in: created } } });
  await prisma.booking.deleteMany({ where: { id: { in: created } } });
  await prisma.member.update({ where: { id: silver.id }, data: { creditBalance: before } });
  await prisma.activityLog.deleteMany({ where: { entityId: { in: created } } });

  console.log(failures === 0 ? "\nAll booking-engine checks passed." : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
