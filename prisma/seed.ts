/**
 * prisma/seed.ts
 *
 * Idempotent seed for Yolla. Safe to re-run: every row is upserted on a
 * stable natural key (club slug, user email), so demo accounts keep their
 * ids across runs and nothing is deleted.
 *
 * Phase 0 seeds the club and one user per role. Later phases append courts,
 * plans, members, bookings, products, menu, leads and employees here.
 *
 * Demo accounts (password for all: demo1234)
 *   owner@champions.club      OWNER
 *   manager@champions.club    MANAGER
 *   desk@champions.club       FRONT_DESK
 *   bar@champions.club        BAR_STAFF
 *   kitchen@champions.club    KITCHEN
 *   coach@champions.club      COACH
 *   member@champions.club     MEMBER
 *
 * Run with:  pnpm db:seed   (requires DATABASE_URL + applied migrations)
 */

import { PrismaClient, type Role } from "../generated/prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DEMO_PASSWORD = "demo1234";
const CLUB_SLUG = "champions";

const DEMO_USERS: Array<{ email: string; name: string; role: Role; phone: string }> = [
  { email: "owner@champions.club", name: "Rohan Mehta", role: "OWNER", phone: "+91 98200 00001" },
  { email: "manager@champions.club", name: "Priya Nair", role: "MANAGER", phone: "+91 98200 00002" },
  { email: "desk@champions.club", name: "Arjun Shah", role: "FRONT_DESK", phone: "+91 98200 00003" },
  { email: "bar@champions.club", name: "Kavya Iyer", role: "BAR_STAFF", phone: "+91 98200 00004" },
  { email: "kitchen@champions.club", name: "Suresh Pillai", role: "KITCHEN", phone: "+91 98200 00005" },
  { email: "coach@champions.club", name: "Meera Joshi", role: "COACH", phone: "+91 98200 00006" },
  { email: "member@champions.club", name: "Aditya Rao", role: "MEMBER", phone: "+91 98200 00007" },
];

async function seedClub() {
  return prisma.club.upsert({
    where: { slug: CLUB_SLUG },
    update: {
      name: "The Champions Club",
      tagline: "Courts, members, bar and shop on one screen.",
    },
    create: {
      id: "club_champions",
      slug: CLUB_SLUG,
      name: "The Champions Club",
      tagline: "Courts, members, bar and shop on one screen.",
      timezone: "Asia/Kolkata",
      currency: "INR",
      phone: "+91 22 4000 1234",
      email: "hello@champions.club",
      address: "12 Lakeview Road, Powai, Mumbai 400076",
      opensAt: "06:00",
      closesAt: "23:00",
    },
  });
}

async function seedUsers(clubId: string) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const users = [];
  for (const u of DEMO_USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, phone: u.phone, clubId, passwordHash },
      create: { ...u, clubId, passwordHash },
    });
    users.push(user);
  }
  return users;
}

async function seedActivity(clubId: string, ownerId: string) {
  const alreadySeeded = await prisma.activityLog.findFirst({
    where: { clubId, action: "CLUB_SEEDED" },
  });
  if (alreadySeeded) return;

  await prisma.activityLog.create({
    data: {
      action: "CLUB_SEEDED",
      entity: "Club",
      entityId: clubId,
      userId: ownerId,
      clubId,
      newData: { users: DEMO_USERS.length, source: "prisma/seed.ts" },
    },
  });
}

// ───────────────────────── Plans ─────────────────────────

