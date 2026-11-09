-- AlterTable
ALTER TABLE "mst_customer_patient_details" RENAME CONSTRAINT "mst_party_patient_details_pkey" TO "mst_customer_patient_details_pkey";

-- AlterTable
ALTER TABLE "mst_customer_professional_details" RENAME CONSTRAINT "mst_party_professional_details_pkey" TO "mst_customer_professional_details_pkey";

-- AlterTable
ALTER TABLE "mst_customers" RENAME CONSTRAINT "mst_parties_pkey" TO "mst_customers_pkey";

-- AlterTable
ALTER TABLE "mst_placements" ADD COLUMN     "is_head_pharmacist" BOOLEAN NOT NULL DEFAULT false;

-- RenameForeignKey
ALTER TABLE "mst_customer_patient_details" RENAME CONSTRAINT "mst_party_patient_details_party_id_fkey" TO "mst_customer_patient_details_customer_id_fkey";

-- RenameForeignKey
ALTER TABLE "mst_customer_professional_details" RENAME CONSTRAINT "mst_party_professional_details_party_id_fkey" TO "mst_customer_professional_details_customer_id_fkey";

-- RenameForeignKey
ALTER TABLE "mst_customers" RENAME CONSTRAINT "mst_parties_created_by_id_fkey" TO "mst_customers_created_by_id_fkey";

-- RenameForeignKey
ALTER TABLE "mst_customers" RENAME CONSTRAINT "mst_parties_deleted_by_id_fkey" TO "mst_customers_deleted_by_id_fkey";

-- RenameForeignKey
ALTER TABLE "mst_customers" RENAME CONSTRAINT "mst_parties_pharmacy_id_fkey" TO "mst_customers_pharmacy_id_fkey";

-- RenameForeignKey
ALTER TABLE "mst_customers" RENAME CONSTRAINT "mst_parties_updated_by_id_fkey" TO "mst_customers_updated_by_id_fkey";

-- RenameForeignKey
ALTER TABLE "trx_medical_records" RENAME CONSTRAINT "trx_medical_records_party_id_fkey" TO "trx_medical_records_customer_id_fkey";

-- RenameForeignKey
ALTER TABLE "trx_prescriptions" RENAME CONSTRAINT "trx_prescriptions_party_id_fkey" TO "trx_prescriptions_customer_id_fkey";

-- RenameForeignKey
ALTER TABLE "trx_sales" RENAME CONSTRAINT "trx_sales_party_id_fkey" TO "trx_sales_customer_id_fkey";

-- RenameIndex
ALTER INDEX "mst_party_patient_details_party_id_key" RENAME TO "mst_customer_patient_details_customer_id_key";

-- RenameIndex
ALTER INDEX "mst_party_professional_details_party_id_key" RENAME TO "mst_customer_professional_details_customer_id_key";

-- RenameIndex
ALTER INDEX "mst_parties_uuid_key" RENAME TO "mst_customers_uuid_key";

-- RenameIndex
ALTER INDEX "trx_medical_records_party_id_key" RENAME TO "trx_medical_records_customer_id_key";

-- Backfill: placements with a HEAD_PHARMACIST-type role keep that responsibility.
-- Active ones: only the earliest-joined per pharmacy (some data already had two),
-- so the uniqueness rule below can hold. Inactive/ended ones keep the flag as history.
UPDATE "mst_placements" p
SET "is_head_pharmacist" = true
FROM "mst_roles" r
WHERE p."role_id" = r."id" AND r."type"::text = 'HEAD_PHARMACIST'
  AND NOT (p."deleted_at" IS NULL AND p."left_at" IS NULL AND p."status" = 'ACTIVE');

UPDATE "mst_placements" p
SET "is_head_pharmacist" = true
WHERE p."id" IN (
  SELECT DISTINCT ON (pl."pharmacy_id") pl."id"
  FROM "mst_placements" pl
  JOIN "mst_roles" r ON r."id" = pl."role_id"
  WHERE r."type"::text = 'HEAD_PHARMACIST'
    AND pl."deleted_at" IS NULL AND pl."left_at" IS NULL AND pl."status" = 'ACTIVE'
  ORDER BY pl."pharmacy_id", pl."joined_at" ASC, pl."id" ASC
);

-- At most one active Head Pharmacist per pharmacy.
CREATE UNIQUE INDEX "mst_placements_one_head_pharmacist_per_pharmacy"
ON "mst_placements" ("pharmacy_id")
WHERE "is_head_pharmacist" = true AND "deleted_at" IS NULL AND "left_at" IS NULL AND "status" = 'ACTIVE';
