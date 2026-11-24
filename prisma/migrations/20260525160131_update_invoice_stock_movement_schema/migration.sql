/*
  Warnings:

  - The values [STOCK_RETURN] on the enum `StockMovementReason` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `quantity_after` to the `inv_stock_movements` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quantity_before` to the `inv_stock_movements` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "StockMovementReason_new" AS ENUM ('PURCHASE', 'SALE', 'RETURN', 'DISPOSAL', 'DAMAGED', 'TRANSFER', 'ADJUSTMENT');
ALTER TABLE "inv_stock_movements" ALTER COLUMN "reason" TYPE "StockMovementReason_new" USING ("reason"::text::"StockMovementReason_new");
ALTER TYPE "StockMovementReason" RENAME TO "StockMovementReason_old";
ALTER TYPE "StockMovementReason_new" RENAME TO "StockMovementReason";
DROP TYPE "public"."StockMovementReason_old";
COMMIT;

-- AlterTable
ALTER TABLE "inv_stock_movements" ADD COLUMN     "quantity_after" INTEGER NOT NULL,
ADD COLUMN     "quantity_before" INTEGER NOT NULL,
ADD COLUMN     "sale_detail_id" INTEGER,
ADD COLUMN     "stock_disposal_detail_id" INTEGER,
ADD COLUMN     "stock_return_detail_id" INTEGER;

-- AddForeignKey
ALTER TABLE "inv_stock_movements" ADD CONSTRAINT "inv_stock_movements_sale_detail_id_fkey" FOREIGN KEY ("sale_detail_id") REFERENCES "trx_sale_details"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_stock_movements" ADD CONSTRAINT "inv_stock_movements_stock_return_detail_id_fkey" FOREIGN KEY ("stock_return_detail_id") REFERENCES "trx_stock_return_details"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_stock_movements" ADD CONSTRAINT "inv_stock_movements_stock_disposal_detail_id_fkey" FOREIGN KEY ("stock_disposal_detail_id") REFERENCES "trx_stock_disposal_details"("id") ON DELETE SET NULL ON UPDATE CASCADE;
