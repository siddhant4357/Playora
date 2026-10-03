-- Roles + Club (tenant). Hand-written so it is safe to run against a database
-- that already has users: existing ADMIN rows become OWNER and every row is
-- attached to the default club before the column becomes NOT NULL.

-- CreateTable
CREATE TABLE "clubs" (
    "id" TEXT NOT NULL,
    "hashId" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tagline" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "opensAt" TEXT NOT NULL DEFAULT '06:00',
    "closesAt" TEXT NOT NULL DEFAULT '23:00',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clubs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "clubs_hashId_key" ON "clubs"("hashId");
CREATE UNIQUE INDEX "clubs_slug_key" ON "clubs"("slug");

-- Default tenant. The seed script upserts on this slug, so the id is stable.
INSERT INTO "clubs" ("id", "name", "slug", "tagline", "updatedAt")
VALUES ('club_champions', 'The Champions Club', 'champions', 'Courts, members, bar and shop on one screen.', CURRENT_TIMESTAMP);

-- Expand the Role enum: new type, cast with ADMIN -> OWNER, swap.
CREATE TYPE "Role_new" AS ENUM ('OWNER', 'MANAGER', 'FRONT_DESK', 'BAR_STAFF', 'KITCHEN', 'COACH', 'MEMBER');
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users"
  ALTER COLUMN "role" TYPE "Role_new"
  USING (CASE WHEN "role"::text = 'ADMIN' THEN 'OWNER' ELSE "role"::text END)::"Role_new";
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'MEMBER';

-- users.clubId (backfill, then enforce)
ALTER TABLE "users" ADD COLUMN "phone" TEXT;
ALTER TABLE "users" ADD COLUMN "clubId" TEXT;
UPDATE "users" SET "clubId" = 'club_champions' WHERE "clubId" IS NULL;
ALTER TABLE "users" ALTER COLUMN "clubId" SET NOT NULL;
ALTER TABLE "users" ADD CONSTRAINT "users_clubId_fkey"
  FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "users_clubId_role_idx" ON "users"("clubId", "role");

-- activity_logs.clubId (nullable: system events have no tenant)
ALTER TABLE "activity_logs" ADD COLUMN "clubId" TEXT;
UPDATE "activity_logs" SET "clubId" = 'club_champions';
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_clubId_fkey"
  FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "activity_logs_clubId_createdAt_idx" ON "activity_logs"("clubId", "createdAt");
