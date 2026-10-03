/**
 * prisma/seed.ts
 *
 * Idempotent seed for Playora. Safe to re-run: every row is upserted on a
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

import { PrismaClient, type Prisma, type Role, type TxSource } from "../generated/prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { localToUtc, toLocalParts } from "../lib/time";

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

/** SKUs that have a catalogue image in public/products/<sku>.png */
const PRODUCT_IMAGES = new Set([
  "RKT-WPS97", "RKT-BPD", "RKT-HSP", "PDL-BUL", "BAL-WUS4", "BAL-HPD3", "SHO-AGC",
  "ACC-GRIP", "ACC-DAMP", "ACC-WRST", "APP-TEE", "APP-CAP", "BEV-WATER", "BEV-ISO",
]);

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
      imageUrl: PRODUCT_IMAGES.has(p.sku) ? `/products/${p.sku.toLowerCase()}.png` : null,
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

// ───────────────────────── Finance (history, invoices, payables) ─────────────────────────

/** Deterministic pseudo-random so re-seeds are stable. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

function splitTax(gross: number, ratePct: number) {
  const net = Math.round((gross * 100) / (100 + ratePct));
  return gross - net;
}

/**
 * Six weeks of back-dated ledger rows so the owner dashboard has a real
 * trend line on first open. Rows are tagged refType="SeedHistory" so this
 * stays idempotent and is easy to tell apart from engine-posted rows.
 */
