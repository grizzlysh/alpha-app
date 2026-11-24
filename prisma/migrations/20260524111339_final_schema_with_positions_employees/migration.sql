/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `mst_pharmacies` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `mst_pharmacies` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PharmacyCategory" AS ENUM ('APOTEK', 'KLINIK', 'RUMAH_SAKIT', 'PUSKESMAS');

-- CreateEnum
CREATE TYPE "SignAuthority" AS ENUM ('NONE', 'STANDARD', 'FULL');

-- AlterTable
ALTER TABLE "mst_pharmacies" ADD COLUMN     "category" "PharmacyCategory" NOT NULL DEFAULT 'APOTEK',
ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "permit_number" TEXT;

-- AlterTable
ALTER TABLE "trx_invoices" ADD COLUMN     "signed_by_id" INTEGER;

-- AlterTable
ALTER TABLE "trx_purchase_orders" ADD COLUMN     "cancellation_reason" TEXT,
ADD COLUMN     "signed_by_id" INTEGER;

-- AlterTable
ALTER TABLE "trx_stock_disposals" ADD COLUMN     "cancellation_reason" TEXT,
ADD COLUMN     "signed_by_id" INTEGER;

-- AlterTable
ALTER TABLE "trx_stock_returns" ADD COLUMN     "cancellation_reason" TEXT,
ADD COLUMN     "signed_by_id" INTEGER;

-- CreateTable
CREATE TABLE "mst_positions" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pharmacy_id" INTEGER,
    "name" TEXT NOT NULL,
    "sign_authority" "SignAuthority" NOT NULL DEFAULT 'NONE',
    "description" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by_id" INTEGER,
    "updated_by_id" INTEGER,
    "deleted_by_id" INTEGER,

    CONSTRAINT "mst_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mst_employees" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pharmacy_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "position_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "notes" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by_id" INTEGER,
    "updated_by_id" INTEGER,
    "deleted_by_id" INTEGER,

    CONSTRAINT "mst_employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mst_employee_pharmacies" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "pharmacy_id" INTEGER NOT NULL,
    "license_number" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_until" TIMESTAMP(3),
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by_id" INTEGER,
    "updated_by_id" INTEGER,
    "deleted_by_id" INTEGER,

    CONSTRAINT "mst_employee_pharmacies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mst_positions_uuid_key" ON "mst_positions"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "mst_positions_pharmacy_id_name_key" ON "mst_positions"("pharmacy_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "mst_employees_uuid_key" ON "mst_employees"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "mst_employee_pharmacies_uuid_key" ON "mst_employee_pharmacies"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "mst_employee_pharmacies_employee_id_pharmacy_id_key" ON "mst_employee_pharmacies"("employee_id", "pharmacy_id");

-- CreateIndex
CREATE UNIQUE INDEX "mst_pharmacies_code_key" ON "mst_pharmacies"("code");

-- AddForeignKey
ALTER TABLE "mst_positions" ADD CONSTRAINT "mst_positions_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "mst_pharmacies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_positions" ADD CONSTRAINT "mst_positions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_positions" ADD CONSTRAINT "mst_positions_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_positions" ADD CONSTRAINT "mst_positions_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_employees" ADD CONSTRAINT "mst_employees_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "mst_pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_employees" ADD CONSTRAINT "mst_employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_employees" ADD CONSTRAINT "mst_employees_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "mst_positions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_employees" ADD CONSTRAINT "mst_employees_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_employees" ADD CONSTRAINT "mst_employees_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_employees" ADD CONSTRAINT "mst_employees_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_employee_pharmacies" ADD CONSTRAINT "mst_employee_pharmacies_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "mst_employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_employee_pharmacies" ADD CONSTRAINT "mst_employee_pharmacies_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "mst_pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_employee_pharmacies" ADD CONSTRAINT "mst_employee_pharmacies_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_employee_pharmacies" ADD CONSTRAINT "mst_employee_pharmacies_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_employee_pharmacies" ADD CONSTRAINT "mst_employee_pharmacies_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_purchase_orders" ADD CONSTRAINT "trx_purchase_orders_signed_by_id_fkey" FOREIGN KEY ("signed_by_id") REFERENCES "mst_employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_invoices" ADD CONSTRAINT "trx_invoices_signed_by_id_fkey" FOREIGN KEY ("signed_by_id") REFERENCES "mst_employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_stock_returns" ADD CONSTRAINT "trx_stock_returns_signed_by_id_fkey" FOREIGN KEY ("signed_by_id") REFERENCES "mst_employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_stock_disposals" ADD CONSTRAINT "trx_stock_disposals_signed_by_id_fkey" FOREIGN KEY ("signed_by_id") REFERENCES "mst_employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
