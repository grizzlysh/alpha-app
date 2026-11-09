-- Remove DELETED value from RecordStatus enum

-- Step 1: Drop partial unique indexes that filter on status != 'DELETED'
--         Must be done before the data migration to avoid constraint violations
DROP INDEX IF EXISTS "mst_medicine_shapes_pharmacy_id_name_active_key";
DROP INDEX IF EXISTS "mst_medicine_types_pharmacy_id_name_active_key";
DROP INDEX IF EXISTS "mst_medicine_classes_pharmacy_id_name_active_key";
DROP INDEX IF EXISTS "mst_medicines_pharmacy_id_name_active_key";
DROP INDEX IF EXISTS "mst_roles_pharmacy_id_name_active_key";

-- Step 2: Update any rows that still use DELETED to use INACTIVE (data migration)
UPDATE "mst_users" SET "status" = 'INACTIVE' WHERE "status" = 'DELETED';
UPDATE "mst_pharmacies" SET "status" = 'INACTIVE' WHERE "status" = 'DELETED';
UPDATE "mst_roles" SET "status" = 'INACTIVE' WHERE "status" = 'DELETED';
UPDATE "mst_placements" SET "status" = 'INACTIVE' WHERE "status" = 'DELETED';
UPDATE "mst_practice_licenses" SET "status" = 'INACTIVE' WHERE "status" = 'DELETED';
UPDATE "mst_business_licenses" SET "status" = 'INACTIVE' WHERE "status" = 'DELETED';
UPDATE "mst_medicine_shapes" SET "status" = 'INACTIVE' WHERE "status" = 'DELETED';
UPDATE "mst_medicine_types" SET "status" = 'INACTIVE' WHERE "status" = 'DELETED';
UPDATE "mst_medicine_classes" SET "status" = 'INACTIVE' WHERE "status" = 'DELETED';
UPDATE "mst_medicines" SET "status" = 'INACTIVE' WHERE "status" = 'DELETED';
UPDATE "mst_distributors" SET "status" = 'INACTIVE' WHERE "status" = 'DELETED';
UPDATE "mst_customers" SET "status" = 'INACTIVE' WHERE "status" = 'DELETED';

-- Step 3: Drop column defaults before changing type (PostgreSQL requires this)
ALTER TABLE "mst_users" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "mst_pharmacies" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "mst_roles" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "mst_placements" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "mst_practice_licenses" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "mst_business_licenses" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "mst_medicine_shapes" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "mst_medicine_types" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "mst_medicine_classes" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "mst_medicines" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "mst_distributors" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "mst_customers" ALTER COLUMN "status" DROP DEFAULT;

-- Step 4: Recreate the enum without DELETED
-- PostgreSQL doesn't support DROP VALUE directly, so we rename and recreate
ALTER TYPE "RecordStatus" RENAME TO "RecordStatus_old";
CREATE TYPE "RecordStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- Step 5: Alter each column to use the new enum type
ALTER TABLE "mst_users" ALTER COLUMN "status" TYPE "RecordStatus" USING "status"::text::"RecordStatus";
ALTER TABLE "mst_pharmacies" ALTER COLUMN "status" TYPE "RecordStatus" USING "status"::text::"RecordStatus";
ALTER TABLE "mst_roles" ALTER COLUMN "status" TYPE "RecordStatus" USING "status"::text::"RecordStatus";
ALTER TABLE "mst_placements" ALTER COLUMN "status" TYPE "RecordStatus" USING "status"::text::"RecordStatus";
ALTER TABLE "mst_practice_licenses" ALTER COLUMN "status" TYPE "RecordStatus" USING "status"::text::"RecordStatus";
ALTER TABLE "mst_business_licenses" ALTER COLUMN "status" TYPE "RecordStatus" USING "status"::text::"RecordStatus";
ALTER TABLE "mst_medicine_shapes" ALTER COLUMN "status" TYPE "RecordStatus" USING "status"::text::"RecordStatus";
ALTER TABLE "mst_medicine_types" ALTER COLUMN "status" TYPE "RecordStatus" USING "status"::text::"RecordStatus";
ALTER TABLE "mst_medicine_classes" ALTER COLUMN "status" TYPE "RecordStatus" USING "status"::text::"RecordStatus";
ALTER TABLE "mst_medicines" ALTER COLUMN "status" TYPE "RecordStatus" USING "status"::text::"RecordStatus";
ALTER TABLE "mst_distributors" ALTER COLUMN "status" TYPE "RecordStatus" USING "status"::text::"RecordStatus";
ALTER TABLE "mst_customers" ALTER COLUMN "status" TYPE "RecordStatus" USING "status"::text::"RecordStatus";

-- Step 6: Drop the old enum type
DROP TYPE "RecordStatus_old";

-- Step 7: Restore column defaults with the new enum type
ALTER TABLE "mst_users" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::"RecordStatus";
ALTER TABLE "mst_pharmacies" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::"RecordStatus";
ALTER TABLE "mst_roles" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::"RecordStatus";
ALTER TABLE "mst_placements" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::"RecordStatus";
ALTER TABLE "mst_practice_licenses" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::"RecordStatus";
ALTER TABLE "mst_business_licenses" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::"RecordStatus";
ALTER TABLE "mst_medicine_shapes" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::"RecordStatus";
ALTER TABLE "mst_medicine_types" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::"RecordStatus";
ALTER TABLE "mst_medicine_classes" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::"RecordStatus";
ALTER TABLE "mst_medicines" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::"RecordStatus";
ALTER TABLE "mst_distributors" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::"RecordStatus";
ALTER TABLE "mst_customers" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::"RecordStatus";

-- Step 8: Recreate partial unique indexes using deleted_at IS NULL
CREATE UNIQUE INDEX "mst_medicine_shapes_pharmacy_id_name_active_key"
  ON "mst_medicine_shapes" ("pharmacy_id", "name") WHERE "deleted_at" IS NULL;

CREATE UNIQUE INDEX "mst_medicine_types_pharmacy_id_name_active_key"
  ON "mst_medicine_types" ("pharmacy_id", "name") WHERE "deleted_at" IS NULL;

CREATE UNIQUE INDEX "mst_medicine_classes_pharmacy_id_name_active_key"
  ON "mst_medicine_classes" ("pharmacy_id", "name") WHERE "deleted_at" IS NULL;

CREATE UNIQUE INDEX "mst_medicines_pharmacy_id_name_active_key"
  ON "mst_medicines" ("pharmacy_id", "name") WHERE "deleted_at" IS NULL;

CREATE UNIQUE INDEX "mst_roles_pharmacy_id_name_active_key"
  ON "mst_roles" ("pharmacy_id", "name") WHERE "deleted_at" IS NULL;
