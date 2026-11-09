/*
  Warnings:

  - You are about to drop the column `created_by` on the `inv_stock_details` table. All the data in the column will be lost.
  - You are about to drop the column `updated_by` on the `inv_stock_details` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `inv_stock_movements` table. All the data in the column will be lost.
  - You are about to drop the column `updated_by` on the `inv_stock_movements` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `inv_stocks` table. All the data in the column will be lost.
  - You are about to drop the column `updated_by` on the `inv_stocks` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `mst_business_parameters` table. All the data in the column will be lost.
  - You are about to drop the column `updated_by` on the `mst_business_parameters` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `mst_customers` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_by` on the `mst_customers` table. All the data in the column will be lost.
  - You are about to drop the column `updated_by` on the `mst_customers` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `mst_distributors` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_by` on the `mst_distributors` table. All the data in the column will be lost.
  - You are about to drop the column `updated_by` on the `mst_distributors` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `mst_medicine_classes` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_by` on the `mst_medicine_classes` table. All the data in the column will be lost.
  - You are about to drop the column `updated_by` on the `mst_medicine_classes` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `mst_medicine_shapes` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_by` on the `mst_medicine_shapes` table. All the data in the column will be lost.
  - You are about to drop the column `updated_by` on the `mst_medicine_shapes` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `mst_medicine_types` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_by` on the `mst_medicine_types` table. All the data in the column will be lost.
  - You are about to drop the column `updated_by` on the `mst_medicine_types` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `mst_medicines` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_by` on the `mst_medicines` table. All the data in the column will be lost.
  - You are about to drop the column `generic_name` on the `mst_medicines` table. All the data in the column will be lost.
  - You are about to drop the column `reorder_level` on the `mst_medicines` table. All the data in the column will be lost.
  - You are about to drop the column `updated_by` on the `mst_medicines` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `mst_permissions` table. All the data in the column will be lost.
  - You are about to drop the column `updated_by` on the `mst_permissions` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `mst_pharmacies` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_by` on the `mst_pharmacies` table. All the data in the column will be lost.
  - You are about to drop the column `updated_by` on the `mst_pharmacies` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `mst_role_permissions` table. All the data in the column will be lost.
  - You are about to drop the column `updated_by` on the `mst_role_permissions` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `mst_roles` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_by` on the `mst_roles` table. All the data in the column will be lost.
  - You are about to drop the column `updated_by` on the `mst_roles` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `mst_system_parameters` table. All the data in the column will be lost.
  - You are about to drop the column `updated_by` on the `mst_system_parameters` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `mst_user_pharmacies` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_by` on the `mst_user_pharmacies` table. All the data in the column will be lost.
  - You are about to drop the column `updated_by` on the `mst_user_pharmacies` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `mst_user_tokens` table. All the data in the column will be lost.
  - You are about to drop the column `updated_by` on the `mst_user_tokens` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `mst_users` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_by` on the `mst_users` table. All the data in the column will be lost.
  - You are about to drop the column `updated_by` on the `mst_users` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `trx_invoice_details` table. All the data in the column will be lost.
  - You are about to drop the column `updated_by` on the `trx_invoice_details` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `trx_invoice_payment_history` table. All the data in the column will be lost.
  - You are about to drop the column `updated_by` on the `trx_invoice_payment_history` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `trx_invoice_payments` table. All the data in the column will be lost.
  - You are about to drop the column `updated_by` on the `trx_invoice_payments` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `trx_invoices` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_by` on the `trx_invoices` table. All the data in the column will be lost.
  - You are about to drop the column `updated_by` on the `trx_invoices` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `trx_purchase_order_details` table. All the data in the column will be lost.
  - You are about to drop the column `updated_by` on the `trx_purchase_order_details` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `trx_purchase_orders` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_by` on the `trx_purchase_orders` table. All the data in the column will be lost.
  - You are about to drop the column `updated_by` on the `trx_purchase_orders` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `trx_sale_details` table. All the data in the column will be lost.
  - You are about to drop the column `updated_by` on the `trx_sale_details` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `trx_sale_payment_history` table. All the data in the column will be lost.
  - You are about to drop the column `updated_by` on the `trx_sale_payment_history` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `trx_sale_payments` table. All the data in the column will be lost.
  - You are about to drop the column `updated_by` on the `trx_sale_payments` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `trx_sales` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_by` on the `trx_sales` table. All the data in the column will be lost.
  - You are about to drop the column `updated_by` on the `trx_sales` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `trx_stock_disposal_details` table. All the data in the column will be lost.
  - You are about to drop the column `updated_by` on the `trx_stock_disposal_details` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `trx_stock_disposals` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_by` on the `trx_stock_disposals` table. All the data in the column will be lost.
  - You are about to drop the column `updated_by` on the `trx_stock_disposals` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `trx_stock_return_details` table. All the data in the column will be lost.
  - You are about to drop the column `updated_by` on the `trx_stock_return_details` table. All the data in the column will be lost.
  - You are about to drop the column `created_by` on the `trx_stock_returns` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_by` on the `trx_stock_returns` table. All the data in the column will be lost.
  - You are about to drop the column `updated_by` on the `trx_stock_returns` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[pharmacy_id,name]` on the table `mst_medicines` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "inv_stock_movements" DROP CONSTRAINT "inv_stock_movements_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "trx_invoices" DROP CONSTRAINT "trx_invoices_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "trx_purchase_orders" DROP CONSTRAINT "trx_purchase_orders_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "trx_sales" DROP CONSTRAINT "trx_sales_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "trx_stock_disposals" DROP CONSTRAINT "trx_stock_disposals_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "trx_stock_returns" DROP CONSTRAINT "trx_stock_returns_created_by_id_fkey";

-- AlterTable
ALTER TABLE "inv_stock_details" DROP COLUMN "created_by",
DROP COLUMN "updated_by",
ADD COLUMN     "created_by_id" INTEGER,
ADD COLUMN     "updated_by_id" INTEGER;

-- AlterTable
ALTER TABLE "inv_stock_movements" DROP COLUMN "created_by",
DROP COLUMN "updated_by",
ADD COLUMN     "updated_by_id" INTEGER,
ALTER COLUMN "created_by_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "inv_stocks" DROP COLUMN "created_by",
DROP COLUMN "updated_by",
ADD COLUMN     "created_by_id" INTEGER,
ADD COLUMN     "reorder_level" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updated_by_id" INTEGER;

-- AlterTable
ALTER TABLE "mst_business_parameters" DROP COLUMN "created_by",
DROP COLUMN "updated_by",
ADD COLUMN     "created_by_id" INTEGER,
ADD COLUMN     "updated_by_id" INTEGER;

-- AlterTable
ALTER TABLE "mst_customers" DROP COLUMN "created_by",
DROP COLUMN "deleted_by",
DROP COLUMN "updated_by",
ADD COLUMN     "created_by_id" INTEGER,
ADD COLUMN     "deleted_by_id" INTEGER,
ADD COLUMN     "updated_by_id" INTEGER;

-- AlterTable
ALTER TABLE "mst_distributors" DROP COLUMN "created_by",
DROP COLUMN "deleted_by",
DROP COLUMN "updated_by",
ADD COLUMN     "created_by_id" INTEGER,
ADD COLUMN     "deleted_by_id" INTEGER,
ADD COLUMN     "updated_by_id" INTEGER;

-- AlterTable
ALTER TABLE "mst_medicine_classes" DROP COLUMN "created_by",
DROP COLUMN "deleted_by",
DROP COLUMN "updated_by",
ADD COLUMN     "created_by_id" INTEGER,
ADD COLUMN     "deleted_by_id" INTEGER,
ADD COLUMN     "updated_by_id" INTEGER;

-- AlterTable
ALTER TABLE "mst_medicine_shapes" DROP COLUMN "created_by",
DROP COLUMN "deleted_by",
DROP COLUMN "updated_by",
ADD COLUMN     "created_by_id" INTEGER,
ADD COLUMN     "deleted_by_id" INTEGER,
ADD COLUMN     "updated_by_id" INTEGER;

-- AlterTable
ALTER TABLE "mst_medicine_types" DROP COLUMN "created_by",
DROP COLUMN "deleted_by",
DROP COLUMN "updated_by",
ADD COLUMN     "created_by_id" INTEGER,
ADD COLUMN     "deleted_by_id" INTEGER,
ADD COLUMN     "updated_by_id" INTEGER;

-- AlterTable
ALTER TABLE "mst_medicines" DROP COLUMN "created_by",
DROP COLUMN "deleted_by",
DROP COLUMN "generic_name",
DROP COLUMN "reorder_level",
DROP COLUMN "updated_by",
ADD COLUMN     "created_by_id" INTEGER,
ADD COLUMN     "deleted_by_id" INTEGER,
ADD COLUMN     "updated_by_id" INTEGER;

-- AlterTable
ALTER TABLE "mst_permissions" DROP COLUMN "created_by",
DROP COLUMN "updated_by",
ADD COLUMN     "created_by_id" INTEGER,
ADD COLUMN     "updated_by_id" INTEGER;

-- AlterTable
ALTER TABLE "mst_pharmacies" DROP COLUMN "created_by",
DROP COLUMN "deleted_by",
DROP COLUMN "updated_by",
ADD COLUMN     "created_by_id" INTEGER,
ADD COLUMN     "deleted_by_id" INTEGER,
ADD COLUMN     "updated_by_id" INTEGER;

-- AlterTable
ALTER TABLE "mst_role_permissions" DROP COLUMN "created_by",
DROP COLUMN "updated_by",
ADD COLUMN     "created_by_id" INTEGER,
ADD COLUMN     "updated_by_id" INTEGER;

-- AlterTable
ALTER TABLE "mst_roles" DROP COLUMN "created_by",
DROP COLUMN "deleted_by",
DROP COLUMN "updated_by",
ADD COLUMN     "created_by_id" INTEGER,
ADD COLUMN     "deleted_by_id" INTEGER,
ADD COLUMN     "updated_by_id" INTEGER;

-- AlterTable
ALTER TABLE "mst_system_parameters" DROP COLUMN "created_by",
DROP COLUMN "updated_by",
ADD COLUMN     "created_by_id" INTEGER,
ADD COLUMN     "updated_by_id" INTEGER;

-- AlterTable
ALTER TABLE "mst_user_pharmacies" DROP COLUMN "created_by",
DROP COLUMN "deleted_by",
DROP COLUMN "updated_by",
ADD COLUMN     "created_by_id" INTEGER,
ADD COLUMN     "deleted_by_id" INTEGER,
ADD COLUMN     "updated_by_id" INTEGER;

-- AlterTable
ALTER TABLE "mst_user_tokens" DROP COLUMN "created_by",
DROP COLUMN "updated_by",
ADD COLUMN     "created_by_id" INTEGER,
ADD COLUMN     "updated_by_id" INTEGER;

-- AlterTable
ALTER TABLE "mst_users" DROP COLUMN "created_by",
DROP COLUMN "deleted_by",
DROP COLUMN "updated_by",
ADD COLUMN     "created_by_id" INTEGER,
ADD COLUMN     "deleted_by_id" INTEGER,
ADD COLUMN     "updated_by_id" INTEGER;

-- AlterTable
ALTER TABLE "trx_invoice_details" DROP COLUMN "created_by",
DROP COLUMN "updated_by",
ADD COLUMN     "created_by_id" INTEGER,
ADD COLUMN     "updated_by_id" INTEGER;

-- AlterTable
ALTER TABLE "trx_invoice_payment_history" DROP COLUMN "created_by",
DROP COLUMN "updated_by",
ADD COLUMN     "created_by_id" INTEGER,
ADD COLUMN     "updated_by_id" INTEGER;

-- AlterTable
ALTER TABLE "trx_invoice_payments" DROP COLUMN "created_by",
DROP COLUMN "updated_by",
ADD COLUMN     "created_by_id" INTEGER,
ADD COLUMN     "updated_by_id" INTEGER;

-- AlterTable
ALTER TABLE "trx_invoices" DROP COLUMN "created_by",
DROP COLUMN "deleted_by",
DROP COLUMN "updated_by",
ADD COLUMN     "deleted_by_id" INTEGER,
ADD COLUMN     "updated_by_id" INTEGER,
ALTER COLUMN "created_by_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "trx_purchase_order_details" DROP COLUMN "created_by",
DROP COLUMN "updated_by",
ADD COLUMN     "created_by_id" INTEGER,
ADD COLUMN     "updated_by_id" INTEGER;

-- AlterTable
ALTER TABLE "trx_purchase_orders" DROP COLUMN "created_by",
DROP COLUMN "deleted_by",
DROP COLUMN "updated_by",
ADD COLUMN     "deleted_by_id" INTEGER,
ADD COLUMN     "updated_by_id" INTEGER,
ALTER COLUMN "created_by_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "trx_sale_details" DROP COLUMN "created_by",
DROP COLUMN "updated_by",
ADD COLUMN     "created_by_id" INTEGER,
ADD COLUMN     "updated_by_id" INTEGER;

-- AlterTable
ALTER TABLE "trx_sale_payment_history" DROP COLUMN "created_by",
DROP COLUMN "updated_by",
ADD COLUMN     "created_by_id" INTEGER,
ADD COLUMN     "updated_by_id" INTEGER;

-- AlterTable
ALTER TABLE "trx_sale_payments" DROP COLUMN "created_by",
DROP COLUMN "updated_by",
ADD COLUMN     "created_by_id" INTEGER,
ADD COLUMN     "updated_by_id" INTEGER;

-- AlterTable
ALTER TABLE "trx_sales" DROP COLUMN "created_by",
DROP COLUMN "deleted_by",
DROP COLUMN "updated_by",
ADD COLUMN     "deleted_by_id" INTEGER,
ADD COLUMN     "updated_by_id" INTEGER,
ALTER COLUMN "created_by_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "trx_stock_disposal_details" DROP COLUMN "created_by",
DROP COLUMN "updated_by",
ADD COLUMN     "created_by_id" INTEGER,
ADD COLUMN     "updated_by_id" INTEGER;

-- AlterTable
ALTER TABLE "trx_stock_disposals" DROP COLUMN "created_by",
DROP COLUMN "deleted_by",
DROP COLUMN "updated_by",
ADD COLUMN     "deleted_by_id" INTEGER,
ADD COLUMN     "updated_by_id" INTEGER,
ALTER COLUMN "created_by_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "trx_stock_return_details" DROP COLUMN "created_by",
DROP COLUMN "updated_by",
ADD COLUMN     "created_by_id" INTEGER,
ADD COLUMN     "updated_by_id" INTEGER;

-- AlterTable
ALTER TABLE "trx_stock_returns" DROP COLUMN "created_by",
DROP COLUMN "deleted_by",
DROP COLUMN "updated_by",
ADD COLUMN     "deleted_by_id" INTEGER,
ADD COLUMN     "updated_by_id" INTEGER,
ALTER COLUMN "created_by_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "mst_medicine_ingredients" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "medicine_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" INTEGER,
    "updated_by_id" INTEGER,

    CONSTRAINT "mst_medicine_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mst_medicine_ingredients_uuid_key" ON "mst_medicine_ingredients"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "mst_medicines_pharmacy_id_name_key" ON "mst_medicines"("pharmacy_id", "name");

-- AddForeignKey
ALTER TABLE "mst_system_parameters" ADD CONSTRAINT "mst_system_parameters_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_system_parameters" ADD CONSTRAINT "mst_system_parameters_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_business_parameters" ADD CONSTRAINT "mst_business_parameters_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_business_parameters" ADD CONSTRAINT "mst_business_parameters_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_roles" ADD CONSTRAINT "mst_roles_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_roles" ADD CONSTRAINT "mst_roles_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_roles" ADD CONSTRAINT "mst_roles_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_permissions" ADD CONSTRAINT "mst_permissions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_permissions" ADD CONSTRAINT "mst_permissions_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_role_permissions" ADD CONSTRAINT "mst_role_permissions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_role_permissions" ADD CONSTRAINT "mst_role_permissions_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_pharmacies" ADD CONSTRAINT "mst_pharmacies_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_pharmacies" ADD CONSTRAINT "mst_pharmacies_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_pharmacies" ADD CONSTRAINT "mst_pharmacies_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_users" ADD CONSTRAINT "mst_users_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_users" ADD CONSTRAINT "mst_users_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_users" ADD CONSTRAINT "mst_users_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_user_tokens" ADD CONSTRAINT "mst_user_tokens_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_user_tokens" ADD CONSTRAINT "mst_user_tokens_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_user_pharmacies" ADD CONSTRAINT "mst_user_pharmacies_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_user_pharmacies" ADD CONSTRAINT "mst_user_pharmacies_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_user_pharmacies" ADD CONSTRAINT "mst_user_pharmacies_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_medicine_shapes" ADD CONSTRAINT "mst_medicine_shapes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_medicine_shapes" ADD CONSTRAINT "mst_medicine_shapes_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_medicine_shapes" ADD CONSTRAINT "mst_medicine_shapes_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_medicine_types" ADD CONSTRAINT "mst_medicine_types_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_medicine_types" ADD CONSTRAINT "mst_medicine_types_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_medicine_types" ADD CONSTRAINT "mst_medicine_types_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_medicine_classes" ADD CONSTRAINT "mst_medicine_classes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_medicine_classes" ADD CONSTRAINT "mst_medicine_classes_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_medicine_classes" ADD CONSTRAINT "mst_medicine_classes_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_medicines" ADD CONSTRAINT "mst_medicines_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_medicines" ADD CONSTRAINT "mst_medicines_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_medicines" ADD CONSTRAINT "mst_medicines_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_medicine_ingredients" ADD CONSTRAINT "mst_medicine_ingredients_medicine_id_fkey" FOREIGN KEY ("medicine_id") REFERENCES "mst_medicines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_medicine_ingredients" ADD CONSTRAINT "mst_medicine_ingredients_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_medicine_ingredients" ADD CONSTRAINT "mst_medicine_ingredients_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_distributors" ADD CONSTRAINT "mst_distributors_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_distributors" ADD CONSTRAINT "mst_distributors_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_distributors" ADD CONSTRAINT "mst_distributors_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_customers" ADD CONSTRAINT "mst_customers_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_customers" ADD CONSTRAINT "mst_customers_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_customers" ADD CONSTRAINT "mst_customers_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_purchase_orders" ADD CONSTRAINT "trx_purchase_orders_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_purchase_orders" ADD CONSTRAINT "trx_purchase_orders_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_purchase_orders" ADD CONSTRAINT "trx_purchase_orders_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_purchase_order_details" ADD CONSTRAINT "trx_purchase_order_details_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_purchase_order_details" ADD CONSTRAINT "trx_purchase_order_details_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_invoices" ADD CONSTRAINT "trx_invoices_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_invoices" ADD CONSTRAINT "trx_invoices_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_invoices" ADD CONSTRAINT "trx_invoices_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_invoice_details" ADD CONSTRAINT "trx_invoice_details_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_invoice_details" ADD CONSTRAINT "trx_invoice_details_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_invoice_payments" ADD CONSTRAINT "trx_invoice_payments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_invoice_payments" ADD CONSTRAINT "trx_invoice_payments_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_invoice_payment_history" ADD CONSTRAINT "trx_invoice_payment_history_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_invoice_payment_history" ADD CONSTRAINT "trx_invoice_payment_history_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_stocks" ADD CONSTRAINT "inv_stocks_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_stocks" ADD CONSTRAINT "inv_stocks_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_stock_details" ADD CONSTRAINT "inv_stock_details_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_stock_details" ADD CONSTRAINT "inv_stock_details_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_stock_movements" ADD CONSTRAINT "inv_stock_movements_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv_stock_movements" ADD CONSTRAINT "inv_stock_movements_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_stock_returns" ADD CONSTRAINT "trx_stock_returns_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_stock_returns" ADD CONSTRAINT "trx_stock_returns_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_stock_returns" ADD CONSTRAINT "trx_stock_returns_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_stock_return_details" ADD CONSTRAINT "trx_stock_return_details_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_stock_return_details" ADD CONSTRAINT "trx_stock_return_details_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_stock_disposals" ADD CONSTRAINT "trx_stock_disposals_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_stock_disposals" ADD CONSTRAINT "trx_stock_disposals_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_stock_disposals" ADD CONSTRAINT "trx_stock_disposals_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_stock_disposal_details" ADD CONSTRAINT "trx_stock_disposal_details_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_stock_disposal_details" ADD CONSTRAINT "trx_stock_disposal_details_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_sales" ADD CONSTRAINT "trx_sales_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_sales" ADD CONSTRAINT "trx_sales_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_sales" ADD CONSTRAINT "trx_sales_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_sale_details" ADD CONSTRAINT "trx_sale_details_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_sale_details" ADD CONSTRAINT "trx_sale_details_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_sale_payments" ADD CONSTRAINT "trx_sale_payments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_sale_payments" ADD CONSTRAINT "trx_sale_payments_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_sale_payment_history" ADD CONSTRAINT "trx_sale_payment_history_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_sale_payment_history" ADD CONSTRAINT "trx_sale_payment_history_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
