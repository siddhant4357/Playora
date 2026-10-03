/**
 * prisma/seed.ts
 *
 * Seeds the database with:
 *   - 1 admin user  (admin@ldxodoo.dev / Admin@123!)
 *   - 1 member user (member@ldxodoo.dev / Member@123!)
 *   - Sample ActivityLog rows with realistic data
 *
 * Run with:  npx prisma db seed
 * Requires DATABASE_URL to be set and migrations to have been applied.
 */

import { PrismaClient, Role } from "../generated/prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const SALT_ROUNDS = 12;

async function main() {
  console.log("🌱  Starting seed…");

  // ── Clear existing seed data (idempotent) ──
  await prisma.activityLog.deleteMany({});
  await prisma.user.deleteMany({});

  // ── Create users ──
  const adminPassword = await bcrypt.hash("Admin@123!", SALT_ROUNDS);
  const admin = await prisma.user.create({
    data: {
      email: "admin@ldxodoo.dev",
      passwordHash: adminPassword,
      name: "Arjun Sharma",
      role: Role.ADMIN,
    },
  });

  const memberPassword = await bcrypt.hash("Member@123!", SALT_ROUNDS);
  const member = await prisma.user.create({
    data: {
      email: "member@ldxodoo.dev",
      passwordHash: memberPassword,
      name: "Priya Nair",
      role: Role.MEMBER,
    },
  });

  console.log(`✅  Created users: ${admin.email}, ${member.email}`);

  // ── Create realistic ActivityLog rows ──
  const now = new Date();
  const minutesAgo = (m: number) => new Date(now.getTime() - m * 60 * 1000);

  const logs = await prisma.activityLog.createMany({
    data: [
      {
        action: "USER_SIGNUP",
        entity: "User",
        entityId: admin.id,
        oldData: undefined,
        newData: { email: admin.email, name: admin.name, role: "ADMIN" },
        userId: admin.id,
        ipAddress: "127.0.0.1",
        userAgent: "Mozilla/5.0 (seed script)",
        createdAt: minutesAgo(120),
      },
      {
        action: "USER_SIGNUP",
        entity: "User",
        entityId: member.id,
        oldData: undefined,
        newData: { email: member.email, name: member.name, role: "MEMBER" },
        userId: member.id,
        ipAddress: "127.0.0.1",
        userAgent: "Mozilla/5.0 (seed script)",
        createdAt: minutesAgo(90),
      },
      {
        action: "USER_LOGIN",
        entity: "User",
        entityId: admin.id,
        oldData: undefined,
        newData: { status: "authenticated" },
        userId: admin.id,
        ipAddress: "192.168.1.10",
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
        createdAt: minutesAgo(60),
      },
      {
        action: "USER_LOGIN",
        entity: "User",
        entityId: member.id,
        oldData: undefined,
        newData: { status: "authenticated" },
        userId: member.id,
        ipAddress: "192.168.1.42",
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
        createdAt: minutesAgo(30),
      },
      {
        action: "USER_LOGIN",
        entity: "User",
        entityId: admin.id,
        oldData: undefined,
        newData: { status: "authenticated" },
        userId: admin.id,
        ipAddress: "192.168.1.10",
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
        createdAt: minutesAgo(5),
      },
    ],
  });

  console.log(`✅  Created ${logs.count} ActivityLog entries`);
  console.log("\n🎉  Seed complete!");
  console.log("   Admin:  admin@ldxodoo.dev   / Admin@123!");
  console.log("   Member: member@ldxodoo.dev  / Member@123!");
}

main()
  .catch((e) => {
    console.error("❌  Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
