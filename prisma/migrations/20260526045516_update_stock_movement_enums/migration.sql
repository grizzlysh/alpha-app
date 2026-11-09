-- AlterEnum
ALTER TYPE "StockMovementReason" ADD VALUE 'DONATION';

-- AlterTable
ALTER TABLE "trx_sale_details" ADD COLUMN     "is_fefo_override" BOOLEAN NOT NULL DEFAULT false;
