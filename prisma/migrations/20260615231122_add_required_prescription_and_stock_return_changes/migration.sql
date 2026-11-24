-- Add required_prescription to mst_medicine_types (fills existing rows with false via DEFAULT)
ALTER TABLE "mst_medicine_types" ADD COLUMN IF NOT EXISTS "required_prescription" BOOLEAN NOT NULL DEFAULT false;

-- Normalize any legacy StockReturnStatus values before rebuilding the enum
UPDATE "trx_stock_returns" SET "status" = 'COMPLETED'
WHERE "status"::text NOT IN ('ON_PROCESS', 'COMPLETED', 'CANCELLED', 'REJECTED');

-- Rebuild StockReturnStatus to its final shape (ON_PROCESS, COMPLETED, CANCELLED, REJECTED)
-- Recreating unconditionally avoids unsafe same-transaction use of newly added enum values
ALTER TYPE "StockReturnStatus" RENAME TO "StockReturnStatus_old";
CREATE TYPE "StockReturnStatus" AS ENUM ('ON_PROCESS', 'COMPLETED', 'CANCELLED', 'REJECTED');
ALTER TABLE "trx_stock_returns" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "trx_stock_returns" ALTER COLUMN "status" TYPE "StockReturnStatus" USING ("status"::text::"StockReturnStatus");
ALTER TABLE "trx_stock_returns" ALTER COLUMN "status" SET DEFAULT 'ON_PROCESS'::"StockReturnStatus";
DROP TYPE "StockReturnStatus_old";

-- Add columns to trx_stock_returns
ALTER TABLE "trx_stock_returns" ADD COLUMN IF NOT EXISTS "reason" TEXT;
ALTER TABLE "trx_stock_returns" ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT;
ALTER TABLE "trx_stock_returns" ADD COLUMN IF NOT EXISTS "total_amount" DECIMAL(12, 0) NOT NULL DEFAULT 0;

-- Add columns to trx_stock_return_details
ALTER TABLE "trx_stock_return_details" ADD COLUMN IF NOT EXISTS "price" DECIMAL(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE "trx_stock_return_details" ADD COLUMN IF NOT EXISTS "total_amount" DECIMAL(12, 2) NOT NULL DEFAULT 0;
