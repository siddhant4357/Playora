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

// ───────────────────────── Products (shop + bar menu) ─────────────────────────

type Cat = "RACKET" | "BALL" | "SHOES" | "ACCESSORY" | "APPAREL" | "SERVICE" | "FOOD" | "BEVERAGE";
const PRODUCTS: Array<{
  sku: string; name: string; category: Cat; price: number; costPrice?: number; stock: number;
  bar?: boolean; shop?: boolean; service?: boolean; track?: boolean; lowAt?: number; description?: string;
}> = [
  // Shop
  { sku: "RKT-WPS97", name: "Wilson Pro Staff 97", category: "RACKET", price: 2199900, costPrice: 1650000, stock: 3, lowAt: 2, description: "Tour-grade control racket. 315g unstrung." },
  { sku: "RKT-BPD", name: "Babolat Pure Drive", category: "RACKET", price: 1899900, costPrice: 1400000, stock: 6, lowAt: 2, description: "Power and spin for all-court players." },
  { sku: "RKT-HSP", name: "Head Speed MP", category: "RACKET", price: 1999900, costPrice: 1500000, stock: 0, lowAt: 2, description: "Fast, precise, built for modern baseline play." },
  { sku: "PDL-BUL", name: "Bullpadel Vertex 04", category: "RACKET", price: 2499900, costPrice: 1800000, stock: 4, lowAt: 2, description: "Diamond-shaped padel racket for attacking play." },
  { sku: "BAL-WUS4", name: "Wilson US Open balls (4)", category: "BALL", price: 89900, costPrice: 60000, stock: 42, lowAt: 12 },
  { sku: "BAL-HPD3", name: "Head Padel Pro balls (3)", category: "BALL", price: 69900, costPrice: 45000, stock: 18, lowAt: 10 },
  { sku: "SHO-AGC", name: "Asics Gel-Resolution 9", category: "SHOES", price: 1299900, costPrice: 900000, stock: 5, lowAt: 2 },
  { sku: "ACC-GRIP", name: "Overgrip (3 pack)", category: "ACCESSORY", price: 49900, costPrice: 25000, stock: 60, lowAt: 20 },
  { sku: "ACC-DAMP", name: "Vibration dampener", category: "ACCESSORY", price: 19900, costPrice: 8000, stock: 2, lowAt: 10 },
  { sku: "ACC-WRST", name: "Wristband pair", category: "ACCESSORY", price: 39900, costPrice: 15000, stock: 25, lowAt: 8 },
  { sku: "APP-TEE", name: "Champions Club tee", category: "APPAREL", price: 149900, costPrice: 60000, stock: 30, lowAt: 8 },
  { sku: "APP-CAP", name: "Champions Club cap", category: "APPAREL", price: 99900, costPrice: 40000, stock: 14, lowAt: 5 },
  { sku: "SVC-RESTR", name: "Racket restringing", category: "SERVICE", price: 120000, service: true, track: false, stock: 0, description: "Includes Luxilon or Babolat string. 24h turnaround." },
  { sku: "SVC-GRIP", name: "Regrip service", category: "SERVICE", price: 30000, service: true, track: false, stock: 0 },
  // Bar — beverages (served at bar, no kitchen ticket)
  { sku: "BEV-ESP", name: "Espresso", category: "BEVERAGE", price: 15000, costPrice: 3000, stock: 200, bar: true, shop: false, lowAt: 20 },
  { sku: "BEV-CAP", name: "Cappuccino", category: "BEVERAGE", price: 22000, costPrice: 5000, stock: 200, bar: true, shop: false, lowAt: 20 },
  { sku: "BEV-CLD", name: "Cold coffee", category: "BEVERAGE", price: 25000, costPrice: 6000, stock: 200, bar: true, shop: false, lowAt: 20 },
  { sku: "BEV-LIME", name: "Fresh lime soda", category: "BEVERAGE", price: 12000, costPrice: 2500, stock: 200, bar: true, shop: false, lowAt: 20 },
  { sku: "BEV-WATER", name: "Mineral water 1L", category: "BEVERAGE", price: 5000, costPrice: 1800, stock: 48, bar: true, shop: true, lowAt: 24 },
  { sku: "BEV-ISO", name: "Isotonic drink", category: "BEVERAGE", price: 9000, costPrice: 4000, stock: 36, bar: true, shop: true, lowAt: 12 },
  { sku: "BEV-SHAKE", name: "Protein shake", category: "BEVERAGE", price: 28000, costPrice: 9000, stock: 200, bar: true, shop: false, lowAt: 20 },
  { sku: "BEV-BEER", name: "Craft beer 330ml", category: "BEVERAGE", price: 35000, costPrice: 14000, stock: 72, bar: true, shop: false, lowAt: 24 },
  // Bar — food (kitchen ticket)
  { sku: "FOOD-CLUB", name: "Club sandwich", category: "FOOD", price: 32000, costPrice: 11000, stock: 200, bar: true, shop: false, lowAt: 20 },
  { sku: "FOOD-PANEER", name: "Paneer tikka wrap", category: "FOOD", price: 28000, costPrice: 9000, stock: 200, bar: true, shop: false, lowAt: 20 },
  { sku: "FOOD-FRIES", name: "Peri-peri fries", category: "FOOD", price: 18000, costPrice: 5000, stock: 200, bar: true, shop: false, lowAt: 20 },
  { sku: "FOOD-BOWL", name: "Grilled chicken bowl", category: "FOOD", price: 42000, costPrice: 16000, stock: 200, bar: true, shop: false, lowAt: 20 },
  { sku: "FOOD-SALAD", name: "Quinoa salad", category: "FOOD", price: 30000, costPrice: 10000, stock: 200, bar: true, shop: false, lowAt: 20 },
  { sku: "FOOD-BROWN", name: "Brownie", category: "FOOD", price: 16000, costPrice: 4500, stock: 200, bar: true, shop: false, lowAt: 20 },
];

