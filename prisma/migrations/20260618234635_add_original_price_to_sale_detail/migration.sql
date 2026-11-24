-- AlterTable
ALTER TABLE "trx_sale_details" ADD COLUMN     "original_price" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "trx_sales" ALTER COLUMN "grand_total" DROP DEFAULT;