const PLANS = [
  {
    tier: "GOLD" as const,
    name: "Gold",
    priceMonthly: 500000,
    priceYearly: 5000000,
    courtDiscountPct: 100,
    shopDiscountPct: 15,
    barDiscountPct: 15,
    maxBookingsPerDay: 2,
    advanceBookingDays: 14,
    guestPassesPerMonth: 4,
    benefits: ["Courts included", "14-day advance booking", "15% off bar & shop", "4 guest passes / month"],
  },
  {
    tier: "SILVER" as const,
    name: "Silver",
    priceMonthly: 250000,
    priceYearly: 2500000,
    courtDiscountPct: 50,
    shopDiscountPct: 10,
    barDiscountPct: 10,
    maxBookingsPerDay: 2,
    advanceBookingDays: 7,
    guestPassesPerMonth: 2,
    benefits: ["50% off courts", "7-day advance booking", "10% off bar & shop", "2 guest passes / month"],
  },
  {
    tier: "JUNIOR" as const,
    name: "Junior",
    priceMonthly: 120000,
    priceYearly: 1200000,
    courtDiscountPct: 30,
    shopDiscountPct: 5,
    barDiscountPct: 0,
    maxBookingsPerDay: 1,
    advanceBookingDays: 3,
    guestPassesPerMonth: 0,
    benefits: ["30% off courts", "Under-18 only", "Coaching priority"],
  },
];

async function seedPlans(clubId: string) {
  const out = [];
  for (const p of PLANS) {
    out.push(
      await prisma.membershipPlan.upsert({
        where: { clubId_tier: { clubId, tier: p.tier } },
        update: { ...p },
        create: { ...p, clubId },
      })
    );
  }
  return out;
}

// ───────────────────────── Courts + pricing ─────────────────────────

const COURTS = [
  { name: "Court 1", type: "TENNIS" as const, surface: "HARD" as const, isIndoor: false, sortOrder: 1 },
  { name: "Court 2", type: "TENNIS" as const, surface: "HARD" as const, isIndoor: false, sortOrder: 2 },
  { name: "Court 3", type: "TENNIS" as const, surface: "CLAY" as const, isIndoor: false, sortOrder: 3 },
  { name: "Court 4", type: "TENNIS" as const, surface: "SYNTHETIC" as const, isIndoor: true, sortOrder: 4 },
  { name: "Court 5", type: "PADEL" as const, surface: "SYNTHETIC" as const, isIndoor: true, sortOrder: 5 },
  { name: "Court 6", type: "PADEL" as const, surface: "SYNTHETIC" as const, isIndoor: true, sortOrder: 6 },
];

// walk-in prices in paise per 60-min session
const PRICING_BANDS = [
  { dayType: "WEEKDAY" as const, startHour: 6, endHour: 17, walkInPrice: 60000, label: "Off-peak" },
  { dayType: "WEEKDAY" as const, startHour: 17, endHour: 23, walkInPrice: 100000, label: "Peak" },
  { dayType: "WEEKEND" as const, startHour: 6, endHour: 23, walkInPrice: 120000, label: "Weekend" },
];

async function seedCourts(clubId: string) {
  const out = [];
  for (const c of COURTS) {
    const existing = await prisma.court.findFirst({ where: { clubId, name: c.name } });
    const court = existing
      ? await prisma.court.update({ where: { id: existing.id }, data: c })
      : await prisma.court.create({ data: { ...c, clubId } });

    await prisma.courtPricing.deleteMany({ where: { courtId: court.id } });
    const padelBump = c.type === "PADEL" ? 1.2 : 1;
    await prisma.courtPricing.createMany({
      data: PRICING_BANDS.map((b) => ({
        ...b,
        courtId: court.id,
        walkInPrice: Math.round(b.walkInPrice * padelBump),
      })),
    });
    out.push(court);
  }
  return out;
}

// ───────────────────────── Members ─────────────────────────

