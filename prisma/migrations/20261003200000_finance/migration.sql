-- CreateEnum
CREATE TYPE "InvoiceKind" AS ENUM ('MEMBERSHIP', 'CORPORATE', 'OTHER');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('ISSUED', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "PayableKind" AS ENUM ('SUPPLIER', 'SALARY', 'REFUND', 'TAX', 'OTHER');

-- CreateEnum
CREATE TYPE "PayableStatus" AS ENUM ('PENDING', 'PAID', 'VOID');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TxSource" ADD VALUE 'CORPORATE';
ALTER TYPE "TxSource" ADD VALUE 'PAYROLL';
ALTER TYPE "TxSource" ADD VALUE 'SUPPLIER';

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "hashId" SERIAL NOT NULL,
    "clubId" TEXT NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "kind" "InvoiceKind" NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'ISSUED',
    "memberId" TEXT,
    "billToName" TEXT NOT NULL,
    "billToEmail" TEXT,
    "billToPhone" TEXT,
    "billToAddress" TEXT,
    "billToGstin" TEXT,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "tax" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "notes" TEXT,
    "paidAt" TIMESTAMP(3),
    "paymentMode" "PaymentMode",
    "transactionId" TEXT,
    "voidReason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "taxRatePct" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "tax" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payables" (
    "id" TEXT NOT NULL,
    "hashId" SERIAL NOT NULL,
    "clubId" TEXT NOT NULL,
    "kind" "PayableKind" NOT NULL,
    "status" "PayableStatus" NOT NULL DEFAULT 'PENDING',
    "payee" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "amount" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "memberId" TEXT,
    "paidAt" TIMESTAMP(3),
    "paymentMode" "PaymentMode",
    "transactionId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_shares" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoices_hashId_key" ON "invoices"("hashId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNo_key" ON "invoices"("invoiceNo");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_transactionId_key" ON "invoices"("transactionId");

-- CreateIndex
CREATE INDEX "invoices_clubId_status_idx" ON "invoices"("clubId", "status");

-- CreateIndex
CREATE INDEX "invoices_clubId_issueDate_idx" ON "invoices"("clubId", "issueDate");

-- CreateIndex
CREATE INDEX "invoice_items_invoiceId_idx" ON "invoice_items"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "payables_hashId_key" ON "payables"("hashId");

-- CreateIndex
CREATE UNIQUE INDEX "payables_transactionId_key" ON "payables"("transactionId");

-- CreateIndex
CREATE INDEX "payables_clubId_status_dueDate_idx" ON "payables"("clubId", "status", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "report_shares_token_key" ON "report_shares"("token");

-- CreateIndex
CREATE INDEX "report_shares_token_idx" ON "report_shares"("token");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payables" ADD CONSTRAINT "payables_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payables" ADD CONSTRAINT "payables_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payables" ADD CONSTRAINT "payables_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_shares" ADD CONSTRAINT "report_shares_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
