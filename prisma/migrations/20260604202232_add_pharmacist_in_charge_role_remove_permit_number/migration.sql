/*
  Warnings:

  - You are about to drop the column `permit_number` on the `mst_pharmacies` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "PharmacyRole" ADD VALUE 'PHARMACIST_IN_CHARGE';

-- AlterTable
ALTER TABLE "mst_pharmacies" DROP COLUMN "permit_number";
