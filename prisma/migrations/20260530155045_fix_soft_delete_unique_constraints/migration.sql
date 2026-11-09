-- Replace hard unique constraints with partial unique indexes
-- so that soft-deleted rows (deleted_at IS NOT NULL) do not block re-creation
-- of a record with the same (pharmacy_id, name).

-- MedicineShape
ALTER TABLE "mst_medicine_shapes" DROP CONSTRAINT IF EXISTS "mst_medicine_shapes_pharmacy_id_name_key";
CREATE UNIQUE INDEX "mst_medicine_shapes_pharmacy_id_name_active_key"
  ON "mst_medicine_shapes" ("pharmacy_id", "name") WHERE "deleted_at" IS NULL;

-- MedicineType
ALTER TABLE "mst_medicine_types" DROP CONSTRAINT IF EXISTS "mst_medicine_types_pharmacy_id_name_key";
CREATE UNIQUE INDEX "mst_medicine_types_pharmacy_id_name_active_key"
  ON "mst_medicine_types" ("pharmacy_id", "name") WHERE "deleted_at" IS NULL;

-- MedicineClass
ALTER TABLE "mst_medicine_classes" DROP CONSTRAINT IF EXISTS "mst_medicine_classes_pharmacy_id_name_key";
CREATE UNIQUE INDEX "mst_medicine_classes_pharmacy_id_name_active_key"
  ON "mst_medicine_classes" ("pharmacy_id", "name") WHERE "deleted_at" IS NULL;

-- Medicine
ALTER TABLE "mst_medicines" DROP CONSTRAINT IF EXISTS "mst_medicines_pharmacy_id_name_key";
CREATE UNIQUE INDEX "mst_medicines_pharmacy_id_name_active_key"
  ON "mst_medicines" ("pharmacy_id", "name") WHERE "deleted_at" IS NULL;