async function seedLedgerHistory(clubId: string, tz: string, courts: { id: string; name: string }[], members: { id: string; firstName: string; lastName: string }[], userId: string) {
  const existing = await prisma.transaction.count({ where: { clubId, refType: "SeedHistory" } });
  if (existing > 0) return existing;

  const rand = rng(20261003);
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
  const modes = ["UPI", "UPI", "UPI", "CARD", "CASH", "ONLINE"] as const;
  const rows: Prisma.TransactionCreateManyInput[] = [];
  const now = new Date();

  // Court sessions become real COMPLETED bookings so utilisation and the
  // heatmap reflect the same history as the ledger.
  const courtTxns: Prisma.TransactionCreateManyInput[] = [];
  const courtSlots: { courtId: string; startsAt: Date; memberId: string | null; walkInName: string | null; gross: number }[] = [];
  for (let d = 42; d >= 1; d--) {
    const day = new Date(now.getTime() - d * 86_400_000);
    const local = toLocalParts(day, tz);
    const weekend = [0, 6].includes(local.weekday);
    const bump = weekend ? 1.6 : 1;

    for (const court of courts) {
      for (let hour = 6; hour < 23; hour++) {
        const evening = hour >= 17 && hour <= 21;
        const morning = hour >= 7 && hour <= 10;
        const p = evening ? 0.7 : weekend && morning ? 0.55 : morning ? 0.3 : 0.18;
        if (rand() >= p) continue;
        const gross = evening ? pick([100000, 120000, 150000]) : pick([60000, 80000, 100000]);
        const member = rand() < 0.65 ? pick(members) : null;
        const startsAt = localToUtc(tz, local.year, local.month, local.day, hour);
        courtSlots.push({ courtId: court.id, startsAt, memberId: member?.id ?? null, walkInName: member ? null : pick(["Walk-in", "Guest", "Drop-in"]), gross });
        courtTxns.push({ clubId, source: "COURT", direction: "IN", amount: gross, tax: splitTax(gross, 18), paymentMode: pick(modes), memberId: member?.id ?? null, refType: "SeedHistory", description: `Court booking · ${court.name}`, byUserId: userId, createdAt: startsAt });
      }
    }

    const barTabs = Math.round((5 + rand() * 7) * bump);
    for (let i = 0; i < barTabs; i++) {
      const gross = 15000 + Math.round(rand() * 120000);
      rows.push({ clubId, source: "BAR", direction: "IN", amount: gross, tax: splitTax(gross, 5), paymentMode: pick(modes), memberId: rand() < 0.5 ? pick(members).id : null, refType: "SeedHistory", description: "Bar tab settled", byUserId: userId, createdAt: new Date(day.getTime() + (11 + Math.floor(rand() * 11)) * 3_600_000) });
    }

    const shopSales = Math.round(rand() * 3 * bump);
    for (let i = 0; i < shopSales; i++) {
      const gross = pick([35000, 89900, 249900, 599900, 1299900]);
      rows.push({ clubId, source: "SHOP", direction: "IN", amount: gross, tax: splitTax(gross, gross >= 100000 ? 18 : 12), paymentMode: pick(modes), memberId: rand() < 0.5 ? pick(members).id : null, refType: "SeedHistory", description: "Pro shop sale", byUserId: userId, createdAt: new Date(day.getTime() + (10 + Math.floor(rand() * 10)) * 3_600_000) });
    }

    if (rand() < 0.25) {
      const gross = pick([299900, 599900, 1199900]);
      rows.push({ clubId, source: "MEMBERSHIP", direction: "IN", amount: gross, tax: splitTax(gross, 18), paymentMode: pick(["UPI", "CARD", "ONLINE"] as const), memberId: pick(members).id, refType: "SeedHistory", description: "Membership renewal", byUserId: userId, createdAt: new Date(day.getTime() + 12 * 3_600_000) });
    }
    if (rand() < 0.15) {
      const gross = pick([150000, 250000, 400000]);
      rows.push({ clubId, source: "COACHING", direction: "IN", amount: gross, tax: splitTax(gross, 18), paymentMode: pick(modes), memberId: pick(members).id, refType: "SeedHistory", description: "Coaching package", byUserId: userId, createdAt: new Date(day.getTime() + 16 * 3_600_000) });
    }
  }

  // Outgoings: weekly supplier runs, one payroll, one corporate booking in.
  for (let w = 6; w >= 1; w--) {
    const day = new Date(now.getTime() - w * 7 * 86_400_000);
    rows.push({ clubId, source: "SUPPLIER", direction: "OUT", amount: 180000 + Math.round(rand() * 120000), tax: 0, paymentMode: "ONLINE", refType: "SeedHistory", description: "Supplier bill · Beverages & kitchen", byUserId: userId, createdAt: day });
  }
  const payday = new Date(now.getFullYear(), now.getMonth() - 1, 1, 10);
  rows.push({ clubId, source: "PAYROLL", direction: "OUT", amount: 32500000, tax: 0, paymentMode: "ONLINE", refType: "SeedHistory", description: "Salaries · month before last", byUserId: userId, createdAt: payday });
  rows.push({ clubId, source: "CORPORATE", direction: "IN", amount: 4500000, tax: splitTax(4500000, 18), paymentMode: "ONLINE", refType: "SeedHistory", description: "Corporate tournament · Infotech Ltd", byUserId: userId, createdAt: new Date(now.getTime() - 10 * 86_400_000) });

  await prisma.transaction.createMany({ data: rows });

  const created = await prisma.transaction.createManyAndReturn({ data: courtTxns, select: { id: true } });
  await prisma.booking.createMany({
    data: courtSlots.map((s, i) => ({
      clubId,
      courtId: s.courtId,
      memberId: s.memberId,
      walkInName: s.walkInName,
      startsAt: s.startsAt,
      endsAt: new Date(s.startsAt.getTime() + 3_600_000),
      kind: "PRIVATE" as const,
      status: "COMPLETED" as const,
      source: s.memberId ? ("APP" as const) : ("FRONT_DESK" as const),
      listPrice: s.gross,
      priceCharged: s.gross,
      priceReason: "Seed history",
      transactionId: created[i].id,
      checkedInAt: s.startsAt,
      createdById: userId,
      createdAt: new Date(s.startsAt.getTime() - 86_400_000),
    })),
  });
  return rows.length + courtTxns.length;
}

