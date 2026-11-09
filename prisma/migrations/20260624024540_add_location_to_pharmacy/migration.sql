/*
  Warnings:

  - Added the required column `location` to the `mst_pharmacies` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "mst_pharmacies" ADD COLUMN "location" TEXT NOT NULL DEFAULT '';
ALTER TABLE "mst_pharmacies" ALTER COLUMN "location" DROP DEFAULT;
