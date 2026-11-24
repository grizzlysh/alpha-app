/*
  Warnings:

  - You are about to drop the column `notes` on the `inv_stock_movements` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `trx_invoice_payment_history` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `trx_invoices` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `trx_purchase_order_details` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `trx_purchase_orders` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `trx_sale_payment_history` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `trx_sales` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `trx_stock_disposals` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `trx_stock_returns` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "inv_stock_movements" DROP COLUMN "notes",
ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "mst_customers" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "mst_distributors" ADD COLUMN     "contact_person" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "permit_number" TEXT;

-- AlterTable
ALTER TABLE "trx_invoice_payment_history" DROP COLUMN "notes",
ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "trx_invoices" DROP COLUMN "notes",
ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "trx_purchase_order_details" DROP COLUMN "notes",
ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "trx_purchase_orders" DROP COLUMN "notes",
ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "trx_sale_payment_history" DROP COLUMN "notes",
ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "trx_sales" DROP COLUMN "notes",
ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "trx_stock_disposals" DROP COLUMN "notes",
ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "trx_stock_returns" DROP COLUMN "notes",
ADD COLUMN     "description" TEXT;
