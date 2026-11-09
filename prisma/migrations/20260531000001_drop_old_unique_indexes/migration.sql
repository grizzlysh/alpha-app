-- Prisma creates @@unique as a unique INDEX (not a constraint),
-- so the previous migration's DROP CONSTRAINT had no effect.
-- Drop the old full-table unique indexes directly.

DROP INDEX IF EXISTS "mst_medicine_shapes_pharmacy_id_name_key";
DROP INDEX IF EXISTS "mst_medicine_types_pharmacy_id_name_key";
DROP INDEX IF EXISTS "mst_medicine_classes_pharmacy_id_name_key";
DROP INDEX IF EXISTS "mst_medicines_pharmacy_id_name_key";
