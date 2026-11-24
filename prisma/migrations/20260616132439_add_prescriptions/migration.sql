-- CreateEnum
CREATE TYPE "PrescriptionStatus" AS ENUM ('PENDING', 'DISPENSED', 'PARTIAL', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PrescriptionDetailStatus" AS ENUM ('PENDING', 'DISPENSED', 'PARTIAL', 'CANCELLED');

-- AlterTable
ALTER TABLE "inv_stock_details" ALTER COLUMN "barcode" SET NOT NULL;

-- AlterTable
ALTER TABLE "trx_sales" ADD COLUMN     "prescription_id" INTEGER;

-- CreateTable
CREATE TABLE "trx_prescriptions" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pharmacy_id" INTEGER NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "sale_id" INTEGER,
    "doctor_id" INTEGER,
    "doctor_name" TEXT NOT NULL,
    "doctor_license" TEXT,
    "clinic_name" TEXT,
    "prescription_number" TEXT,
    "prescribed_at" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "status" "PrescriptionStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by_id" INTEGER,
    "updated_by_id" INTEGER,
    "deleted_by_id" INTEGER,

    CONSTRAINT "trx_prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trx_prescription_details" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "prescription_id" INTEGER NOT NULL,
    "medicine_id" INTEGER,
    "medicine_name" TEXT NOT NULL,
    "frequency" TEXT,
    "duration" TEXT,
    "qty" INTEGER NOT NULL,
    "dispensed_qty" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "status" "PrescriptionDetailStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by_id" INTEGER,
    "updated_by_id" INTEGER,
    "deleted_by_id" INTEGER,

    CONSTRAINT "trx_prescription_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trx_prescriptions_uuid_key" ON "trx_prescriptions"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "trx_prescriptions_sale_id_key" ON "trx_prescriptions"("sale_id");

-- CreateIndex
CREATE UNIQUE INDEX "trx_prescription_details_uuid_key" ON "trx_prescription_details"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "trx_sales_prescription_id_key" ON "trx_sales"("prescription_id");

-- AddForeignKey
ALTER TABLE "trx_sales" ADD CONSTRAINT "trx_sales_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "trx_prescriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_prescriptions" ADD CONSTRAINT "trx_prescriptions_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "mst_pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_prescriptions" ADD CONSTRAINT "trx_prescriptions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "mst_customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_prescriptions" ADD CONSTRAINT "trx_prescriptions_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "trx_sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_prescriptions" ADD CONSTRAINT "trx_prescriptions_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_prescriptions" ADD CONSTRAINT "trx_prescriptions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_prescriptions" ADD CONSTRAINT "trx_prescriptions_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_prescriptions" ADD CONSTRAINT "trx_prescriptions_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_prescription_details" ADD CONSTRAINT "trx_prescription_details_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "trx_prescriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_prescription_details" ADD CONSTRAINT "trx_prescription_details_medicine_id_fkey" FOREIGN KEY ("medicine_id") REFERENCES "mst_medicines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_prescription_details" ADD CONSTRAINT "trx_prescription_details_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_prescription_details" ADD CONSTRAINT "trx_prescription_details_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_prescription_details" ADD CONSTRAINT "trx_prescription_details_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