async function seedInvoices(clubId: string, members: { id: string; firstName: string; lastName: string; email: string | null; phone: string }[], userId: string) {
  const count = await prisma.invoice.count({ where: { clubId } });
  if (count > 0) return count;
  const now = Date.now();
  const stamp = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
  const specs = [
    { kind: "CORPORATE" as const, billToName: "Infotech Ltd", billToEmail: "accounts@infotech.example", billToGstin: "27AABCI1234F1Z5", billToAddress: "Hiranandani Gardens, Powai, Mumbai 400076", daysAgo: 3, dueIn: 15, status: "ISSUED" as const, items: [{ description: "Corporate tournament · 4 courts × 6 hrs", qty: 24, unitPrice: 150000, taxRatePct: 18 }, { description: "Catering · 60 covers", qty: 60, unitPrice: 45000, taxRatePct: 5 }] },
    { kind: "MEMBERSHIP" as const, member: members[1], daysAgo: 20, dueIn: 7, status: "ISSUED" as const, items: [{ description: "Gold membership · quarterly", qty: 1, unitPrice: 1499900, taxRatePct: 18 }] },
    { kind: "MEMBERSHIP" as const, member: members[2], daysAgo: 12, dueIn: 7, status: "PAID" as const, items: [{ description: "Silver membership · monthly", qty: 1, unitPrice: 599900, taxRatePct: 18 }] },
    { kind: "OTHER" as const, billToName: "Powai Padel League", billToEmail: "hello@ppl.example", daysAgo: 30, dueIn: 10, status: "PAID" as const, items: [{ description: "Court block · league nights (Sept)", qty: 8, unitPrice: 240000, taxRatePct: 18 }] },
  ];
  for (const s of specs) {
    const items = s.items.map((l, i) => ({ ...l, amount: l.qty * l.unitPrice, tax: Math.round((l.qty * l.unitPrice * l.taxRatePct) / 100), sortOrder: i }));
    const subtotal = items.reduce((a, l) => a + l.amount, 0);
    const tax = items.reduce((a, l) => a + l.tax, 0);
    const issueDate = new Date(now - s.daysAgo * 86_400_000);
    const created = await prisma.invoice.create({
      data: {
        clubId,
        invoiceNo: `TMP-${Math.random()}`,
        kind: s.kind,
        memberId: s.member?.id ?? null,
        billToName: s.member ? `${s.member.firstName} ${s.member.lastName}` : s.billToName!,
        billToEmail: s.member?.email ?? s.billToEmail ?? null,
        billToPhone: s.member?.phone ?? null,
        billToAddress: s.billToAddress ?? null,
        billToGstin: s.billToGstin ?? null,
        issueDate,
        dueDate: new Date(issueDate.getTime() + s.dueIn * 86_400_000),
        subtotal,
        tax,
        total: subtotal + tax,
        createdById: userId,
        items: { create: items },
      },
    });
    const invoiceNo = `INV-${stamp(issueDate)}-${String(created.hashId).padStart(4, "0")}`;
    if (s.status === "PAID") {
      const paidAt = new Date(issueDate.getTime() + 2 * 86_400_000);
      const source: TxSource = s.kind === "MEMBERSHIP" ? "MEMBERSHIP" : "OTHER";
      const txn = await prisma.transaction.create({ data: { clubId, source, direction: "IN", amount: subtotal + tax, tax, paymentMode: "ONLINE", memberId: s.member?.id ?? null, refType: "Invoice", refId: created.id, description: `Invoice ${invoiceNo} · ${s.member ? `${s.member.firstName} ${s.member.lastName}` : s.billToName}`, byUserId: userId, createdAt: paidAt } });
      await prisma.invoice.update({ where: { id: created.id }, data: { invoiceNo, status: "PAID", paidAt, paymentMode: "ONLINE", transactionId: txn.id } });
    } else {
      await prisma.invoice.update({ where: { id: created.id }, data: { invoiceNo } });
    }
  }
  return specs.length;
}

