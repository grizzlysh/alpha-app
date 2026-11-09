/*
  Warnings:

  - Added the required column `grand_total` to the `trx_invoices` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "trx_invoices"
ADD COLUMN "ppn_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN "ppn_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "grand_total" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Backfill grand_total for existing rows (no PPN, so grand_total = total_amount)
UPDATE "trx_invoices" SET "grand_total" = "total_amount" WHERE "grand_total" = 0;

-- Drop the temporary default so future inserts must supply the value explicitly
ALTER TABLE "trx_invoices" ALTER COLUMN "grand_total" DROP DEFAULT;
