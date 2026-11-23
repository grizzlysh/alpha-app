-- Structured medicine names: a base name, each ingredient's strength and an
-- optional variant, joined by the pharmacy's MEDICINE_NAME_FORMAT. Existing
-- medicines keep their typed name (is_custom_name = true) until converted.

-- AlterTable
ALTER TABLE "mst_medicine_ingredients" ADD COLUMN     "strength" TEXT;

-- AlterTable
ALTER TABLE "mst_medicines" ADD COLUMN     "base_name" TEXT,
ADD COLUMN     "is_custom_name" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "variant" TEXT;

-- Per-pharmacy name format; every pharmacy starts at name · strength · shape.
INSERT INTO mst_business_parameters (uuid, pharmacy_id, key, value, data_type, description, created_at, updated_at)
SELECT gen_random_uuid()::text, p.id, 'MEDICINE_NAME_FORMAT', 'NAME_STRENGTH_SHAPE', 'STRING'::"DataType",
       'How medicine names are put together: NAME_STRENGTH_SHAPE, NAME_SHAPE_STRENGTH or NAME_STRENGTH', NOW(), NOW()
FROM mst_pharmacies p
ON CONFLICT (pharmacy_id, key) DO NOTHING;
