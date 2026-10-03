/**
 * prisma/seed.ts
 *
 * Idempotent seed for Playora. Safe to re-run: every row is upserted on a
 * stable natural key (club slug, user email), so demo accounts keep their
 * ids across runs and nothing is deleted.
 *
 * Demo accounts (password for all: demo1234)
 *   owner@champions.club      OWNER
 *   manager@champions.club    MANAGER
 *   desk@champions.club       FRONT_DESK
 *   bar@champions.club        BAR_STAFF
 *   kitchen@champions.club    KITCHEN
 *   coach@champions.club      COACH
 *   member@champions.club     MEMBER  (Gold, CC-0001 Aditya Rao)
 *   priya@champions.club      MEMBER  (Gold, CC-0011 Priya Sharma)
 *   ravi@champions.club       MEMBER  (Gold, CC-0012 Ravi Krishnan)
 *   sunita@champions.club     MEMBER  (Silver, CC-0013 Sunita Bose)
 *   amit@champions.club       MEMBER  (Silver, CC-0014 Amit Srivastava)
 *   deepa@champions.club      MEMBER  (Silver, CC-0015 Deepa Nambiar)
 *   kabir@champions.club      MEMBER  (Silver, CC-0016 Kabir Anand)
 *   zara@champions.club       MEMBER  (Junior, CC-0017 Zara Qureshi)
 *   rohan.t@champions.club    MEMBER  (Junior, CC-0018 Rohan Tiwari)
 *
 * Run with:  npx tsx prisma/seed.ts
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

const STAFF_USERS: Array<{ email: string; name: string; role: Role; phone: string }> = [
  { email: "owner@champions.club",   name: "Rohan Mehta",   role: "OWNER",      phone: "+91 98200 00001" },
  { email: "manager@champions.club", name: "Priya Nair",    role: "MANAGER",    phone: "+91 98200 00002" },
  { email: "desk@champions.club",    name: "Arjun Shah",    role: "FRONT_DESK", phone: "+91 98200 00003" },
  { email: "bar@champions.club",     name: "Kavya Iyer",    role: "BAR_STAFF",  phone: "+91 98200 00004" },
  { email: "kitchen@champions.club", name: "Suresh Pillai", role: "KITCHEN",    phone: "+91 98200 00005" },
  { email: "coach@champions.club",   name: "Meera Joshi",   role: "COACH",      phone: "+91 98200 00006" },
];

const MEMBER_LOGINS: Array<{ email: string; name: string; phone: string; memberCode: string }> = [
  { email: "member@champions.club",   name: "Aditya Rao",      phone: "+91 98200 00007", memberCode: "CC-0001" },
  { email: "priya@champions.club",    name: "Priya Sharma",    phone: "+91 98200 00011", memberCode: "CC-0011" },
  { email: "ravi@champions.club",     name: "Ravi Krishnan",   phone: "+91 98200 00012", memberCode: "CC-0012" },
  { email: "sunita@champions.club",   name: "Sunita Bose",     phone: "+91 98200 00013", memberCode: "CC-0013" },
  { email: "amit@champions.club",     name: "Amit Srivastava", phone: "+91 98200 00014", memberCode: "CC-0014" },
  { email: "deepa@champions.club",    name: "Deepa Nambiar",   phone: "+91 98200 00015", memberCode: "CC-0015" },
  { email: "kabir@champions.club",    name: "Kabir Anand",     phone: "+91 98200 00016", memberCode: "CC-0016" },
  { email: "zara@champions.club",     name: "Zara Qureshi",    phone: "+91 98200 00017", memberCode: "CC-0017" },
  { email: "rohan.t@champions.club",  name: "Rohan Tiwari",    phone: "+91 98200 00018", memberCode: "CC-0018" },
];

async function seedClub() {
  return prisma.club.upsert({
    where: { slug: CLUB_SLUG },
    update: { name: "The Champions Club", tagline: "Courts, members, bar and shop on one screen." },
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
  const staffUsers = [];
  for (const u of STAFF_USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, phone: u.phone, clubId, passwordHash },
      create: { ...u, clubId, passwordHash },
    });
    staffUsers.push(user);
  }
  const memberUsers = [];
  for (const m of MEMBER_LOGINS) {
    const user = await prisma.user.upsert({
      where: { email: m.email },
      update: { name: m.name, role: "MEMBER", phone: m.phone, clubId, passwordHash },
      create: { email: m.email, name: m.name, role: "MEMBER", phone: m.phone, clubId, passwordHash },
    });
    memberUsers.push({ ...user, memberCode: m.memberCode });
  }
  return { staffUsers, memberUsers };
}

async function seedActivity(clubId: string, ownerId: string) {
  const already = await prisma.activityLog.findFirst({ where: { clubId, action: "CLUB_SEEDED" } });
  if (already) return;
  await prisma.activityLog.create({
    data: { action: "CLUB_SEEDED", entity: "Club", entityId: clubId, userId: ownerId, clubId, newData: { source: "prisma/seed.ts" } },
  });
}

// ─── Plans ───────────────────────────────────────────────────────────────────

const PLANS = [
  { tier: "GOLD" as const,   name: "Gold",   priceMonthly: 999900,  priceYearly: 9999000,  courtDiscountPct: 100, shopDiscountPct: 15, barDiscountPct: 15, maxBookingsPerDay: 2, advanceBookingDays: 14, guestPassesPerMonth: 4,  benefits: ["Courts included", "14-day advance booking", "15% off bar & shop", "4 guest passes / month"] },
  { tier: "SILVER" as const, name: "Silver", priceMonthly: 250000,  priceYearly: 2500000,  courtDiscountPct: 50,  shopDiscountPct: 10, barDiscountPct: 10, maxBookingsPerDay: 2, advanceBookingDays: 7,  guestPassesPerMonth: 2,  benefits: ["50% off courts", "7-day advance booking", "10% off bar & shop", "2 guest passes / month"] },
  { tier: "JUNIOR" as const, name: "Junior", priceMonthly: 120000,  priceYearly: 1200000,  courtDiscountPct: 30,  shopDiscountPct: 5,  barDiscountPct: 0,  maxBookingsPerDay: 1, advanceBookingDays: 3,  guestPassesPerMonth: 0,  benefits: ["30% off courts", "Under-18 only", "Coaching priority"] },
];

async function seedPlans(clubId: string) {
  const out = [];
  for (const p of PLANS) {
    out.push(await prisma.membershipPlan.upsert({ where: { clubId_tier: { clubId, tier: p.tier } }, update: { ...p }, create: { ...p, clubId } }));
  }
  return out;
}

// ─── Courts ──────────────────────────────────────────────────────────────────

const COURTS = [
  { name: "Court 1", type: "TENNIS" as const, surface: "HARD" as const,      isIndoor: false, sortOrder: 1 },
  { name: "Court 2", type: "TENNIS" as const, surface: "HARD" as const,      isIndoor: false, sortOrder: 2 },
  { name: "Court 3", type: "TENNIS" as const, surface: "CLAY" as const,      isIndoor: false, sortOrder: 3 },
  { name: "Court 4", type: "TENNIS" as const, surface: "SYNTHETIC" as const, isIndoor: true,  sortOrder: 4 },
  { name: "Court 5", type: "PADEL" as const,  surface: "SYNTHETIC" as const, isIndoor: true,  sortOrder: 5 },
  { name: "Court 6", type: "PADEL" as const,  surface: "SYNTHETIC" as const, isIndoor: true,  sortOrder: 6 },
];
const PRICING_BANDS = [
  { dayType: "WEEKDAY" as const, startHour: 6,  endHour: 17, walkInPrice: 60000,  label: "Off-peak" },
  { dayType: "WEEKDAY" as const, startHour: 17, endHour: 23, walkInPrice: 100000, label: "Peak" },
  { dayType: "WEEKEND" as const, startHour: 6,  endHour: 23, walkInPrice: 120000, label: "Weekend" },
];

async function seedCourts(clubId: string) {
  const out = [];
  for (const c of COURTS) {
    const existing = await prisma.court.findFirst({ where: { clubId, name: c.name } });
    const court = existing
      ? await prisma.court.update({ where: { id: existing.id }, data: c })
      : await prisma.court.create({ data: { ...c, clubId } });
    await prisma.courtPricing.deleteMany({ where: { courtId: court.id } });
    const bump = c.type === "PADEL" ? 1.2 : 1;
    await prisma.courtPricing.createMany({ data: PRICING_BANDS.map((b) => ({ ...b, courtId: court.id, walkInPrice: Math.round(b.walkInPrice * bump) })) });
    out.push(court);
  }
  return out;
}

// ─── Members ─────────────────────────────────────────────────────────────────

const MEMBERS: Array<{
  code: string; firstName: string; lastName: string; phone: string; email?: string;
  tier: "GOLD" | "SILVER" | "JUNIOR" | null; status: "ACTIVE" | "EXPIRED" | "TRIAL" | "LEAD"; skill: number; daysLeft: number;
}> = [
  // Gold
  { code: "CC-0001", firstName: "Aditya",    lastName: "Rao",        phone: "+91 98200 00007", email: "member@champions.club", tier: "GOLD",   status: "ACTIVE",  skill: 4, daysLeft: 200 },
  { code: "CC-0011", firstName: "Priya",     lastName: "Sharma",     phone: "+91 98200 00011", email: "priya@champions.club",  tier: "GOLD",   status: "ACTIVE",  skill: 5, daysLeft: 280 },
  { code: "CC-0012", firstName: "Ravi",      lastName: "Krishnan",   phone: "+91 98200 00012", email: "ravi@champions.club",   tier: "GOLD",   status: "ACTIVE",  skill: 5, daysLeft: 310 },
  { code: "CC-0003", firstName: "Vikram",    lastName: "Desai",      phone: "+91 98200 00102",                                 tier: "GOLD",   status: "ACTIVE",  skill: 5, daysLeft: 5   },
  { code: "CC-0007", firstName: "Imran",     lastName: "Sheikh",     phone: "+91 98200 00106",                                 tier: "GOLD",   status: "ACTIVE",  skill: 3, daysLeft: 300 },
  { code: "CC-0019", firstName: "Nisha",     lastName: "Patel",      phone: "+91 98200 00119",                                 tier: "GOLD",   status: "EXPIRED", skill: 4, daysLeft: -20 },
  { code: "CC-0022", firstName: "Farhan",    lastName: "Siddiqui",   phone: "+91 98200 00122",                                 tier: "GOLD",   status: "ACTIVE",  skill: 4, daysLeft: 180 },
  { code: "CC-0025", firstName: "Leena",     lastName: "Mehta",      phone: "+91 98200 00125",                                 tier: "GOLD",   status: "ACTIVE",  skill: 3, daysLeft: 240 },
  { code: "CC-0028", firstName: "Siddharth", lastName: "Roy",        phone: "+91 98200 00128",                                 tier: "GOLD",   status: "ACTIVE",  skill: 4, daysLeft: 90  },
  // Silver
  { code: "CC-0002", firstName: "Neha",      lastName: "Kulkarni",   phone: "+91 98200 00101",                                 tier: "SILVER", status: "ACTIVE",  skill: 3, daysLeft: 45  },
  { code: "CC-0013", firstName: "Sunita",    lastName: "Bose",       phone: "+91 98200 00013", email: "sunita@champions.club", tier: "SILVER", status: "ACTIVE",  skill: 3, daysLeft: 160 },
  { code: "CC-0014", firstName: "Amit",      lastName: "Srivastava", phone: "+91 98200 00014", email: "amit@champions.club",   tier: "SILVER", status: "ACTIVE",  skill: 2, daysLeft: 75  },
  { code: "CC-0015", firstName: "Deepa",     lastName: "Nambiar",    phone: "+91 98200 00015", email: "deepa@champions.club",  tier: "SILVER", status: "ACTIVE",  skill: 3, daysLeft: 120 },
  { code: "CC-0016", firstName: "Kabir",     lastName: "Anand",      phone: "+91 98200 00016", email: "kabir@champions.club",  tier: "SILVER", status: "ACTIVE",  skill: 4, daysLeft: 2   },
  { code: "CC-0005", firstName: "Rahul",     lastName: "Menon",      phone: "+91 98200 00104",                                 tier: "SILVER", status: "EXPIRED", skill: 3, daysLeft: -12 },
  { code: "CC-0006", firstName: "Sanya",     lastName: "Kapoor",     phone: "+91 98200 00105",                                 tier: "SILVER", status: "ACTIVE",  skill: 4, daysLeft: 2   },
  { code: "CC-0010", firstName: "Divya",     lastName: "Sundaram",   phone: "+91 98200 00109",                                 tier: "SILVER", status: "ACTIVE",  skill: 5, daysLeft: 120 },
  { code: "CC-0020", firstName: "Suresh",    lastName: "Kumar",      phone: "+91 98200 00120",                                 tier: "SILVER", status: "ACTIVE",  skill: 2, daysLeft: 50  },
  { code: "CC-0021", firstName: "Anita",     lastName: "Reddy",      phone: "+91 98200 00121",                                 tier: "SILVER", status: "ACTIVE",  skill: 3, daysLeft: 95  },
  { code: "CC-0024", firstName: "Tarun",     lastName: "Gupta",      phone: "+91 98200 00124",                                 tier: "SILVER", status: "ACTIVE",  skill: 3, daysLeft: 200 },
  { code: "CC-0026", firstName: "Vijay",     lastName: "Pillai",     phone: "+91 98200 00126",                                 tier: "SILVER", status: "EXPIRED", skill: 2, daysLeft: -5  },
  { code: "CC-0029", firstName: "Preethi",   lastName: "Menon",      phone: "+91 98200 00129",                                 tier: "SILVER", status: "ACTIVE",  skill: 3, daysLeft: 140 },
  // Junior
  { code: "CC-0004", firstName: "Ananya",    lastName: "Bhatt",      phone: "+91 98200 00103",                                 tier: "JUNIOR", status: "ACTIVE",  skill: 2, daysLeft: 90  },
  { code: "CC-0017", firstName: "Zara",      lastName: "Qureshi",    phone: "+91 98200 00017", email: "zara@champions.club",   tier: "JUNIOR", status: "ACTIVE",  skill: 2, daysLeft: 110 },
  { code: "CC-0018", firstName: "Rohan",     lastName: "Tiwari",     phone: "+91 98200 00018", email: "rohan.t@champions.club",tier: "JUNIOR", status: "ACTIVE",  skill: 2, daysLeft: 85  },
  { code: "CC-0023", firstName: "Meghna",    lastName: "Joshi",      phone: "+91 98200 00123",                                 tier: "JUNIOR", status: "ACTIVE",  skill: 1, daysLeft: 70  },
  { code: "CC-0027", firstName: "Kavitha",   lastName: "Rajan",      phone: "+91 98200 00127",                                 tier: "JUNIOR", status: "ACTIVE",  skill: 3, daysLeft: 150 },
  // Trial / Lead
  { code: "CC-0008", firstName: "Pooja",     lastName: "Verma",      phone: "+91 98200 00107",                                 tier: null,     status: "TRIAL",   skill: 2, daysLeft: 7   },
  { code: "CC-0009", firstName: "Karan",     lastName: "Malhotra",   phone: "+91 98200 00108",                                 tier: null,     status: "LEAD",    skill: 3, daysLeft: 0   },
];

async function seedMembers(clubId: string, plans: { id: string; tier: string }[]) {
  const now = new Date();
  const out = [];
  for (const m of MEMBERS) {
    const plan = m.tier ? plans.find((p) => p.tier === m.tier) : null;
    const expiry = new Date(now.getTime() + m.daysLeft * 86_400_000);
    const start = new Date(expiry.getTime() - 365 * 86_400_000);
    const data = { clubId, firstName: m.firstName, lastName: m.lastName, phone: m.phone, email: m.email ?? null, status: m.status, planId: plan?.id ?? null, startDate: plan ? start : null, expiryDate: plan ? expiry : null, skillRating: m.skill };
    out.push(await prisma.member.upsert({ where: { memberCode: m.code }, update: data, create: { ...data, memberCode: m.code } }));
  }
  return out;
}

// ─── Products ────────────────────────────────────────────────────────────────

type Cat = "RACKET" | "BALL" | "SHOES" | "ACCESSORY" | "APPAREL" | "SERVICE" | "FOOD" | "BEVERAGE";
const PRODUCTS: Array<{ sku: string; name: string; category: Cat; price: number; costPrice?: number; stock: number; bar?: boolean; shop?: boolean; service?: boolean; track?: boolean; lowAt?: number; description?: string }> = [
  { sku: "RKT-WPS97",   name: "Wilson Pro Staff 97",        category: "RACKET",    price: 2199900, costPrice: 1650000, stock: 3,   lowAt: 2,  description: "Tour-grade control racket. 315g unstrung." },
  { sku: "RKT-BPD",     name: "Babolat Pure Drive",         category: "RACKET",    price: 1899900, costPrice: 1400000, stock: 6,   lowAt: 2,  description: "Power and spin for all-court players." },
  { sku: "RKT-HSP",     name: "Head Speed MP",              category: "RACKET",    price: 1999900, costPrice: 1500000, stock: 0,   lowAt: 2,  description: "Fast, precise, built for modern baseline play." },
  { sku: "PDL-BUL",     name: "Bullpadel Vertex 04",        category: "RACKET",    price: 2499900, costPrice: 1800000, stock: 4,   lowAt: 2,  description: "Diamond-shaped padel racket for attacking play." },
  { sku: "BAL-WUS4",    name: "Wilson US Open balls (4)",   category: "BALL",      price: 89900,   costPrice: 60000,   stock: 42,  lowAt: 12 },
  { sku: "BAL-HPD3",    name: "Head Padel Pro balls (3)",   category: "BALL",      price: 69900,   costPrice: 45000,   stock: 18,  lowAt: 10 },
  { sku: "SHO-AGC",     name: "Asics Gel-Resolution 9",     category: "SHOES",     price: 1299900, costPrice: 900000,  stock: 5,   lowAt: 2  },
  { sku: "ACC-GRIP",    name: "Overgrip (3 pack)",          category: "ACCESSORY", price: 49900,   costPrice: 25000,   stock: 60,  lowAt: 20 },
  { sku: "ACC-DAMP",    name: "Vibration dampener",         category: "ACCESSORY", price: 19900,   costPrice: 8000,    stock: 2,   lowAt: 10 },
  { sku: "ACC-WRST",    name: "Wristband pair",             category: "ACCESSORY", price: 39900,   costPrice: 15000,   stock: 25,  lowAt: 8  },
  { sku: "APP-TEE",     name: "Champions Club tee",         category: "APPAREL",   price: 149900,  costPrice: 60000,   stock: 30,  lowAt: 8  },
  { sku: "APP-CAP",     name: "Champions Club cap",         category: "APPAREL",   price: 99900,   costPrice: 40000,   stock: 14,  lowAt: 5  },
  { sku: "SVC-RESTR",   name: "Racket restringing",         category: "SERVICE",   price: 120000,  service: true, track: false, stock: 0, description: "Includes Luxilon or Babolat string. 24h turnaround." },
  { sku: "SVC-GRIP",    name: "Regrip service",             category: "SERVICE",   price: 30000,   service: true, track: false, stock: 0 },
  { sku: "BEV-ESP",     name: "Espresso",                   category: "BEVERAGE",  price: 15000,   costPrice: 3000,    stock: 200, bar: true, shop: false, lowAt: 20 },
  { sku: "BEV-CAP",     name: "Cappuccino",                 category: "BEVERAGE",  price: 22000,   costPrice: 5000,    stock: 200, bar: true, shop: false, lowAt: 20 },
  { sku: "BEV-CLD",     name: "Cold coffee",                category: "BEVERAGE",  price: 25000,   costPrice: 6000,    stock: 200, bar: true, shop: false, lowAt: 20 },
  { sku: "BEV-LIME",    name: "Fresh lime soda",            category: "BEVERAGE",  price: 12000,   costPrice: 2500,    stock: 200, bar: true, shop: false, lowAt: 20 },
  { sku: "BEV-WATER",   name: "Mineral water 1L",           category: "BEVERAGE",  price: 5000,    costPrice: 1800,    stock: 48,  bar: true, shop: true,  lowAt: 24 },
  { sku: "BEV-ISO",     name: "Isotonic drink",             category: "BEVERAGE",  price: 9000,    costPrice: 4000,    stock: 36,  bar: true, shop: true,  lowAt: 12 },
  { sku: "BEV-SHAKE",   name: "Protein shake",              category: "BEVERAGE",  price: 28000,   costPrice: 9000,    stock: 200, bar: true, shop: false, lowAt: 20 },
  { sku: "BEV-BEER",    name: "Craft beer 330ml",           category: "BEVERAGE",  price: 35000,   costPrice: 14000,   stock: 72,  bar: true, shop: false, lowAt: 24 },
  { sku: "FOOD-CLUB",   name: "Club sandwich",              category: "FOOD",      price: 32000,   costPrice: 11000,   stock: 200, bar: true, shop: false, lowAt: 20 },
  { sku: "FOOD-PANEER", name: "Paneer tikka wrap",          category: "FOOD",      price: 28000,   costPrice: 9000,    stock: 200, bar: true, shop: false, lowAt: 20 },
  { sku: "FOOD-FRIES",  name: "Peri-peri fries",            category: "FOOD",      price: 18000,   costPrice: 5000,    stock: 200, bar: true, shop: false, lowAt: 20 },
  { sku: "FOOD-BOWL",   name: "Grilled chicken bowl",       category: "FOOD",      price: 42000,   costPrice: 16000,   stock: 200, bar: true, shop: false, lowAt: 20 },
  { sku: "FOOD-SALAD",  name: "Quinoa salad",               category: "FOOD",      price: 30000,   costPrice: 10000,   stock: 200, bar: true, shop: false, lowAt: 20 },
  { sku: "FOOD-BROWN",  name: "Brownie",                    category: "FOOD",      price: 16000,   costPrice: 4500,    stock: 200, bar: true, shop: false, lowAt: 20 },
];

const PRODUCT_IMAGES = new Set(["RKT-WPS97","RKT-BPD","RKT-HSP","PDL-BUL","BAL-WUS4","BAL-HPD3","SHO-AGC","ACC-GRIP","ACC-DAMP","ACC-WRST","APP-TEE","APP-CAP","BEV-WATER","BEV-ISO"]);

async function seedProducts(clubId: string) {
  const out = [];
  for (const p of PRODUCTS) {
    const data = { clubId, name: p.name, description: p.description ?? null, category: p.category, price: p.price, costPrice: p.costPrice ?? null, taxRatePct: p.category === "FOOD" || p.category === "BEVERAGE" ? 5 : 18, isForBar: p.bar ?? false, isForShop: p.shop ?? true, isService: p.service ?? false, trackStock: p.track ?? true, lowStockAt: p.lowAt ?? 5, imageUrl: PRODUCT_IMAGES.has(p.sku) ? `/products/${p.sku.toLowerCase()}.png` : null };
    const existing = await prisma.product.findUnique({ where: { sku: p.sku } });
    if (existing) { out.push(await prisma.product.update({ where: { sku: p.sku }, data })); }
    else {
      const created = await prisma.product.create({ data: { ...data, sku: p.sku, stockQty: p.stock } });
      if (p.stock > 0) await prisma.stockMovement.create({ data: { clubId, productId: created.id, delta: p.stock, reason: "RESTOCK", note: "Opening stock" } });
      out.push(created);
    }
  }
  return out;
}

// ─── Tables ──────────────────────────────────────────────────────────────────

const TABLES = [
  ...[1,2,3,4].map((n) => ({ name: `T${n}`, zone: "Indoor",     seats: 4, sortOrder: n      })),
  ...[1,2,3].map((n)   => ({ name: `P${n}`, zone: "Patio",      seats: 6, sortOrder: 10 + n })),
  ...[1,2].map((n)     => ({ name: `C${n}`, zone: "Court-side", seats: 2, sortOrder: 20 + n })),
];

async function seedTables(clubId: string) {
  const out = [];
  for (const t of TABLES) {
    const existing = await prisma.barTable.findFirst({ where: { clubId, name: t.name } });
    out.push(existing ? await prisma.barTable.update({ where: { id: existing.id }, data: t }) : await prisma.barTable.create({ data: { ...t, clubId } }));
  }
  return out;
}

// ─── Leads ───────────────────────────────────────────────────────────────────

const LEADS = [
  { name: "Rohan Iyer",        phone: "+91 98200 00201", email: "rohan@example.com",     interest: "Tennis",     source: "WEBSITE",   stage: "NEW" as const,           message: "Looking for weekend coaching for myself and my 12-year-old son.", daysAgo: 0 },
  { name: "Meera Nair",        phone: "+91 98200 00202",                                 interest: "Padel",      source: "INSTAGRAM", stage: "NEW" as const,           message: "Saw your padel courts on Instagram. Do you do beginner sessions?", daysAgo: 1 },
  { name: "Aryan Verma",       phone: "+91 98200 00211", email: "aryan.v@example.com",   interest: "Tennis",     source: "WEBSITE",   stage: "NEW" as const,           message: "Interested in a family membership for my wife and two kids.", daysAgo: 0 },
  { name: "Poonam Singh",      phone: "+91 98200 00212",                                 interest: "Padel",      source: "INSTAGRAM", stage: "NEW" as const,           message: "Complete beginner. Saw a reel with padel highlights!", daysAgo: 2 },
  { name: "Geeta Mukherjee",   phone: "+91 98200 00213", email: "geeta.m@example.com",   interest: "Events",     source: "WEBSITE",   stage: "NEW" as const,           message: "Planning a corporate outing for 30 people. Do you host events?", daysAgo: 1 },
  { name: "Deepak Naidu",      phone: "+91 98200 00214",                                 interest: "Padel",      source: "INSTAGRAM", stage: "NEW" as const,           message: "Saw a reel from your padel tournament. Very interested!", daysAgo: 0 },
  { name: "Arjun Patel",       phone: "+91 98200 00203", email: "arjun.p@example.com",   interest: "Membership", source: "WALK_IN",   stage: "CONTACTED" as const,     daysAgo: 3, followUpIn: 1 },
  { name: "Rohit Kapila",      phone: "+91 98200 00215", email: "rohit.k@example.com",   interest: "Membership", source: "WALK_IN",   stage: "CONTACTED" as const,     message: "Toured the facility. Very impressed with the indoor courts.", daysAgo: 4, followUpIn: 2 },
  { name: "Shalini Deshpande", phone: "+91 98200 00216", email: "shalini.d@example.com", interest: "Tennis",     source: "REFERRAL",  stage: "CONTACTED" as const,     message: "Referred by Imran Sheikh (CC-0007). Wants to join as Silver.", daysAgo: 2, followUpIn: 1 },
  { name: "Vishal Thakur",     phone: "+91 98200 00217", email: "vishal.t@example.com",  interest: "Coaching",   source: "REFERRAL",  stage: "CONTACTED" as const,     message: "Referred by Aditya Rao (CC-0001). Wants weekend coaching.", daysAgo: 5, followUpIn: 3 },
  { name: "Shruti Jain",       phone: "+91 98200 00204", email: "shruti@example.com",    interest: "Coaching",   source: "REFERRAL",  stage: "QUOTE_SENT" as const,    daysAgo: 5, followUpIn: 0, quote: "SILVER" },
  { name: "Trisha Malhan",     phone: "+91 98200 00218", email: "trisha.m@infotech.in",  interest: "Membership", source: "CORPORATE", stage: "QUOTE_SENT" as const,    message: "Works at Infotech Ltd. Corporate membership block.", daysAgo: 3, followUpIn: 0, quote: "GOLD" },
  { name: "Arun Shetty",       phone: "+91 98200 00219", email: "arun.s@example.com",    interest: "Coaching",   source: "PHONE",     stage: "QUOTE_SENT" as const,    message: "Wants intensive coaching package, 3 sessions per week.", daysAgo: 6, followUpIn: 0, quote: "GOLD" },
  { name: "Chandni Oberoi",    phone: "+91 98200 00220",                                 interest: "Membership", source: "WALK_IN",   stage: "QUOTE_SENT" as const,    message: "Silver quote sent. Comparing with another club.", daysAgo: 4, followUpIn: 1, quote: "SILVER" },
  { name: "Dev Chawla",        phone: "+91 98200 00205", email: "dev.c@example.com",     interest: "Tennis",     source: "WEBSITE",   stage: "TRIAL_BOOKED" as const,  daysAgo: 7, followUpIn: 2 },
  { name: "Nikhil Bhatia",     phone: "+91 98200 00221", email: "nikhil.b@example.com",  interest: "Padel",      source: "WEBSITE",   stage: "TRIAL_BOOKED" as const,  message: "Trial booked for Saturday 10am on Court 5.", daysAgo: 2, followUpIn: 3 },
  { name: "Bhavana Iyer",      phone: "+91 98200 00222", email: "bhavana.i@example.com", interest: "Tennis",     source: "WHATSAPP",  stage: "TRIAL_BOOKED" as const,  message: "Trial booked for tomorrow 7am, Court 1.", daysAgo: 1, followUpIn: 1 },
  { name: "Sana Khan",         phone: "+91 98200 00223", email: "sana.k@example.com",    interest: "Tennis",     source: "INSTAGRAM", stage: "CONVERTED" as const,     message: "Converted to Gold member! Now CC-0028.", daysAgo: 14 },
  { name: "Lakshmi Rao",       phone: "+91 98200 00206",                                 interest: "Padel",      source: "WHATSAPP",  stage: "LOST" as const,          daysAgo: 14, lostReason: "Joined a club closer to home" },
  { name: "Prakash Joshi",     phone: "+91 98200 00224", email: "prakash.j@example.com", interest: "Membership", source: "WEBSITE",   stage: "LOST" as const,          message: "Budget constraints. Might return later.", daysAgo: 20, lostReason: "Budget constraints" },
];

async function seedLeads(clubId: string, plans: { id: string; tier: string; priceMonthly: number }[], userId: string) {
  const now = Date.now();
  let created = 0;
  for (const l of LEADS) {
    const existing = await prisma.lead.findFirst({ where: { clubId, phone: l.phone } });
    if (existing) continue;
    const plan = (l as any).quote ? plans.find((p) => p.tier === (l as any).quote) : null;
    const lead = await prisma.lead.create({
      data: {
        clubId, name: l.name, phone: l.phone, email: (l as any).email ?? null, interest: l.interest, source: l.source, stage: l.stage,
        message: (l as any).message ?? null, lostReason: (l as any).lostReason ?? null,
        nextFollowUp: (l as any).followUpIn != null ? new Date(now + (l as any).followUpIn * 86_400_000) : null,
        quotePlanId: plan?.id ?? null, quoteBilling: plan ? "MONTHLY" : null, quoteAmount: plan?.priceMonthly ?? null,
        quoteSentAt: plan ? new Date(now - 2 * 86_400_000) : null,
        createdAt: new Date(now - l.daysAgo * 86_400_000),
      },
    });
    await prisma.leadActivity.create({ data: { leadId: lead.id, type: "NOTE", content: `Lead captured via ${l.source.toLowerCase().replace("_", "-")}.`, byUserId: userId } });
    created++;
  }
  return created;
}

// ─── Finance ─────────────────────────────────────────────────────────────────

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}
function splitTax(gross: number, ratePct: number) {
  return gross - Math.round((gross * 100) / (100 + ratePct));
}

async function seedLedgerHistory(clubId: string, tz: string, courts: { id: string; name: string }[], members: { id: string }[], userId: string) {
  const existing = await prisma.transaction.count({ where: { clubId, refType: "SeedHistory" } });
  if (existing > 0) return existing;

  const rand = rng(20261003);
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
  const modes = ["UPI","UPI","UPI","CARD","CASH","ONLINE"] as const;
  const rows: Prisma.TransactionCreateManyInput[] = [];
  const now = new Date();
  const courtTxns: Prisma.TransactionCreateManyInput[] = [];
  const courtSlots: { courtId: string; startsAt: Date; memberId: string | null; walkInName: string | null; gross: number }[] = [];

  for (let d = 42; d >= 1; d--) {
    const day = new Date(now.getTime() - d * 86_400_000);
    const local = toLocalParts(day, tz);
    const weekend = [0,6].includes(local.weekday);
    const bump = weekend ? 1.6 : 1;
    for (const court of courts) {
      for (let hour = 6; hour < 23; hour++) {
        const evening = hour >= 17 && hour <= 21;
        const morning = hour >= 7 && hour <= 10;
        const p = evening ? 0.7 : weekend && morning ? 0.55 : morning ? 0.3 : 0.18;
        if (rand() >= p) continue;
        const gross = evening ? pick([100000,120000,150000]) : pick([60000,80000,100000]);
        const member = rand() < 0.65 ? pick(members) : null;
        const startsAt = localToUtc(tz, local.year, local.month, local.day, hour);
        courtSlots.push({ courtId: court.id, startsAt, memberId: member?.id ?? null, walkInName: member ? null : pick(["Walk-in","Guest","Drop-in"]), gross });
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
      const gross = pick([35000,89900,249900,599900,1299900]);
      rows.push({ clubId, source: "SHOP", direction: "IN", amount: gross, tax: splitTax(gross, gross >= 100000 ? 18 : 12), paymentMode: pick(modes), memberId: rand() < 0.5 ? pick(members).id : null, refType: "SeedHistory", description: "Pro shop sale", byUserId: userId, createdAt: new Date(day.getTime() + (10 + Math.floor(rand() * 10)) * 3_600_000) });
    }
    if (rand() < 0.25) rows.push({ clubId, source: "MEMBERSHIP", direction: "IN", amount: pick([299900,599900,1199900]), tax: splitTax(pick([299900,599900,1199900]), 18), paymentMode: pick(["UPI","CARD","ONLINE"] as const), memberId: pick(members).id, refType: "SeedHistory", description: "Membership renewal", byUserId: userId, createdAt: new Date(day.getTime() + 12 * 3_600_000) });
    if (rand() < 0.15) rows.push({ clubId, source: "COACHING", direction: "IN", amount: pick([150000,250000,400000]), tax: splitTax(pick([150000,250000,400000]), 18), paymentMode: pick(modes), memberId: pick(members).id, refType: "SeedHistory", description: "Coaching package", byUserId: userId, createdAt: new Date(day.getTime() + 16 * 3_600_000) });
  }
  for (let w = 6; w >= 1; w--) {
    const day = new Date(now.getTime() - w * 7 * 86_400_000);
    rows.push({ clubId, source: "SUPPLIER", direction: "OUT", amount: 180000 + Math.round(rand() * 120000), tax: 0, paymentMode: "ONLINE", refType: "SeedHistory", description: "Supplier bill · Beverages & kitchen", byUserId: userId, createdAt: day });
  }
  rows.push({ clubId, source: "PAYROLL", direction: "OUT", amount: 32500000, tax: 0, paymentMode: "ONLINE", refType: "SeedHistory", description: "Salaries · month before last", byUserId: userId, createdAt: new Date(now.getFullYear(), now.getMonth() - 1, 1, 10) });
  rows.push({ clubId, source: "CORPORATE", direction: "IN", amount: 4500000, tax: splitTax(4500000, 18), paymentMode: "ONLINE", refType: "SeedHistory", description: "Corporate tournament · Infotech Ltd", byUserId: userId, createdAt: new Date(now.getTime() - 10 * 86_400_000) });

  await prisma.transaction.createMany({ data: rows });
  const created = await prisma.transaction.createManyAndReturn({ data: courtTxns, select: { id: true } });
  await prisma.booking.createMany({
    data: courtSlots.map((s, i) => ({
      clubId, courtId: s.courtId, memberId: s.memberId, walkInName: s.walkInName, startsAt: s.startsAt,
      endsAt: new Date(s.startsAt.getTime() + 3_600_000), kind: "PRIVATE" as const, status: "COMPLETED" as const,
      source: s.memberId ? ("APP" as const) : ("FRONT_DESK" as const), listPrice: s.gross, priceCharged: s.gross,
      priceReason: "Seed history", transactionId: created[i].id, checkedInAt: s.startsAt, createdById: userId,
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
    { kind: "MEMBERSHIP" as const, member: members[1], daysAgo: 20, dueIn: 7,  status: "ISSUED" as const, items: [{ description: "Gold membership · quarterly",   qty: 1, unitPrice: 1499900, taxRatePct: 18 }] },
    { kind: "MEMBERSHIP" as const, member: members[2], daysAgo: 12, dueIn: 7,  status: "PAID" as const,   items: [{ description: "Silver membership · monthly",   qty: 1, unitPrice: 599900,  taxRatePct: 18 }] },
    { kind: "OTHER" as const, billToName: "Powai Padel League", billToEmail: "hello@ppl.example", daysAgo: 30, dueIn: 10, status: "PAID" as const, items: [{ description: "Court block · league nights (Sept)", qty: 8, unitPrice: 240000, taxRatePct: 18 }] },
    { kind: "MEMBERSHIP" as const, member: members[5], daysAgo: 5,  dueIn: 7,  status: "ISSUED" as const, items: [{ description: "Gold membership · annual renewal", qty: 1, unitPrice: 4500000, taxRatePct: 18 }] },
    { kind: "CORPORATE" as const, billToName: "Zest Pharma Ltd", billToEmail: "finance@zestpharma.example", billToGstin: "27ABCDE5678F1Z3", billToAddress: "Andheri East, Mumbai 400069", daysAgo: 8, dueIn: 10, status: "PAID" as const, items: [{ description: "Team outing · 3 courts × 4 hrs", qty: 12, unitPrice: 120000, taxRatePct: 18 }, { description: "Catering · 30 covers", qty: 30, unitPrice: 40000, taxRatePct: 5 }] },
  ];
  for (const s of specs) {
    const items = s.items.map((l, i) => ({ ...l, amount: l.qty * l.unitPrice, tax: Math.round((l.qty * l.unitPrice * l.taxRatePct) / 100), sortOrder: i }));
    const subtotal = items.reduce((a, l) => a + l.amount, 0);
    const tax = items.reduce((a, l) => a + l.tax, 0);
    const issueDate = new Date(now - s.daysAgo * 86_400_000);
    const cr = await prisma.invoice.create({ data: { clubId, invoiceNo: `TMP-${Math.random()}`, kind: s.kind, memberId: (s as any).member?.id ?? null, billToName: (s as any).member ? `${(s as any).member.firstName} ${(s as any).member.lastName}` : (s as any).billToName!, billToEmail: (s as any).member?.email ?? (s as any).billToEmail ?? null, billToPhone: (s as any).member?.phone ?? null, billToAddress: (s as any).billToAddress ?? null, billToGstin: (s as any).billToGstin ?? null, issueDate, dueDate: new Date(issueDate.getTime() + s.dueIn * 86_400_000), subtotal, tax, total: subtotal + tax, createdById: userId, items: { create: items } } });
    const invoiceNo = `INV-${stamp(issueDate)}-${String(cr.hashId).padStart(4, "0")}`;
    if (s.status === "PAID") {
      const paidAt = new Date(issueDate.getTime() + 2 * 86_400_000);
      const source: TxSource = s.kind === "MEMBERSHIP" ? "MEMBERSHIP" : "OTHER";
      const txn = await prisma.transaction.create({ data: { clubId, source, direction: "IN", amount: subtotal + tax, tax, paymentMode: "ONLINE", memberId: (s as any).member?.id ?? null, refType: "Invoice", refId: cr.id, description: `Invoice ${invoiceNo}`, byUserId: userId, createdAt: paidAt } });
      await prisma.invoice.update({ where: { id: cr.id }, data: { invoiceNo, status: "PAID", paidAt, paymentMode: "ONLINE", transactionId: txn.id } });
    } else { await prisma.invoice.update({ where: { id: cr.id }, data: { invoiceNo } }); }
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
      { clubId, kind: "SUPPLIER", payee: "Bisleri Distributors", description: "Water & soft drinks · weekly",      reference: "BD/2026/0912", amount: 184000,   dueDate: d(-2), createdById: userId },
      { clubId, kind: "SUPPLIER", payee: "Yonex India",          description: "Shuttlecocks + grips restock",       reference: "YX-44821",    amount: 1263000,  dueDate: d(4),  createdById: userId },
      { clubId, kind: "SUPPLIER", payee: "Fresh Farm Produce",   description: "Kitchen produce · fortnight",        reference: "FFP-1107",    amount: 421500,   dueDate: d(6),  createdById: userId },
      { clubId, kind: "SUPPLIER", payee: "Wilson India",         description: "Tennis balls & racket restock",      reference: "WI-9823",     amount: 875000,   dueDate: d(8),  createdById: userId },
      { clubId, kind: "SALARY",   payee: "Staff payroll",        description: "Salaries · current month",           reference: "PAYROLL-OCT", amount: 32500000, dueDate: d(12), createdById: userId },
      { clubId, kind: "TAX",      payee: "GSTN",                 description: "GSTR-3B · previous month",           reference: "GSTR3B-SEP",  amount: 2184000,  dueDate: d(17), createdById: userId },
      { clubId, kind: "OTHER",    payee: "Adani Electricity",    description: "Electricity · floodlights & AC",     reference: "AEML-7731",   amount: 1875000,  dueDate: d(9),  createdById: userId },
      { clubId, kind: "OTHER",    payee: "Tata Communications",  description: "Internet & CCTV · monthly",          reference: "TC-OCT-2026", amount: 145000,   dueDate: d(3),  createdById: userId },
    ],
  });
  return 8;
}

// ─── HR ──────────────────────────────────────────────────────────────────────

const STAFF_PROFILES: Record<string, { designation: string; department: string; employmentType: "FULL_TIME"|"PART_TIME"|"CONTRACT"; salary: number; hourlyRate?: number }> = {
  OWNER:      { designation: "Owner",                 department: "Management", employmentType: "FULL_TIME",  salary: 0        },
  MANAGER:    { designation: "Club manager",           department: "Management", employmentType: "FULL_TIME",  salary: 6500000  },
  FRONT_DESK: { designation: "Front desk executive",   department: "Front desk", employmentType: "FULL_TIME",  salary: 2800000  },
  BAR_STAFF:  { designation: "Bartender",             department: "Bar",        employmentType: "FULL_TIME",  salary: 2400000  },
  KITCHEN:    { designation: "Line cook",             department: "Kitchen",    employmentType: "PART_TIME",  salary: 1800000, hourlyRate: 15000 },
  COACH:      { designation: "Head coach · Tennis",   department: "Coaching",   employmentType: "CONTRACT",   salary: 5500000  },
};

async function seedHr(clubId: string, tz: string, users: { id: string; role: Role }[]) {
  const existing = await prisma.employee.count({ where: { clubId } });
  if (existing > 0) return existing;
  const rand = rng(777);
  const now = new Date();
  const todayParts = toLocalParts(now, tz);
  const today = `${todayParts.year}-${String(todayParts.month).padStart(2,"0")}-${String(todayParts.day).padStart(2,"0")}`;
  const dayKey = (offset: number) => { const d = new Date(`${today}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + offset); return d.toISOString().slice(0, 10); };
  const staff = users.filter((u) => u.role !== "MEMBER" && u.role !== "OWNER");
  const employees = [];
  let n = 1;
  for (const u of staff) {
    const p = STAFF_PROFILES[u.role];
    employees.push(await prisma.employee.create({ data: { clubId, userId: u.id, employeeNo: `EMP-${String(n++).padStart(3,"0")}`, designation: p.designation, department: p.department, employmentType: p.employmentType, joinedOn: new Date(now.getFullYear()-1,(n*2)%12,1), monthlySalary: p.salary, hourlyRate: p.hourlyRate??null, leaveBalance: 8+Math.floor(rand()*5) } }));
  }
  const shiftFor = (dept: string) => { switch(dept) { case "Bar": return {start:15*60,end:23*60,area:"Bar"}; case "Kitchen": return {start:16*60,end:22*60+30,area:"Kitchen"}; case "Coaching": return {start:6*60,end:11*60,area:"Courts"}; case "Management": return {start:10*60,end:19*60,area:"Front desk"}; default: return {start:7*60,end:16*60,area:"Front desk"}; } };
  const shifts: Prisma.StaffShiftCreateManyInput[] = [];
  const attendance: Prisma.AttendanceCreateManyInput[] = [];
  for (let offset = -35; offset <= 7; offset++) {
    const date = dayKey(offset);
    const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
    if (dow === 0) continue;
    for (const e of employees) {
      const s = shiftFor(e.department);
      shifts.push({ clubId, employeeId: e.id, date, startMin: s.start, endMin: s.end, area: s.area });
      if (offset < 0 && rand() > 0.07) {
        const inAt = localToUtc(tz, +date.slice(0,4), +date.slice(5,7), +date.slice(8,10), Math.floor(s.start/60), s.start%60+Math.floor(rand()*12));
        const outAt = new Date(inAt.getTime() + (s.end-s.start+(rand()<0.2?Math.floor(rand()*90):0))*60_000);
        attendance.push({ clubId, employeeId: e.id, date, clockIn: inAt, clockOut: outAt, minutes: Math.round((outAt.getTime()-inAt.getTime())/60_000) });
      }
    }
  }
  await prisma.staffShift.createMany({ data: shifts, skipDuplicates: true });
  await prisma.attendance.createMany({ data: attendance });
  const bar = employees.find((e) => e.department === "Bar");
  if (bar && new Date().getUTCDay() !== 0) await prisma.attendance.create({ data: { clubId, employeeId: bar.id, date: today, clockIn: new Date(Date.now()-95*60_000) } });
  const desk  = employees.find((e) => e.department === "Front desk")!;
  const cook  = employees.find((e) => e.department === "Kitchen")!;
  const coach = employees.find((e) => e.department === "Coaching")!;
  await prisma.leaveRequest.createMany({ data: [
    { clubId, employeeId: desk.id,  type: "CASUAL", fromDate: dayKey(5),   toDate: dayKey(6),   days: 2, reason: "Cousin's wedding in Pune", status: "PENDING" },
    { clubId, employeeId: cook.id,  type: "SICK",   fromDate: dayKey(-9),  toDate: dayKey(-8),  days: 2, reason: "Fever", status: "APPROVED", decidedAt: new Date(now.getTime()-9*86_400_000) },
    { clubId, employeeId: coach.id, type: "UNPAID", fromDate: dayKey(12),  toDate: dayKey(18),  days: 7, reason: "State-level tournament officiating", status: "PENDING" },
    { clubId, employeeId: desk.id,  type: "EARNED", fromDate: dayKey(-25), toDate: dayKey(-23), days: 3, status: "APPROVED", decidedAt: new Date(now.getTime()-26*86_400_000) },
  ]});
  return employees.length;
}

// ─── Coaching ────────────────────────────────────────────────────────────────

const COACH_NOTES = [
  "Backhand slice is landing deep now; next session work on the approach shot.",
  "Serve toss drifting left under fatigue. Added shadow-swing drill for homework.",
  "Great footwork on the padel back wall today. Ready for doubles positioning next.",
  "Struggled with high volleys. Keep the racket head up; 3×10 reps at the net.",
  "First session after the ankle knock. Light rally only, no sprint drills.",
  "Consistent on the forehand cross-court; introduced the inside-out pattern.",
  "First backhand topspin attempt. Needs forearm strength work. Promising start!",
  "Ready for tournament-level play. Serve speed 145 kmph in today's drill.",
  "Consistent baseline rally under pressure. Introduced serve-and-volley.",
  "Great attitude. Footwork drill homework — 20 min cone exercises daily.",
  "Padel positioning excellent on back wall. Doubles next session.",
];

async function seedCoaching(clubId: string, tz: string, coachId: string, courts: { id: string; name: string }[], members: { id: string }[]) {
  const existing = await prisma.booking.count({ where: { clubId, coachId } });
  if (existing > 0) return { sessions: 0, notes: 0 };
  const now = new Date();
  const roster = members.slice(0, 8);
  const hours = [7, 9, 17, 19];
  const court = courts[0];
  let sessions = 0;
  for (let d = -14; d <= 7; d++) {
    const day = new Date(now.getTime() + d * 86_400_000);
    const local = toLocalParts(day, tz);
    if ([0,6].includes(local.weekday)) continue;
    for (const hour of hours) {
      const startsAt = localToUtc(tz, local.year, local.month, local.day, hour);
      const endsAt = new Date(startsAt.getTime() + 3_600_000);
      if (startsAt.getTime() < now.getTime() - 86_400_000 * 14) continue;
      const clash = await prisma.booking.findFirst({ where: { courtId: court.id, status: { in: ["CONFIRMED","COMPLETED"] }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } }, select: { id: true } });
      if (clash) continue;
      const past = endsAt.getTime() < now.getTime();
      const player = roster[(sessions + (hour === 17 ? 3 : 0)) % roster.length];
      await prisma.booking.create({ data: { clubId, courtId: court.id, memberId: player.id, coachId, startsAt, endsAt, kind: "COACHING", status: past?"COMPLETED":"CONFIRMED", source: "FRONT_DESK", listPrice: 150000, priceCharged: 150000, priceReason: "Coaching package", checkedInAt: past?startsAt:null, createdById: coachId, createdAt: new Date(startsAt.getTime()-3*86_400_000) } });
      sessions++;
    }
  }
  const completed = await prisma.booking.findMany({ where: { clubId, coachId, status: "COMPLETED", memberId: { not: null } }, orderBy: { startsAt: "desc" }, take: COACH_NOTES.length, select: { memberId: true, startsAt: true } });
  await prisma.memberNote.createMany({ data: completed.map((b, i) => ({ memberId: b.memberId!, content: COACH_NOTES[i%COACH_NOTES.length], byUserId: coachId, createdAt: new Date(b.startsAt.getTime()+3_600_000) })) });
  return { sessions, notes: completed.length };
}

// ─── Today's Bookings ─────────────────────────────────────────────────────────

async function seedTodayBookings(clubId: string, tz: string, courts: { id: string; name: string }[], members: { id: string; memberCode: string }[], userId: string) {
  const now = new Date();
  const local = toLocalParts(now, tz);
  const todayStr = `${local.year}-${String(local.month).padStart(2,"0")}-${String(local.day).padStart(2,"0")}`;
  const existingToday = await prisma.booking.count({ where: { clubId, startsAt: { gte: new Date(`${todayStr}T00:00:00+05:30`), lt: new Date(`${todayStr}T23:59:59+05:30`) }, kind: { not: "COACHING" } } });
  if (existingToday > 5) return 0;
  const byCode = (code: string) => members.find((m) => m.memberCode === code);
  const byCourtName = (name: string) => courts.find((c) => c.name === name)!;
  const slot = (hour: number) => localToUtc(tz, local.year, local.month, local.day, hour);
  const specs: Array<{ courtName: string; hour: number; durationHrs: number; memberId: string|null; walkInName?: string; kind: "PRIVATE"|"SOCIAL"; status: "COMPLETED"|"CONFIRMED"; checkedIn?: boolean }> = [
    { courtName:"Court 1", hour:6,  durationHrs:1, memberId:byCode("CC-0001")?.id??null, kind:"PRIVATE",   status:"COMPLETED", checkedIn:true },
    { courtName:"Court 2", hour:7,  durationHrs:1, memberId:byCode("CC-0012")?.id??null, kind:"PRIVATE",   status:"COMPLETED", checkedIn:true },
    { courtName:"Court 3", hour:7,  durationHrs:1, memberId:byCode("CC-0011")?.id??null, kind:"PRIVATE",   status:"COMPLETED", checkedIn:true },
    { courtName:"Court 4", hour:8,  durationHrs:1, memberId:byCode("CC-0022")?.id??null, kind:"PRIVATE",   status:"COMPLETED", checkedIn:true },
    { courtName:"Court 5", hour:8,  durationHrs:1, memberId:byCode("CC-0015")?.id??null, kind:"SOCIAL",    status:"COMPLETED", checkedIn:true },
    { courtName:"Court 6", hour:9,  durationHrs:1, memberId:byCode("CC-0016")?.id??null, kind:"PRIVATE",   status:"COMPLETED", checkedIn:true },
    { courtName:"Court 1", hour:9,  durationHrs:1, memberId:byCode("CC-0003")?.id??null, kind:"PRIVATE",   status:"COMPLETED", checkedIn:true },
    { courtName:"Court 2", hour:10, durationHrs:1, memberId:byCode("CC-0013")?.id??null, kind:"PRIVATE",   status:"COMPLETED", checkedIn:true },
    { courtName:"Court 3", hour:10, durationHrs:1, memberId:byCode("CC-0007")?.id??null, kind:"PRIVATE",   status:"COMPLETED", checkedIn:true },
    { courtName:"Court 1", hour:17, durationHrs:1, memberId:byCode("CC-0001")?.id??null, kind:"PRIVATE",   status:"CONFIRMED" },
    { courtName:"Court 2", hour:17, durationHrs:1, memberId:byCode("CC-0028")?.id??null, kind:"PRIVATE",   status:"CONFIRMED" },
    { courtName:"Court 3", hour:17, durationHrs:1, memberId:byCode("CC-0025")?.id??null, kind:"PRIVATE",   status:"CONFIRMED" },
    { courtName:"Court 5", hour:17, durationHrs:1, memberId:byCode("CC-0014")?.id??null, kind:"SOCIAL",    status:"CONFIRMED" },
    { courtName:"Court 4", hour:17, durationHrs:1, memberId:null, walkInName:"Dev Chawla (Trial)", kind:"PRIVATE", status:"CONFIRMED" },
    { courtName:"Court 1", hour:18, durationHrs:1, memberId:byCode("CC-0011")?.id??null, kind:"PRIVATE",   status:"CONFIRMED" },
    { courtName:"Court 2", hour:18, durationHrs:1, memberId:byCode("CC-0012")?.id??null, kind:"PRIVATE",   status:"CONFIRMED" },
    { courtName:"Court 3", hour:18, durationHrs:1, memberId:byCode("CC-0022")?.id??null, kind:"PRIVATE",   status:"CONFIRMED" },
    { courtName:"Court 4", hour:18, durationHrs:1, memberId:byCode("CC-0024")?.id??null, kind:"PRIVATE",   status:"CONFIRMED" },
    { courtName:"Court 5", hour:18, durationHrs:1, memberId:byCode("CC-0015")?.id??null, kind:"SOCIAL",    status:"CONFIRMED" },
    { courtName:"Court 6", hour:18, durationHrs:1, memberId:byCode("CC-0016")?.id??null, kind:"PRIVATE",   status:"CONFIRMED" },
    { courtName:"Court 1", hour:19, durationHrs:1, memberId:byCode("CC-0007")?.id??null, kind:"PRIVATE",   status:"CONFIRMED" },
    { courtName:"Court 2", hour:19, durationHrs:1, memberId:byCode("CC-0003")?.id??null, kind:"PRIVATE",   status:"CONFIRMED" },
    { courtName:"Court 5", hour:20, durationHrs:2, memberId:null, walkInName:"Infotech Ltd (Corporate)", kind:"PRIVATE", status:"CONFIRMED" },
    { courtName:"Court 6", hour:20, durationHrs:1, memberId:byCode("CC-0029")?.id??null, kind:"PRIVATE",   status:"CONFIRMED" },
  ];
  let created = 0;
  for (const b of specs) {
    const court = byCourtName(b.courtName);
    const startsAt = slot(b.hour);
    const endsAt = new Date(startsAt.getTime() + b.durationHrs * 3_600_000);
    const clash = await prisma.booking.findFirst({ where: { courtId: court.id, status: { not: "CANCELLED" }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } }, select: { id: true } });
    if (clash) continue;
    await prisma.booking.create({ data: { clubId, courtId: court.id, memberId: b.memberId, walkInName: b.walkInName??null, startsAt, endsAt, kind: b.kind, status: b.status, source: b.memberId?"APP":"FRONT_DESK", listPrice: b.hour>=17?100000:60000, priceCharged: b.hour>=17?100000:60000, priceReason: "Standard rate", checkedInAt: b.checkedIn?startsAt:null, createdById: userId, createdAt: new Date(now.getTime()-2*86_400_000) } });
    created++;
  }
  return created;
}

// ─── Bar Tabs + Kitchen POS ───────────────────────────────────────────────────

async function seedRichBarTabs(clubId: string, members: { id: string; memberCode: string }[], byUserId: string) {
  const existingTabs = await prisma.barTab.count({ where: { clubId } });
  if (existingTabs > 0) return 0;
  const { openTab, addItems, settleTab, advanceKitchen } = await import("../lib/bar/engine");
  const sku = async (code: string) => (await prisma.product.findFirstOrThrow({ where: { clubId, sku: code }, select: { id: true } })).id;
  const tables = await prisma.barTable.findMany({ where: { clubId }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } });
  const tableByName = (name: string) => tables.find((t) => t.name === name);
  const memberById = (code: string) => members.find((m) => m.memberCode === code);
  const now = Date.now();

  const settled: Array<{ daysAgo: number; memberCode?: string; lines: Array<[string,number]>; mode: "UPI"|"CARD"|"CASH" }> = [
    { daysAgo:28, memberCode:"CC-0001", lines:[["BEV-CAP",2],["FOOD-CLUB",1]],                           mode:"UPI"  },
    { daysAgo:26, memberCode:"CC-0011", lines:[["BEV-SHAKE",2],["FOOD-BOWL",2],["BEV-WATER",2]],         mode:"CARD" },
    { daysAgo:24, memberCode:"CC-0012", lines:[["BEV-BEER",3],["FOOD-FRIES",2],["FOOD-CLUB",1]],         mode:"UPI"  },
    { daysAgo:22,                       lines:[["BEV-CLD",2],["FOOD-PANEER",1]],                          mode:"CASH" },
    { daysAgo:20, memberCode:"CC-0013", lines:[["BEV-LIME",2],["FOOD-SALAD",1],["BEV-WATER",1]],         mode:"UPI"  },
    { daysAgo:18, memberCode:"CC-0022", lines:[["BEV-BEER",2],["FOOD-BOWL",1]],                           mode:"CARD" },
    { daysAgo:16, memberCode:"CC-0007", lines:[["BEV-SHAKE",1],["FOOD-PANEER",1]],                        mode:"UPI"  },
    { daysAgo:14, memberCode:"CC-0015", lines:[["BEV-ISO",2],["FOOD-SALAD",1],["BEV-WATER",2]],           mode:"UPI"  },
    { daysAgo:12, memberCode:"CC-0001", lines:[["BEV-CAP",2],["FOOD-CLUB",1]],                            mode:"UPI"  },
    { daysAgo:10, memberCode:"CC-0014", lines:[["BEV-ESP",1],["FOOD-FRIES",1]],                           mode:"CASH" },
    { daysAgo:9,  memberCode:"CC-0016", lines:[["BEV-LIME",2],["FOOD-PANEER",1],["BEV-WATER",2]],         mode:"UPI"  },
    { daysAgo:8,                        lines:[["BEV-BEER",4],["FOOD-CLUB",2],["FOOD-FRIES",2]],          mode:"CARD" },
    { daysAgo:7,  memberCode:"CC-0028", lines:[["BEV-SHAKE",1],["FOOD-BOWL",1],["FOOD-BROWN",2]],         mode:"UPI"  },
    { daysAgo:6,  memberCode:"CC-0001", lines:[["BEV-CLD",1],["FOOD-BOWL",1],["FOOD-BROWN",1]],           mode:"UPI"  },
    { daysAgo:5,  memberCode:"CC-0011", lines:[["BEV-CAP",2],["FOOD-SALAD",1]],                           mode:"CARD" },
    { daysAgo:4,  memberCode:"CC-0003", lines:[["BEV-BEER",2],["FOOD-CLUB",1],["BEV-WATER",1]],           mode:"UPI"  },
    { daysAgo:3,  memberCode:"CC-0025", lines:[["BEV-SHAKE",1],["FOOD-BOWL",1]],                          mode:"CARD" },
    { daysAgo:2,  memberCode:"CC-0001", lines:[["BEV-LIME",2],["FOOD-FRIES",1],["BEV-WATER",1]],          mode:"CARD" },
    { daysAgo:1,  memberCode:"CC-0012", lines:[["BEV-BEER",3],["FOOD-PANEER",1],["FOOD-FRIES",1]],        mode:"UPI"  },
    { daysAgo:1,  memberCode:"CC-0022", lines:[["BEV-CLD",2],["FOOD-BOWL",1],["FOOD-BROWN",2]],           mode:"UPI"  },
  ];

  for (const s of settled) {
    const memberId = s.memberCode ? (memberById(s.memberCode)?.id??null) : null;
    const tabId = await openTab({ clubId, tableId: null, memberId, source: "POS", byUserId });
    const lines: { productId: string; qty: number }[] = [];
    for (const [code, qty] of s.lines) lines.push({ productId: await sku(code), qty });
    await addItems({ clubId, tabId, lines, byUserId });
    const fresh = await prisma.barTab.findUniqueOrThrow({ where: { id: tabId }, select: { total: true, items: { select: { id: true } } } });
    for (const it of fresh.items) await advanceKitchen({ clubId, itemId: it.id, to: "SERVED" });
    await settleTab({ clubId, tabId, payments: [{ mode: s.mode, amount: fresh.total }], byUserId });
    const at = new Date(now - s.daysAgo * 86_400_000 + 13 * 3_600_000);
    await prisma.barTab.update({ where: { id: tabId }, data: { openedAt: new Date(at.getTime()-50*60_000), settledAt: at } });
  }

  // Pre-cache SKUs for open tabs
  const openSkus = ["BEV-CAP","BEV-ESP","BEV-LIME","BEV-WATER","BEV-SHAKE","BEV-BEER","FOOD-BOWL","FOOD-PANEER","FOOD-CLUB","FOOD-FRIES","FOOD-BROWN"];
  const skuCache: Record<string,string> = {};
  for (const code of openSkus) skuCache[code] = await sku(code);

  const openSpecs: Array<{ tableName: string; memberCode?: string; lines: Array<{sku:string;qty:number;modifiers?:string[]}>; kitchenState: Record<string,"PREPARING"|"READY"|"SERVED"> }> = [
    { tableName:"T2", memberCode:"CC-0011", lines:[{sku:"BEV-CAP",qty:1,modifiers:["Oat milk"]},{sku:"FOOD-BOWL",qty:1,modifiers:["Extra sauce"]},{sku:"BEV-WATER",qty:1}],  kitchenState:{"BEV-CAP":"SERVED","FOOD-BOWL":"PREPARING","BEV-WATER":"SERVED"} },
    { tableName:"T3", memberCode:"CC-0012", lines:[{sku:"FOOD-PANEER",qty:1,modifiers:["Extra mint chutney"]},{sku:"BEV-LIME",qty:2}],                                       kitchenState:{"FOOD-PANEER":"READY","BEV-LIME":"SERVED"} },
    { tableName:"P1",                       lines:[{sku:"FOOD-CLUB",qty:1},{sku:"FOOD-FRIES",qty:1},{sku:"BEV-BEER",qty:2}],                                                 kitchenState:{"FOOD-CLUB":"PREPARING","FOOD-FRIES":"PREPARING","BEV-BEER":"SERVED"} },
    { tableName:"T4", memberCode:"CC-0001", lines:[{sku:"BEV-ESP",qty:1,modifiers:["Double shot"]},{sku:"FOOD-PANEER",qty:1,modifiers:["No onion"]},{sku:"BEV-WATER",qty:2}],kitchenState:{"BEV-ESP":"SERVED","FOOD-PANEER":"SERVED","BEV-WATER":"SERVED"} },
    { tableName:"C1", memberCode:"CC-0007", lines:[{sku:"BEV-SHAKE",qty:2,modifiers:["Chocolate"]},{sku:"FOOD-BROWN",qty:2}],                                                kitchenState:{"BEV-SHAKE":"SERVED","FOOD-BROWN":"READY"} },
  ];

  for (const spec of openSpecs) {
    const table = tableByName(spec.tableName);
    if (table) {
      const ex = await prisma.barTab.findFirst({ where: { tableId: table.id, status: "OPEN" }, select: { id: true } });
      if (ex) continue;
    }
    const memberId = spec.memberCode ? (memberById(spec.memberCode)?.id??null) : null;
    const tabId = await openTab({ clubId, tableId: table?.id??null, memberId, source: spec.memberCode?"QR":"POS", byUserId });
    const lines = spec.lines.map((l) => ({ productId: skuCache[l.sku], qty: l.qty, modifiers: l.modifiers }));
    await addItems({ clubId, tabId, lines, byUserId });
    for (const [skuCode, state] of Object.entries(spec.kitchenState)) {
      const productId = skuCache[skuCode];
      const item = await prisma.barTabItem.findFirst({ where: { tabId, productId }, select: { id: true } });
      if (item && state !== "PREPARING") await advanceKitchen({ clubId, itemId: item.id, to: state });
    }
  }

  return settled.length;
}

// ─── Shop Orders ─────────────────────────────────────────────────────────────

async function seedShopOrders(clubId: string, members: { id: string; memberCode: string }[], byUserId: string) {
  const existing = await prisma.shopOrder.count({ where: { clubId } });
  if (existing > 0) return 0;
  const { placeOnlineOrder } = await import("../lib/shop/engine");
  const findProduct = async (skuCode: string) => (await prisma.product.findFirstOrThrow({ where: { clubId, sku: skuCode }, select: { id: true } })).id;
  const memberById = (code: string) => members.find((m) => m.memberCode === code);
  const now = Date.now();
  const orders: Array<{ memberCode: string; lines: Array<{ sku: string; qty: number }>; status: "PENDING"|"PAID"|"PREPARING"|"READY_FOR_PICKUP"|"OUT_FOR_DELIVERY"|"COMPLETED"; daysAgo: number }> = [
    { memberCode:"CC-0001", lines:[{sku:"RKT-WPS97",qty:1},{sku:"ACC-GRIP",qty:2}], status:"READY_FOR_PICKUP",      daysAgo:2 },
    { memberCode:"CC-0011", lines:[{sku:"APP-TEE",qty:1},{sku:"APP-CAP",qty:1}],    status:"OUT_FOR_DELIVERY",  daysAgo:3 },
    { memberCode:"CC-0012", lines:[{sku:"RKT-BPD",qty:1}],                          status:"PREPARING",   daysAgo:1 },
    { memberCode:"CC-0013", lines:[{sku:"SHO-AGC",qty:1},{sku:"ACC-WRST",qty:1}],   status:"PAID",     daysAgo:0 },
    { memberCode:"CC-0014", lines:[{sku:"BAL-HPD3",qty:2},{sku:"ACC-DAMP",qty:1}],  status:"READY_FOR_PICKUP",       daysAgo:1 },
    { memberCode:"CC-0007", lines:[{sku:"ACC-GRIP",qty:3},{sku:"APP-CAP",qty:1}],   status:"COMPLETED",   daysAgo:7 },
    { memberCode:"CC-0022", lines:[{sku:"PDL-BUL",qty:1},{sku:"BAL-HPD3",qty:2}],  status:"OUT_FOR_DELIVERY",  daysAgo:4 },
    { memberCode:"CC-0025", lines:[{sku:"APP-TEE",qty:2},{sku:"ACC-WRST",qty:1}],   status:"PREPARING",   daysAgo:2 },
  ];
  let count = 0;
  for (const o of orders) {
    const member = memberById(o.memberCode);
    if (!member) continue;
    const lines = [];
    for (const l of o.lines) lines.push({ productId: await findProduct(l.sku), qty: l.qty });
    try {
      const res = await placeOnlineOrder({ clubId, memberId: member.id, fulfilment: "CLICK_COLLECT", lines });
      if (o.status !== "PENDING") await prisma.shopOrder.update({ where: { id: res.id }, data: { status: o.status } });
      if (o.daysAgo > 0) await prisma.shopOrder.update({ where: { id: res.id }, data: { createdAt: new Date(now - o.daysAgo * 86_400_000 + 10 * 3_600_000) } });
      count++;
    } catch { /* skip if stock exhausted */ }
  }
  return count;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding Playora…\n");

  const club = await seedClub();
  console.log(`  ✅ club     ${club.name}`);

  const { staffUsers, memberUsers } = await seedUsers(club.id);
  for (const u of staffUsers) console.log(`  ✅ user     ${u.role.padEnd(10)} ${u.email}`);
  for (const u of memberUsers) console.log(`  ✅ member   MEMBER     ${u.email}`);

  const plans = await seedPlans(club.id);
  console.log(`  ✅ plans    ${plans.map((p) => p.name).join(", ")}`);

  const courts = await seedCourts(club.id);
  console.log(`  ✅ courts   ${courts.length}`);

  const members = await seedMembers(club.id, plans);
  console.log(`  ✅ members  ${members.length}`);

  for (const u of memberUsers) {
    const member = await prisma.member.findUnique({ where: { memberCode: u.memberCode }, select: { id: true } });
    if (member) await prisma.user.update({ where: { id: u.id }, data: { memberId: member.id } });
  }
  console.log(`  ✅ linked   ${memberUsers.length} member logins`);

  const products = await seedProducts(club.id);
  console.log(`  ✅ products ${products.length}`);

  const tables = await seedTables(club.id);
  console.log(`  ✅ tables   ${tables.length}`);

  const owner = staffUsers.find((u) => u.role === "OWNER")!;
  const leadsCreated = await seedLeads(club.id, plans, owner.id);
  console.log(`  ✅ leads    ${leadsCreated} / ${LEADS.length}`);

  const ledgerRows = await seedLedgerHistory(club.id, club.timezone, courts, members, owner.id);
  console.log(`  ✅ ledger   ${ledgerRows} rows`);

  const invoices = await seedInvoices(club.id, members, owner.id);
  console.log(`  ✅ invoices ${invoices}`);

  const payables = await seedPayables(club.id, owner.id);
  console.log(`  ✅ payables ${payables}`);

  const employees = await seedHr(club.id, club.timezone, staffUsers);
  console.log(`  ✅ employees ${employees}`);

  const coach = staffUsers.find((u) => u.role === "COACH")!;
  const coaching = await seedCoaching(club.id, club.timezone, coach.id, courts, members);
  console.log(`  ✅ coaching ${coaching.sessions} sessions, ${coaching.notes} notes`);

  const todayBookings = await seedTodayBookings(club.id, club.timezone, courts, members as any, owner.id);
  console.log(`  ✅ today    ${todayBookings} court bookings`);

  const barTabs = await seedRichBarTabs(club.id, members as any, owner.id);
  console.log(`  ✅ bar      ${barTabs} settled + 5 open kitchen tickets`);

  const shopOrders = await seedShopOrders(club.id, members as any, owner.id);
  console.log(`  ✅ shop     ${shopOrders} orders`);

  await seedActivity(club.id, owner.id);

  console.log("\n✨ Done! Password for all accounts: demo1234");
  console.log("\nMember logins:");
  for (const u of memberUsers) console.log(`   ${u.email}`);
}

main()
  .catch((e) => { console.error("Seed failed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