const MEMBERS: Array<{
  code: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  tier: "GOLD" | "SILVER" | "JUNIOR" | null;
  status: "ACTIVE" | "EXPIRED" | "TRIAL" | "LEAD";
  skill: number;
  daysLeft: number;
}> = [
  { code: "CC-0001", firstName: "Aditya", lastName: "Rao", phone: "+91 98200 00007", email: "member@champions.club", tier: "GOLD", status: "ACTIVE", skill: 4, daysLeft: 200 },
  { code: "CC-0002", firstName: "Neha", lastName: "Kulkarni", phone: "+91 98200 00101", tier: "SILVER", status: "ACTIVE", skill: 3, daysLeft: 45 },
  { code: "CC-0003", firstName: "Vikram", lastName: "Desai", phone: "+91 98200 00102", tier: "GOLD", status: "ACTIVE", skill: 5, daysLeft: 5 },
  { code: "CC-0004", firstName: "Ananya", lastName: "Bhatt", phone: "+91 98200 00103", tier: "JUNIOR", status: "ACTIVE", skill: 2, daysLeft: 90 },
  { code: "CC-0005", firstName: "Rahul", lastName: "Menon", phone: "+91 98200 00104", tier: "SILVER", status: "EXPIRED", skill: 3, daysLeft: -12 },
  { code: "CC-0006", firstName: "Sanya", lastName: "Kapoor", phone: "+91 98200 00105", tier: "SILVER", status: "ACTIVE", skill: 4, daysLeft: 2 },
  { code: "CC-0007", firstName: "Imran", lastName: "Sheikh", phone: "+91 98200 00106", tier: "GOLD", status: "ACTIVE", skill: 3, daysLeft: 300 },
  { code: "CC-0008", firstName: "Pooja", lastName: "Verma", phone: "+91 98200 00107", tier: null, status: "TRIAL", skill: 2, daysLeft: 7 },
  { code: "CC-0009", firstName: "Karan", lastName: "Malhotra", phone: "+91 98200 00108", tier: null, status: "LEAD", skill: 3, daysLeft: 0 },
  { code: "CC-0010", firstName: "Divya", lastName: "Sundaram", phone: "+91 98200 00109", tier: "SILVER", status: "ACTIVE", skill: 5, daysLeft: 120 },
];

async function seedMembers(clubId: string, plans: { id: string; tier: string }[]) {
  const now = new Date();
  const out = [];
  for (const m of MEMBERS) {
    const plan = m.tier ? plans.find((p) => p.tier === m.tier) : null;
    const expiry = new Date(now.getTime() + m.daysLeft * 86_400_000);
    const start = new Date(expiry.getTime() - 365 * 86_400_000);
    const data = {
      clubId,
      firstName: m.firstName,
      lastName: m.lastName,
      phone: m.phone,
      email: m.email ?? null,
      status: m.status,
      planId: plan?.id ?? null,
      startDate: plan ? start : null,
      expiryDate: plan ? expiry : null,
      skillRating: m.skill,
    };
    out.push(
      await prisma.member.upsert({
        where: { memberCode: m.code },
        update: data,
        create: { ...data, memberCode: m.code },
      })
    );
  }
  return out;
}

async function main() {
  console.log("Seeding Yolla…");

  const club = await seedClub();
  console.log(`  club    ${club.name} (${club.slug})`);

  const users = await seedUsers(club.id);
  for (const u of users) console.log(`  user    ${u.role.padEnd(10)} ${u.email}`);

  const plans = await seedPlans(club.id);
  console.log(`  plans   ${plans.map((p) => p.name).join(", ")}`);

  const courts = await seedCourts(club.id);
  console.log(`  courts  ${courts.length} with pricing bands`);

  const members = await seedMembers(club.id, plans);
  console.log(`  members ${members.length}`);

  // Link the demo MEMBER login to its contact record.
  const memberUser = users.find((u) => u.role === "MEMBER")!;
  const aditya = members.find((m) => m.memberCode === "CC-0001")!;
  await prisma.user.update({ where: { id: memberUser.id }, data: { memberId: aditya.id } });

  const owner = users.find((u) => u.role === "OWNER")!;
  await seedActivity(club.id, owner.id);

  console.log("\nDone. All demo accounts use the password: demo1234");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