async function seedProducts(clubId: string) {
  const out = [];
  for (const p of PRODUCTS) {
    const data = {
      clubId,
      name: p.name,
      description: p.description ?? null,
      category: p.category,
      price: p.price,
      costPrice: p.costPrice ?? null,
      taxRatePct: p.category === "FOOD" || p.category === "BEVERAGE" ? 5 : 18,
      isForBar: p.bar ?? false,
      isForShop: p.shop ?? true,
      isService: p.service ?? false,
      trackStock: p.track ?? true,
      lowStockAt: p.lowAt ?? 5,
    };
    const existing = await prisma.product.findUnique({ where: { sku: p.sku } });
    if (existing) {
      out.push(await prisma.product.update({ where: { sku: p.sku }, data }));
    } else {
      const created = await prisma.product.create({ data: { ...data, sku: p.sku, stockQty: p.stock } });
      if (p.stock > 0) {
        await prisma.stockMovement.create({
          data: { clubId, productId: created.id, delta: p.stock, reason: "RESTOCK", note: "Opening stock" },
        });
      }
      out.push(created);
    }
  }
  return out;
}

// ───────────────────────── Bar tables ─────────────────────────

const TABLES = [
  ...[1, 2, 3, 4].map((n) => ({ name: `T${n}`, zone: "Indoor", seats: 4, sortOrder: n })),
  ...[1, 2, 3].map((n) => ({ name: `P${n}`, zone: "Patio", seats: 6, sortOrder: 10 + n })),
  ...[1, 2].map((n) => ({ name: `C${n}`, zone: "Court-side", seats: 2, sortOrder: 20 + n })),
];

async function seedTables(clubId: string) {
  const out = [];
  for (const t of TABLES) {
    const existing = await prisma.barTable.findFirst({ where: { clubId, name: t.name } });
    out.push(
      existing
        ? await prisma.barTable.update({ where: { id: existing.id }, data: t })
        : await prisma.barTable.create({ data: { ...t, clubId } })
    );
  }
  return out;
}

// ───────────────────────── Leads ─────────────────────────

const LEADS = [
  { name: "Rohan Iyer", phone: "+91 98200 00201", email: "rohan@example.com", interest: "Tennis", source: "WEBSITE", stage: "NEW" as const, message: "Looking for weekend coaching for myself and my son.", daysAgo: 0 },
  { name: "Meera Nair", phone: "+91 98200 00202", interest: "Padel", source: "INSTAGRAM", stage: "NEW" as const, message: "Saw your padel courts on Instagram. Do you do beginner sessions?", daysAgo: 1 },
  { name: "Arjun Patel", phone: "+91 98200 00203", email: "arjun.p@example.com", interest: "Membership", source: "WALK_IN", stage: "CONTACTED" as const, daysAgo: 3, followUpIn: 1 },
  { name: "Shruti Jain", phone: "+91 98200 00204", interest: "Coaching", source: "REFERRAL", stage: "QUOTE_SENT" as const, daysAgo: 5, followUpIn: 0, quote: "SILVER" },
  { name: "Dev Chawla", phone: "+91 98200 00205", email: "dev.c@example.com", interest: "Tennis", source: "WEBSITE", stage: "TRIAL_BOOKED" as const, daysAgo: 7, followUpIn: 2 },
  { name: "Lakshmi Rao", phone: "+91 98200 00206", interest: "Padel", source: "WHATSAPP", stage: "LOST" as const, daysAgo: 14, lostReason: "Joined a club closer to home" },
];

async function seedLeads(clubId: string, plans: { id: string; tier: string; priceMonthly: number }[], userId: string) {
  const now = Date.now();
  for (const l of LEADS) {
    const existing = await prisma.lead.findFirst({ where: { clubId, phone: l.phone } });
    if (existing) continue;
    const plan = l.quote ? plans.find((p) => p.tier === l.quote) : null;
    const lead = await prisma.lead.create({
      data: {
        clubId,
        name: l.name,
        phone: l.phone,
        email: l.email ?? null,
        interest: l.interest,
        source: l.source,
        stage: l.stage,
        message: l.message ?? null,
        lostReason: l.lostReason ?? null,
        nextFollowUp: l.followUpIn != null ? new Date(now + l.followUpIn * 86_400_000) : null,
        quotePlanId: plan?.id ?? null,
        quoteBilling: plan ? "MONTHLY" : null,
        quoteAmount: plan?.priceMonthly ?? null,
        quoteSentAt: plan ? new Date(now - 2 * 86_400_000) : null,
        createdAt: new Date(now - l.daysAgo * 86_400_000),
      },
    });
    await prisma.leadActivity.create({
      data: { leadId: lead.id, type: "NOTE", content: `Lead captured via ${l.source.toLowerCase().replace("_", "-")}.`, byUserId: userId },
    });
  }
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

  const products = await seedProducts(club.id);
  console.log(`  products ${products.length} (shop + bar menu)`);

  const tables = await seedTables(club.id);
  console.log(`  tables  ${tables.length}`);

  const owner = users.find((u) => u.role === "OWNER")!;
  await seedLeads(club.id, plans, owner.id);
  console.log(`  leads   ${LEADS.length}`);

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
