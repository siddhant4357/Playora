-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('GOLD', 'SILVER', 'JUNIOR');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('LEAD', 'TRIAL', 'ACTIVE', 'EXPIRED', 'FROZEN', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CourtType" AS ENUM ('TENNIS', 'CRICKET', 'BADMINTON', 'PADEL', 'PICKLEBALL');

-- CreateEnum
CREATE TYPE "CourtSurface" AS ENUM ('HARD', 'CLAY', 'GRASS', 'SYNTHETIC', 'INDOOR');

-- CreateEnum
CREATE TYPE "DayType" AS ENUM ('WEEKDAY', 'WEEKEND');

-- CreateEnum
CREATE TYPE "BookingKind" AS ENUM ('PRIVATE', 'SOCIAL', 'COACHING', 'MAINTENANCE', 'TRIAL');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('CONFIRMED', 'CANCELLED', 'NO_SHOW', 'COMPLETED');

-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('WEB', 'APP', 'FRONT_DESK', 'PHONE', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('WAITING', 'OFFERED', 'CONFIRMED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('CASH', 'CARD', 'UPI', 'ONLINE', 'CREDIT', 'COMPLIMENTARY');

-- CreateEnum
CREATE TYPE "TxSource" AS ENUM ('COURT', 'SHOP', 'BAR', 'MEMBERSHIP', 'COACHING', 'EVENT', 'REFUND', 'OTHER');

-- CreateEnum
CREATE TYPE "TxDirection" AS ENUM ('IN', 'OUT');

-- AlterTable
ALTER TABLE "clubs" ADD COLUMN     "settings" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "memberId" TEXT;

-- CreateTable
CREATE TABLE "membership_plans" (
    "id" TEXT NOT NULL,
    "hashId" SERIAL NOT NULL,
    "clubId" TEXT NOT NULL,
    "tier" "PlanTier" NOT NULL,
    "name" TEXT NOT NULL,
    "priceMonthly" INTEGER NOT NULL,
    "priceYearly" INTEGER NOT NULL,
    "courtDiscountPct" INTEGER NOT NULL DEFAULT 0,
    "shopDiscountPct" INTEGER NOT NULL DEFAULT 0,
    "barDiscountPct" INTEGER NOT NULL DEFAULT 0,
    "maxBookingsPerDay" INTEGER NOT NULL DEFAULT 2,
    "advanceBookingDays" INTEGER NOT NULL DEFAULT 7,
    "guestPassesPerMonth" INTEGER NOT NULL DEFAULT 0,
    "benefits" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "hashId" SERIAL NOT NULL,
    "clubId" TEXT NOT NULL,
    "memberCode" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "photoUrl" TEXT,
    "emergencyContact" TEXT,
    "status" "MemberStatus" NOT NULL DEFAULT 'LEAD',
    "planId" TEXT,
    "startDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "skillRating" INTEGER NOT NULL DEFAULT 3,
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "qrToken" TEXT NOT NULL,
    "creditBalance" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courts" (
    "id" TEXT NOT NULL,
    "hashId" SERIAL NOT NULL,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CourtType" NOT NULL,
    "surface" "CourtSurface",
    "isIndoor" BOOLEAN NOT NULL DEFAULT false,
    "hasLights" BOOLEAN NOT NULL DEFAULT true,
    "capacity" INTEGER NOT NULL DEFAULT 4,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "court_pricing" (
    "id" TEXT NOT NULL,
    "courtId" TEXT NOT NULL,
    "dayType" "DayType" NOT NULL,
    "startHour" INTEGER NOT NULL,
    "endHour" INTEGER NOT NULL,
    "walkInPrice" INTEGER NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "court_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "hashId" SERIAL NOT NULL,
    "clubId" TEXT NOT NULL,
    "courtId" TEXT NOT NULL,
    "memberId" TEXT,
    "walkInName" TEXT,
    "walkInPhone" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "kind" "BookingKind" NOT NULL DEFAULT 'PRIVATE',
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "source" "BookingSource" NOT NULL DEFAULT 'WEB',
    "listPrice" INTEGER NOT NULL,
    "discountPct" INTEGER NOT NULL DEFAULT 0,
    "priceCharged" INTEGER NOT NULL,
    "priceReason" TEXT,
    "transactionId" TEXT,
    "checkedInAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "creditIssued" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitlist" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "courtId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'WAITING',
    "offeredAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waitlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "hashId" SERIAL NOT NULL,
    "clubId" TEXT NOT NULL,
    "memberId" TEXT,
    "source" "TxSource" NOT NULL,
    "direction" "TxDirection" NOT NULL DEFAULT 'IN',
    "amount" INTEGER NOT NULL,
    "tax" INTEGER NOT NULL DEFAULT 0,
    "paymentMode" "PaymentMode" NOT NULL,
    "reference" TEXT,
    "refType" TEXT,
    "refId" TEXT,
    "description" TEXT NOT NULL,
    "byUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "membership_plans_hashId_key" ON "membership_plans"("hashId");

-- CreateIndex
CREATE UNIQUE INDEX "membership_plans_clubId_tier_key" ON "membership_plans"("clubId", "tier");

-- CreateIndex
CREATE UNIQUE INDEX "members_hashId_key" ON "members"("hashId");

-- CreateIndex
CREATE UNIQUE INDEX "members_memberCode_key" ON "members"("memberCode");

-- CreateIndex
CREATE UNIQUE INDEX "members_qrToken_key" ON "members"("qrToken");

-- CreateIndex
CREATE INDEX "members_clubId_phone_idx" ON "members"("clubId", "phone");

-- CreateIndex
CREATE INDEX "members_clubId_status_idx" ON "members"("clubId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "courts_hashId_key" ON "courts"("hashId");

-- CreateIndex
CREATE INDEX "courts_clubId_isActive_idx" ON "courts"("clubId", "isActive");

-- CreateIndex
CREATE INDEX "court_pricing_courtId_dayType_idx" ON "court_pricing"("courtId", "dayType");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_hashId_key" ON "bookings"("hashId");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_transactionId_key" ON "bookings"("transactionId");

-- CreateIndex
CREATE INDEX "bookings_clubId_startsAt_idx" ON "bookings"("clubId", "startsAt");

-- CreateIndex
CREATE INDEX "bookings_courtId_startsAt_idx" ON "bookings"("courtId", "startsAt");

-- CreateIndex
CREATE INDEX "bookings_memberId_startsAt_idx" ON "bookings"("memberId", "startsAt");

-- CreateIndex
CREATE INDEX "waitlist_clubId_startsAt_status_idx" ON "waitlist"("clubId", "startsAt", "status");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_courtId_startsAt_memberId_key" ON "waitlist"("courtId", "startsAt", "memberId");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_hashId_key" ON "transactions"("hashId");

-- CreateIndex
CREATE INDEX "transactions_clubId_createdAt_idx" ON "transactions"("clubId", "createdAt");

-- CreateIndex
CREATE INDEX "transactions_clubId_source_idx" ON "transactions"("clubId", "source");

-- CreateIndex
CREATE UNIQUE INDEX "users_memberId_key" ON "users"("memberId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_plans" ADD CONSTRAINT "membership_plans_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_planId_fkey" FOREIGN KEY ("planId") REFERENCES "membership_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courts" ADD CONSTRAINT "courts_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "court_pricing" ADD CONSTRAINT "court_pricing_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "courts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "courts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "courts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_byUserId_fkey" FOREIGN KEY ("byUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ─────────────────────────────────────────────────────────────────────
-- Double-booking guarantee (CONTEXT.md §5.1).
-- Prisma cannot express exclusion constraints, so it lives here.
-- Two CONFIRMED, non-social bookings can never overlap on one court,
-- regardless of how many app servers race each other.
-- ─────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "bookings"
  ADD CONSTRAINT booking_no_overlap
  EXCLUDE USING gist (
    "courtId" WITH =,
    tsrange("startsAt", "endsAt", '[)') WITH &&
  )
  WHERE ("status" = 'CONFIRMED' AND "kind" IN ('PRIVATE', 'COACHING', 'TRIAL', 'MAINTENANCE'));