async function seedPayables(clubId: string, userId: string) {
  const count = await prisma.payable.count({ where: { clubId } });
  if (count > 0) return count;
  const now = Date.now();
  const d = (days: number) => new Date(now + days * 86_400_000);
  await prisma.payable.createMany({
    data: [
      { clubId, kind: "SUPPLIER", payee: "Bisleri Distributors", description: "Water & soft drinks · weekly", reference: "BD/2026/0912", amount: 184000, dueDate: d(-2), createdById: userId },
      { clubId, kind: "SUPPLIER", payee: "Yonex India", description: "Shuttlecocks + grips restock", reference: "YX-44821", amount: 1263000, dueDate: d(4), createdById: userId },
      { clubId, kind: "SUPPLIER", payee: "Fresh Farm Produce", description: "Kitchen produce · fortnight", reference: "FFP-1107", amount: 421500, dueDate: d(6), createdById: userId },
      { clubId, kind: "SALARY", payee: "Staff payroll", description: "Salaries · current month", reference: "PAYROLL-OCT", amount: 32500000, dueDate: d(12), createdById: userId },
      { clubId, kind: "TAX", payee: "GSTN", description: "GSTR-3B · previous month", reference: "GSTR3B-SEP", amount: 2184000, dueDate: d(17), createdById: userId },
      { clubId, kind: "OTHER", payee: "Adani Electricity", description: "Electricity · floodlights & AC", reference: "AEML-7731", amount: 1875000, dueDate: d(9), createdById: userId },
    ],
  });
  return 6;
}

// ───────────────────────── HR (employees, rota, attendance, leave) ─────────────────────────

const STAFF_PROFILES: Record<string, { designation: string; department: string; employmentType: "FULL_TIME" | "PART_TIME" | "CONTRACT"; salary: number; hourlyRate?: number }> = {
  OWNER: { designation: "Owner", department: "Management", employmentType: "FULL_TIME", salary: 0 },
  MANAGER: { designation: "Club manager", department: "Management", employmentType: "FULL_TIME", salary: 6500000 },
  FRONT_DESK: { designation: "Front desk executive", department: "Front desk", employmentType: "FULL_TIME", salary: 2800000 },
  BAR_STAFF: { designation: "Bartender", department: "Bar", employmentType: "FULL_TIME", salary: 2400000 },
  KITCHEN: { designation: "Line cook", department: "Kitchen", employmentType: "PART_TIME", salary: 1800000, hourlyRate: 15000 },
  COACH: { designation: "Head coach · Badminton", department: "Coaching", employmentType: "CONTRACT", salary: 5500000 },
};

