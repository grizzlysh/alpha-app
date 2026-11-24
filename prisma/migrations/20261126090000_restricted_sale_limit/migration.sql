-- Without a prescription, at most this many pieces of one precursor or
-- obat-obat tertentu medicine per sale (0 = no limit).
INSERT INTO mst_business_parameters (uuid, pharmacy_id, key, value, data_type, description, created_at, updated_at)
SELECT gen_random_uuid()::text, p.id, 'RESTRICTED_SALE_LIMIT', '10', 'NUMBER'::"DataType",
       'Most pieces of one precursor or obat-obat tertentu medicine sold per sale without a prescription (0 = no limit)', NOW(), NOW()
FROM mst_pharmacies p
ON CONFLICT (pharmacy_id, key) DO NOTHING;

-- Narcotics and psychotropics are prescription-only.
UPDATE mst_medicine_types SET required_prescription = true
WHERE order_letter_kind IN ('NARCOTIC', 'PSYCHOTROPIC') AND required_prescription = false;
