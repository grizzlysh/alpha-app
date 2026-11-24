-- Names now keep the case they were typed in, so sort them naturally
-- ("amoxicillin" next to "Amlodipin", not after "Zinc" as byte order would).
-- Uses the ICU root collation; skipped if this server has no ICU support.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_collation WHERE collname = 'und-x-icu') THEN
    ALTER TABLE mst_medicines            ALTER COLUMN name TYPE text COLLATE "und-x-icu";
    ALTER TABLE mst_medicine_ingredients ALTER COLUMN name TYPE text COLLATE "und-x-icu";
    ALTER TABLE mst_medicine_shapes      ALTER COLUMN name TYPE text COLLATE "und-x-icu";
    ALTER TABLE mst_medicine_types       ALTER COLUMN name TYPE text COLLATE "und-x-icu";
    ALTER TABLE mst_medicine_classes     ALTER COLUMN name TYPE text COLLATE "und-x-icu";
    ALTER TABLE mst_distributors         ALTER COLUMN name TYPE text COLLATE "und-x-icu";
    ALTER TABLE mst_customers            ALTER COLUMN name TYPE text COLLATE "und-x-icu";
    ALTER TABLE mst_doctors              ALTER COLUMN name TYPE text COLLATE "und-x-icu";
  END IF;
END $$;
