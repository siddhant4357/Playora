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

async function main() {
  console.log("Seeding Yolla…");

  const club = await seedClub();
  console.log(`  club    ${club.name} (${club.slug})`);

  const users = await seedUsers(club.id);
  for (const u of users) console.log(`  user    ${u.role.padEnd(10)} ${u.email}`);

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
