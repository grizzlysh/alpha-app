/*
  Warnings:

  - The values [PARTIAL,DELETED] on the enum `PurchaseOrderStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `invoice_id` on the `inv_stock_movements` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `trx_invoices` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PurchaseOrderStatus_new" AS ENUM ('DRAFT', 'SENT', 'COMPLETED', 'CANCELLED');
ALTER TABLE "public"."trx_purchase_orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "trx_purchase_orders" ALTER COLUMN "status" TYPE "PurchaseOrderStatus_new" USING ("status"::text::"PurchaseOrderStatus_new");
ALTER TYPE "PurchaseOrderStatus" RENAME TO "PurchaseOrderStatus_old";
ALTER TYPE "PurchaseOrderStatus_new" RENAME TO "PurchaseOrderStatus";
DROP TYPE "public"."PurchaseOrderStatus_old";
ALTER TABLE "trx_purchase_orders" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- DropForeignKey
ALTER TABLE "inv_stock_movements" DROP CONSTRAINT "inv_stock_movements_invoice_id_fkey";

-- AlterTable
ALTER TABLE "inv_stock_movements" DROP COLUMN "invoice_id",
ADD COLUMN     "invoice_detail_id" INTEGER;

-- AlterTable
ALTER TABLE "trx_invoices" DROP COLUMN "status";

-- AlterTable
ALTER TABLE "trx_purchase_order_details" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by_id" INTEGER;

-- DropEnum
DROP TYPE "InvoiceStatus";

-- AddForeignKey
ALTER TABLE "trx_purchase_order_details" ADD CONSTRAINT "trx_purchase_order_details_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_stock_movements" ADD CONSTRAINT "inv_stock_movements_invoice_detail_id_fkey" FOREIGN KEY ("invoice_detail_id") REFERENCES "trx_invoice_details"("id") ON DELETE SET NULL ON UPDATE CASCADE;
