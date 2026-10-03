-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('RACKET', 'BALL', 'SHOES', 'ACCESSORY', 'APPAREL', 'SERVICE', 'FOOD', 'BEVERAGE');

-- CreateEnum
CREATE TYPE "OrderChannel" AS ENUM ('COUNTER', 'ONLINE');

-- CreateEnum
CREATE TYPE "Fulfilment" AS ENUM ('TAKEAWAY', 'CLICK_COLLECT', 'DELIVERY');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ServiceJobStatus" AS ENUM ('RECEIVED', 'IN_PROGRESS', 'READY', 'COLLECTED');

-- CreateEnum
CREATE TYPE "TabStatus" AS ENUM ('OPEN', 'SETTLED', 'VOID');

-- CreateEnum
CREATE TYPE "KitchenStatus" AS ENUM ('NEW', 'PREPARING', 'READY', 'SERVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LeadStage" AS ENUM ('NEW', 'CONTACTED', 'QUOTE_SENT', 'TRIAL_BOOKED', 'CONVERTED', 'LOST');

-- CreateTable
CREATE TABLE "check_ins" (
    "id" TEXT NOT NULL,
    "hashId" SERIAL NOT NULL,
    "clubId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'QR',
    "byUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_notes" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "byUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "hashId" SERIAL NOT NULL,
    "clubId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "ProductCategory" NOT NULL,
    "price" INTEGER NOT NULL,
    "costPrice" INTEGER,
    "taxRatePct" INTEGER NOT NULL DEFAULT 18,
    "imageUrl" TEXT,
    "isForBar" BOOLEAN NOT NULL DEFAULT false,
    "isForShop" BOOLEAN NOT NULL DEFAULT true,
    "isService" BOOLEAN NOT NULL DEFAULT false,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "trackStock" BOOLEAN NOT NULL DEFAULT true,
    "stockQty" INTEGER NOT NULL DEFAULT 0,
    "lowStockAt" INTEGER NOT NULL DEFAULT 5,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "hashId" SERIAL NOT NULL,
    "clubId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "note" TEXT,
    "byUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_orders" (
    "id" TEXT NOT NULL,
    "hashId" SERIAL NOT NULL,
    "clubId" TEXT NOT NULL,
    "orderNo" TEXT NOT NULL,
    "memberId" TEXT,
    "guestName" TEXT,
    "guestPhone" TEXT,
    "guestEmail" TEXT,
    "channel" "OrderChannel" NOT NULL,
    "fulfilment" "Fulfilment" NOT NULL DEFAULT 'TAKEAWAY',
    "deliveryAddress" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "subtotal" INTEGER NOT NULL,
    "discountPct" INTEGER NOT NULL DEFAULT 0,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "tax" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "paymentMode" "PaymentMode",
    "transactionId" TEXT,
    "notes" TEXT,
    "byUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,

    CONSTRAINT "shop_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_jobs" (
    "id" TEXT NOT NULL,
    "hashId" SERIAL NOT NULL,
    "clubId" TEXT NOT NULL,
    "jobNo" TEXT NOT NULL,
    "memberId" TEXT,
    "customerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "status" "ServiceJobStatus" NOT NULL DEFAULT 'RECEIVED',
    "dueAt" TIMESTAMP(3) NOT NULL,
    "readyAt" TIMESTAMP(3),
    "collectedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bar_tables" (
    "id" TEXT NOT NULL,
    "hashId" SERIAL NOT NULL,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "zone" TEXT NOT NULL DEFAULT 'Indoor',
    "seats" INTEGER NOT NULL DEFAULT 4,
    "qrToken" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "bar_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bar_tabs" (
    "id" TEXT NOT NULL,
    "hashId" SERIAL NOT NULL,
    "clubId" TEXT NOT NULL,
    "tabNo" TEXT NOT NULL,
    "tableId" TEXT,
    "memberId" TEXT,
    "guestName" TEXT,
    "guestPhone" TEXT,
    "source" TEXT NOT NULL DEFAULT 'POS',
    "status" "TabStatus" NOT NULL DEFAULT 'OPEN',
    "openedById" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),
    "discountPct" INTEGER NOT NULL DEFAULT 0,
    "subtotal" INTEGER NOT NULL DEFAULT 0,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "tax" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "voidReason" TEXT,
    "shiftId" TEXT,

    CONSTRAINT "bar_tabs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bar_tab_items" (
    "id" TEXT NOT NULL,
    "hashId" SERIAL NOT NULL,
    "tabId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "modifiers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "needsKitchen" BOOLEAN NOT NULL DEFAULT true,
    "kitchenStatus" "KitchenStatus" NOT NULL DEFAULT 'NEW',
    "sentToKitchenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readyAt" TIMESTAMP(3),
    "servedAt" TIMESTAMP(3),
    "voidReason" TEXT,

    CONSTRAINT "bar_tab_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "tabId" TEXT NOT NULL,
    "mode" "PaymentMode" NOT NULL,
    "amount" INTEGER NOT NULL,
    "reference" TEXT,
    "byUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" TEXT NOT NULL,
    "hashId" SERIAL NOT NULL,
    "clubId" TEXT NOT NULL,
    "area" TEXT NOT NULL DEFAULT 'BAR',
    "openedById" TEXT NOT NULL,
    "openedByName" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "openingCash" INTEGER NOT NULL DEFAULT 0,
    "closingCash" INTEGER,
    "expectedCash" INTEGER,
    "notes" TEXT,
    "report" JSONB,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "hashId" SERIAL NOT NULL,
    "clubId" TEXT NOT NULL,
    "memberId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "interest" TEXT,
    "source" TEXT NOT NULL DEFAULT 'WEBSITE',
    "stage" "LeadStage" NOT NULL DEFAULT 'NEW',
    "message" TEXT,
    "assignedToId" TEXT,
    "nextFollowUp" TIMESTAMP(3),
    "lostReason" TEXT,
    "quotePlanId" TEXT,
    "quoteBilling" TEXT,
    "quoteAmount" INTEGER,
    "quoteSentAt" TIMESTAMP(3),
    "trialBookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_activities" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "byUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "check_ins_hashId_key" ON "check_ins"("hashId");

-- CreateIndex
CREATE INDEX "check_ins_clubId_createdAt_idx" ON "check_ins"("clubId", "createdAt");

-- CreateIndex
CREATE INDEX "check_ins_memberId_createdAt_idx" ON "check_ins"("memberId", "createdAt");

-- CreateIndex
CREATE INDEX "member_notes_memberId_createdAt_idx" ON "member_notes"("memberId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "products_hashId_key" ON "products"("hashId");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE INDEX "products_clubId_category_idx" ON "products"("clubId", "category");

-- CreateIndex
CREATE INDEX "products_clubId_isForBar_idx" ON "products"("clubId", "isForBar");

-- CreateIndex
CREATE UNIQUE INDEX "stock_movements_hashId_key" ON "stock_movements"("hashId");

-- CreateIndex
CREATE INDEX "stock_movements_productId_createdAt_idx" ON "stock_movements"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "stock_movements_clubId_createdAt_idx" ON "stock_movements"("clubId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "shop_orders_hashId_key" ON "shop_orders"("hashId");

-- CreateIndex
CREATE UNIQUE INDEX "shop_orders_orderNo_key" ON "shop_orders"("orderNo");

-- CreateIndex
CREATE UNIQUE INDEX "shop_orders_transactionId_key" ON "shop_orders"("transactionId");

-- CreateIndex
CREATE INDEX "shop_orders_clubId_status_idx" ON "shop_orders"("clubId", "status");

-- CreateIndex
CREATE INDEX "shop_orders_clubId_createdAt_idx" ON "shop_orders"("clubId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "service_jobs_hashId_key" ON "service_jobs"("hashId");

-- CreateIndex
CREATE UNIQUE INDEX "service_jobs_jobNo_key" ON "service_jobs"("jobNo");

-- CreateIndex
CREATE INDEX "service_jobs_clubId_status_idx" ON "service_jobs"("clubId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "bar_tables_hashId_key" ON "bar_tables"("hashId");

-- CreateIndex
CREATE UNIQUE INDEX "bar_tables_qrToken_key" ON "bar_tables"("qrToken");

-- CreateIndex
CREATE INDEX "bar_tables_clubId_zone_idx" ON "bar_tables"("clubId", "zone");

-- CreateIndex
CREATE UNIQUE INDEX "bar_tabs_hashId_key" ON "bar_tabs"("hashId");

-- CreateIndex
CREATE UNIQUE INDEX "bar_tabs_tabNo_key" ON "bar_tabs"("tabNo");

-- CreateIndex
CREATE INDEX "bar_tabs_clubId_status_idx" ON "bar_tabs"("clubId", "status");

-- CreateIndex
CREATE INDEX "bar_tabs_clubId_openedAt_idx" ON "bar_tabs"("clubId", "openedAt");

-- CreateIndex
CREATE UNIQUE INDEX "bar_tab_items_hashId_key" ON "bar_tab_items"("hashId");

-- CreateIndex
CREATE INDEX "bar_tab_items_tabId_idx" ON "bar_tab_items"("tabId");

-- CreateIndex
CREATE INDEX "bar_tab_items_kitchenStatus_sentToKitchenAt_idx" ON "bar_tab_items"("kitchenStatus", "sentToKitchenAt");

-- CreateIndex
CREATE UNIQUE INDEX "shifts_hashId_key" ON "shifts"("hashId");

-- CreateIndex
CREATE INDEX "shifts_clubId_startsAt_idx" ON "shifts"("clubId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "leads_hashId_key" ON "leads"("hashId");

-- CreateIndex
CREATE UNIQUE INDEX "leads_memberId_key" ON "leads"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "leads_trialBookingId_key" ON "leads"("trialBookingId");

-- CreateIndex
CREATE INDEX "leads_clubId_stage_idx" ON "leads"("clubId", "stage");

-- CreateIndex
CREATE INDEX "leads_clubId_nextFollowUp_idx" ON "leads"("clubId", "nextFollowUp");

-- CreateIndex
CREATE INDEX "lead_activities_leadId_createdAt_idx" ON "lead_activities"("leadId", "createdAt");

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_notes" ADD CONSTRAINT "member_notes_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_orders" ADD CONSTRAINT "shop_orders_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_orders" ADD CONSTRAINT "shop_orders_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_order_items" ADD CONSTRAINT "shop_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "shop_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_order_items" ADD CONSTRAINT "shop_order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_jobs" ADD CONSTRAINT "service_jobs_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_jobs" ADD CONSTRAINT "service_jobs_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bar_tables" ADD CONSTRAINT "bar_tables_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bar_tabs" ADD CONSTRAINT "bar_tabs_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bar_tabs" ADD CONSTRAINT "bar_tabs_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "bar_tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bar_tabs" ADD CONSTRAINT "bar_tabs_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bar_tabs" ADD CONSTRAINT "bar_tabs_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bar_tab_items" ADD CONSTRAINT "bar_tab_items_tabId_fkey" FOREIGN KEY ("tabId") REFERENCES "bar_tabs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bar_tab_items" ADD CONSTRAINT "bar_tab_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_tabId_fkey" FOREIGN KEY ("tabId") REFERENCES "bar_tabs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

