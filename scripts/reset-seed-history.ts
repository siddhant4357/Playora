/**
 * Removes only the back-dated demo history written by prisma/seed.ts
 * (ledger rows tagged refType="SeedHistory" and the bookings linked to them),
 * so the seed can regenerate it. Engine-posted rows are untouched.
 *
 *   npx tsx scripts/reset-seed-history.ts
 */
import { PrismaClient } from "../generated/prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const bookings = await prisma.booking.deleteMany({ where: { priceReason: "Seed history" } });
  const txns = await prisma.transaction.deleteMany({ where: { refType: "SeedHistory" } });
  console.log(`Removed ${bookings.count} seed bookings and ${txns.count} seed ledger rows.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
