-- Per-pharmacy display preference for names (medicines, distributors, patients,
-- doctors, classifications): UPPER, TITLE, LOWER or AS_TYPED. Existing
-- pharmacies start at UPPER.
INSERT INTO mst_business_parameters (uuid, pharmacy_id, key, value, data_type, description, created_at, updated_at)
SELECT gen_random_uuid()::text, p.id, 'NAME_DISPLAY_CASE', 'UPPER', 'STRING'::"DataType",
       'How names are displayed and printed: UPPER, TITLE, LOWER or AS_TYPED', NOW(), NOW()
FROM mst_pharmacies p
ON CONFLICT (pharmacy_id, key) DO NOTHING;
