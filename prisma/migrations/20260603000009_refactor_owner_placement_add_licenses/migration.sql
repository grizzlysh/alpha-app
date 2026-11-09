-- AlterEnum
BEGIN;
CREATE TYPE "StockReturnStatus_new" AS ENUM ('DRAFT', 'COMPLETED', 'CANCELLED');
ALTER TABLE "public"."trx_stock_returns" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "trx_stock_returns" ALTER COLUMN "status" TYPE "StockReturnStatus_new" USING ("status"::text::"StockReturnStatus_new");
ALTER TYPE "StockReturnStatus" RENAME TO "StockReturnStatus_old";
ALTER TYPE "StockReturnStatus_new" RENAME TO "StockReturnStatus";
DROP TYPE "public"."StockReturnStatus_old";
ALTER TABLE "trx_stock_returns" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- DropForeignKey
ALTER TABLE "mst_licenses" DROP CONSTRAINT "mst_licenses_created_by_id_fkey";

-- DropForeignKey
ALTER TABLE "mst_licenses" DROP CONSTRAINT "mst_licenses_deleted_by_id_fkey";

-- DropForeignKey
ALTER TABLE "mst_licenses" DROP CONSTRAINT "mst_licenses_updated_by_id_fkey";

-- DropForeignKey
ALTER TABLE "mst_licenses" DROP CONSTRAINT "mst_licenses_user_pharmacy_id_fkey";

-- DropForeignKey
ALTER TABLE "mst_pharmacies" DROP CONSTRAINT "mst_pharmacies_owner_id_fkey";

-- AlterTable
ALTER TABLE "mst_pharmacies" DROP COLUMN "owner_id";

-- DropTable
DROP TABLE "mst_licenses";

-- CreateTable
CREATE TABLE "mst_practice_licenses" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "placement_id" INTEGER NOT NULL,
    "license_number" TEXT NOT NULL,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_until" TIMESTAMP(3) NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by_id" INTEGER,
    "updated_by_id" INTEGER,
    "deleted_by_id" INTEGER,

    CONSTRAINT "mst_practice_licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mst_business_licenses" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pharmacy_id" INTEGER NOT NULL,
    "license_number" TEXT NOT NULL,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_until" TIMESTAMP(3) NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by_id" INTEGER,
    "updated_by_id" INTEGER,
    "deleted_by_id" INTEGER,

    CONSTRAINT "mst_business_licenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mst_practice_licenses_uuid_key" ON "mst_practice_licenses"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "mst_business_licenses_uuid_key" ON "mst_business_licenses"("uuid");

-- RenameForeignKey
ALTER TABLE "mst_placements" RENAME CONSTRAINT "mst_user_pharmacies_created_by_id_fkey" TO "mst_placements_created_by_id_fkey";

-- RenameForeignKey
ALTER TABLE "mst_placements" RENAME CONSTRAINT "mst_user_pharmacies_deleted_by_id_fkey" TO "mst_placements_deleted_by_id_fkey";

-- RenameForeignKey
ALTER TABLE "mst_placements" RENAME CONSTRAINT "mst_user_pharmacies_pharmacy_id_fkey" TO "mst_placements_pharmacy_id_fkey";

-- RenameForeignKey
ALTER TABLE "mst_placements" RENAME CONSTRAINT "mst_user_pharmacies_role_id_fkey" TO "mst_placements_role_id_fkey";

-- RenameForeignKey
ALTER TABLE "mst_placements" RENAME CONSTRAINT "mst_user_pharmacies_updated_by_id_fkey" TO "mst_placements_updated_by_id_fkey";

-- RenameForeignKey
ALTER TABLE "mst_placements" RENAME CONSTRAINT "mst_user_pharmacies_user_id_fkey" TO "mst_placements_user_id_fkey";

-- AddForeignKey
ALTER TABLE "mst_practice_licenses" ADD CONSTRAINT "mst_practice_licenses_placement_id_fkey" FOREIGN KEY ("placement_id") REFERENCES "mst_placements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_practice_licenses" ADD CONSTRAINT "mst_practice_licenses_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_practice_licenses" ADD CONSTRAINT "mst_practice_licenses_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_practice_licenses" ADD CONSTRAINT "mst_practice_licenses_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_business_licenses" ADD CONSTRAINT "mst_business_licenses_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "mst_pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_business_licenses" ADD CONSTRAINT "mst_business_licenses_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_business_licenses" ADD CONSTRAINT "mst_business_licenses_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mst_business_licenses" ADD CONSTRAINT "mst_business_licenses_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "mst_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
