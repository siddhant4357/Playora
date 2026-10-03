/**
 * lib/db.ts
 *
 * Singleton Prisma Client instance.
 * In Next.js dev mode, hot-reload would create a new PrismaClient on every
 * module reload, exhausting the database connection pool. We store the
 * instance on `globalThis` in development to reuse it across reloads.
 *
 * Prisma v7 requires a driver adapter — @prisma/adapter-pg works with both
 * local PostgreSQL and Prisma Postgres cloud (just change DATABASE_URL).
 */

import { PrismaClient } from "../generated/prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