async function seedHr(clubId: string, tz: string, users: { id: string; role: Role }[]) {
  const existing = await prisma.employee.count({ where: { clubId } });
  if (existing > 0) return existing;

  const rand = rng(777);
  const now = new Date();
  const todayParts = toLocalParts(now, tz);
  const today = `${todayParts.year}-${String(todayParts.month).padStart(2, "0")}-${String(todayParts.day).padStart(2, "0")}`;
  const dayKey = (offset: number) => {
    const d = new Date(`${today}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + offset);
    return d.toISOString().slice(0, 10);
  };

  const staff = users.filter((u) => u.role !== "MEMBER" && u.role !== "OWNER");
  const employees = [];
  let n = 1;
  for (const u of staff) {
    const p = STAFF_PROFILES[u.role];
    employees.push(
      await prisma.employee.create({
        data: {
          clubId,
          userId: u.id,
          employeeNo: `EMP-${String(n++).padStart(3, "0")}`,
          designation: p.designation,
          department: p.department,
          employmentType: p.employmentType,
          joinedOn: new Date(now.getFullYear() - 1, (n * 2) % 12, 1),
          monthlySalary: p.salary,
          hourlyRate: p.hourlyRate ?? null,
          leaveBalance: 8 + Math.floor(rand() * 5),
        },
      }),
    );
  }

  // Rota: last 5 weeks + next week. Attendance only for past days.
  const shiftFor = (dept: string): { start: number; end: number; area: string } => {
    switch (dept) {
      case "Bar":
        return { start: 15 * 60, end: 23 * 60, area: "Bar" };
      case "Kitchen":
        return { start: 16 * 60, end: 22 * 60 + 30, area: "Kitchen" };
      case "Coaching":
        return { start: 6 * 60, end: 11 * 60, area: "Courts" };
      case "Management":
        return { start: 10 * 60, end: 19 * 60, area: "Front desk" };
      default:
        return { start: 7 * 60, end: 16 * 60, area: "Front desk" };
    }
  };

  const shifts: Prisma.StaffShiftCreateManyInput[] = [];
  const attendance: Prisma.AttendanceCreateManyInput[] = [];
  for (let offset = -35; offset <= 7; offset++) {
    const date = dayKey(offset);
    const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
    if (dow === 0) continue; // weekly off
    for (const e of employees) {
      const s = shiftFor(e.department);
      shifts.push({ clubId, employeeId: e.id, date, startMin: s.start, endMin: s.end, area: s.area });
      if (offset < 0 && rand() > 0.07) {
        const inAt = localToUtc(tz, +date.slice(0, 4), +date.slice(5, 7), +date.slice(8, 10), Math.floor(s.start / 60), s.start % 60 + Math.floor(rand() * 12));
        const lateMin = rand() < 0.2 ? Math.floor(rand() * 90) : 0;
        const outAt = new Date(inAt.getTime() + (s.end - s.start + lateMin) * 60_000);
        attendance.push({ clubId, employeeId: e.id, date, clockIn: inAt, clockOut: outAt, minutes: Math.round((outAt.getTime() - inAt.getTime()) / 60_000) });
      }
    }
  }
  await prisma.staffShift.createMany({ data: shifts, skipDuplicates: true });
  await prisma.attendance.createMany({ data: attendance });

  // Clock the bartender in right now so "on duty" is non-empty in the demo.
  const bar = employees.find((e) => e.department === "Bar");
  if (bar && new Date().getUTCDay() !== 0) {
    await prisma.attendance.create({ data: { clubId, employeeId: bar.id, date: today, clockIn: new Date(Date.now() - 95 * 60_000) } });
  }

  const desk = employees.find((e) => e.department === "Front desk")!;
  const cook = employees.find((e) => e.department === "Kitchen")!;
  const coach = employees.find((e) => e.department === "Coaching")!;
  await prisma.leaveRequest.createMany({
    data: [
      { clubId, employeeId: desk.id, type: "CASUAL", fromDate: dayKey(5), toDate: dayKey(6), days: 2, reason: "Cousin's wedding in Pune", status: "PENDING" },
      { clubId, employeeId: cook.id, type: "SICK", fromDate: dayKey(-9), toDate: dayKey(-8), days: 2, reason: "Fever", status: "APPROVED", decidedAt: new Date(now.getTime() - 9 * 86_400_000) },
      { clubId, employeeId: coach.id, type: "UNPAID", fromDate: dayKey(12), toDate: dayKey(18), days: 7, reason: "State-level tournament officiating", status: "PENDING" },
      { clubId, employeeId: desk.id, type: "EARNED", fromDate: dayKey(-25), toDate: dayKey(-23), days: 3, status: "APPROVED", decidedAt: new Date(now.getTime() - 26 * 86_400_000) },
    ],
  });

  return employees.length;
}

async function main() {
  console.log("Seeding Playora…");

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

  const ledgerRows = await seedLedgerHistory(club.id, club.timezone, courts, members, owner.id);
  console.log(`  ledger  ${ledgerRows} historical transactions`);

  const invoices = await seedInvoices(club.id, members, owner.id);
  console.log(`  invoices ${invoices}`);

  const payables = await seedPayables(club.id, owner.id);
  console.log(`  payables ${payables}`);

  const employees = await seedHr(club.id, club.timezone, users);
  console.log(`  employees ${employees} (+ rota, attendance, leave)`);

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
