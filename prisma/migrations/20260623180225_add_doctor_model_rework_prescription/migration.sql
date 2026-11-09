/*
  Warnings:

  - You are about to drop the column `clinic_name` on the `trx_prescriptions` table. All the data in the column will be lost.
  - You are about to drop the column `doctor_license` on the `trx_prescriptions` table. All the data in the column will be lost.
  - You are about to drop the column `doctor_name` on the `trx_prescriptions` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "trx_prescriptions" DROP CONSTRAINT "trx_prescriptions_doctor_id_fkey";

-- AlterTable
ALTER TABLE "trx_prescriptions" DROP COLUMN "clinic_name",
DROP COLUMN "doctor_license",
DROP COLUMN "doctor_name";

-- CreateTable
CREATE TABLE "mst_doctors" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pharmacy_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "name" TEXT NOT NULL,
    "license_number" TEXT,
    "specialty" TEXT,
    "clinic_name" TEXT,
    "phone" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by_id" INTEGER,
    "updated_by_id" INTEGER,
    "deleted_by_id" INTEGER,

    CONSTRAINT "mst_doctors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mst_doctors_uuid_key" ON "mst_doctors"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "mst_doctors_user_id_key" ON "mst_doctors"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "mst_doctors_pharmacy_id_license_number_key" ON "mst_doctors"("pharmacy_id", "license_number");

-- AddForeignKey
ALTER TABLE "mst_doctors" ADD CONSTRAINT "mst_doctors_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "mst_pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_doctors" ADD CONSTRAINT "mst_doctors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_doctors" ADD CONSTRAINT "mst_doctors_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_doctors" ADD CONSTRAINT "mst_doctors_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_doctors" ADD CONSTRAINT "mst_doctors_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trx_prescriptions" ADD CONSTRAINT "trx_prescriptions_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "mst_doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
