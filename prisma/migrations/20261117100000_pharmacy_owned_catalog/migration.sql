-- Medicine shapes, types and classes become owned by each pharmacy; the shared
-- (pharmacy_id IS NULL) rows go away. Every pharmacy gets its own copy of each
-- shared row it could see, and its medicines are pointed at those copies. A
-- pharmacy that already had its own row with the same name keeps using that one.
-- Afterwards the default business parameters and the walk-in customer are
-- filled in for any pharmacy that is missing them.

-- ── mst_medicine_shapes ──
DO $$
DECLARE
  r RECORD;
  nid INT;
BEGIN
  CREATE TEMP TABLE catalog_map (pharmacy_id INT, old_id INT, new_id INT) ON COMMIT DROP;

  INSERT INTO catalog_map (pharmacy_id, old_id, new_id)
  SELECT p.id, g.id,
         (SELECT o.id FROM mst_medicine_shapes o
           WHERE o.pharmacy_id = p.id AND o.deleted_at IS NULL AND lower(o.name) = lower(g.name)
           ORDER BY o.id LIMIT 1)
  FROM mst_pharmacies p
  CROSS JOIN mst_medicine_shapes g
  WHERE g.pharmacy_id IS NULL
    AND (g.deleted_at IS NULL
         OR EXISTS (SELECT 1 FROM mst_medicines m WHERE m.pharmacy_id = p.id AND m.shape_id = g.id));

  FOR r IN SELECT cm.pharmacy_id, cm.old_id FROM catalog_map cm WHERE cm.new_id IS NULL LOOP
    INSERT INTO mst_medicine_shapes (uuid, pharmacy_id, name, status, created_at, updated_at, deleted_at, created_by_id, updated_by_id, deleted_by_id)
    SELECT gen_random_uuid()::text, r.pharmacy_id, g.name, g.status, g.created_at, NOW(), g.deleted_at, g.created_by_id, g.updated_by_id, g.deleted_by_id
    FROM mst_medicine_shapes g WHERE g.id = r.old_id
    RETURNING id INTO nid;
    UPDATE catalog_map SET new_id = nid WHERE pharmacy_id = r.pharmacy_id AND old_id = r.old_id;
  END LOOP;

  UPDATE mst_medicines m
  SET shape_id = cm.new_id
  FROM catalog_map cm
  WHERE m.shape_id = cm.old_id AND m.pharmacy_id = cm.pharmacy_id;

  DELETE FROM mst_medicine_shapes WHERE pharmacy_id IS NULL;

  DROP TABLE catalog_map;
END $$;

-- ── mst_medicine_types ──
DO $$
DECLARE
  r RECORD;
  nid INT;
BEGIN
  CREATE TEMP TABLE catalog_map (pharmacy_id INT, old_id INT, new_id INT) ON COMMIT DROP;

  INSERT INTO catalog_map (pharmacy_id, old_id, new_id)
  SELECT p.id, g.id,
         (SELECT o.id FROM mst_medicine_types o
           WHERE o.pharmacy_id = p.id AND o.deleted_at IS NULL AND lower(o.name) = lower(g.name)
           ORDER BY o.id LIMIT 1)
  FROM mst_pharmacies p
  CROSS JOIN mst_medicine_types g
  WHERE g.pharmacy_id IS NULL
    AND (g.deleted_at IS NULL
         OR EXISTS (SELECT 1 FROM mst_medicines m WHERE m.pharmacy_id = p.id AND m.type_id = g.id));

  FOR r IN SELECT cm.pharmacy_id, cm.old_id FROM catalog_map cm WHERE cm.new_id IS NULL LOOP
    INSERT INTO mst_medicine_types (uuid, pharmacy_id, name, required_prescription, status, created_at, updated_at, deleted_at, created_by_id, updated_by_id, deleted_by_id)
    SELECT gen_random_uuid()::text, r.pharmacy_id, g.name, g.required_prescription, g.status, g.created_at, NOW(), g.deleted_at, g.created_by_id, g.updated_by_id, g.deleted_by_id
    FROM mst_medicine_types g WHERE g.id = r.old_id
    RETURNING id INTO nid;
    UPDATE catalog_map SET new_id = nid WHERE pharmacy_id = r.pharmacy_id AND old_id = r.old_id;
  END LOOP;

  UPDATE mst_medicines m
  SET type_id = cm.new_id
  FROM catalog_map cm
  WHERE m.type_id = cm.old_id AND m.pharmacy_id = cm.pharmacy_id;

  DELETE FROM mst_medicine_types WHERE pharmacy_id IS NULL;

  DROP TABLE catalog_map;
END $$;

-- ── mst_medicine_classes ──
DO $$
DECLARE
  r RECORD;
  nid INT;
BEGIN
  CREATE TEMP TABLE catalog_map (pharmacy_id INT, old_id INT, new_id INT) ON COMMIT DROP;

  INSERT INTO catalog_map (pharmacy_id, old_id, new_id)
  SELECT p.id, g.id,
         (SELECT o.id FROM mst_medicine_classes o
           WHERE o.pharmacy_id = p.id AND o.deleted_at IS NULL AND lower(o.name) = lower(g.name)
           ORDER BY o.id LIMIT 1)
  FROM mst_pharmacies p
  CROSS JOIN mst_medicine_classes g
  WHERE g.pharmacy_id IS NULL
    AND (g.deleted_at IS NULL
         OR EXISTS (SELECT 1 FROM mst_medicines m WHERE m.pharmacy_id = p.id AND m.medicine_class_id = g.id));

  FOR r IN SELECT cm.pharmacy_id, cm.old_id FROM catalog_map cm WHERE cm.new_id IS NULL LOOP
    INSERT INTO mst_medicine_classes (uuid, pharmacy_id, name, status, created_at, updated_at, deleted_at, created_by_id, updated_by_id, deleted_by_id)
    SELECT gen_random_uuid()::text, r.pharmacy_id, g.name, g.status, g.created_at, NOW(), g.deleted_at, g.created_by_id, g.updated_by_id, g.deleted_by_id
    FROM mst_medicine_classes g WHERE g.id = r.old_id
    RETURNING id INTO nid;
    UPDATE catalog_map SET new_id = nid WHERE pharmacy_id = r.pharmacy_id AND old_id = r.old_id;
  END LOOP;

  UPDATE mst_medicines m
  SET medicine_class_id = cm.new_id
  FROM catalog_map cm
  WHERE m.medicine_class_id = cm.old_id AND m.pharmacy_id = cm.pharmacy_id;

  DELETE FROM mst_medicine_classes WHERE pharmacy_id IS NULL;

  DROP TABLE catalog_map;
END $$;

-- ── Constraints ──
ALTER TABLE "mst_medicine_classes" DROP CONSTRAINT "mst_medicine_classes_pharmacy_id_fkey";
ALTER TABLE "mst_medicine_shapes" DROP CONSTRAINT "mst_medicine_shapes_pharmacy_id_fkey";
ALTER TABLE "mst_medicine_types" DROP CONSTRAINT "mst_medicine_types_pharmacy_id_fkey";

ALTER TABLE "mst_medicine_classes" ALTER COLUMN "pharmacy_id" SET NOT NULL;
ALTER TABLE "mst_medicine_shapes" ALTER COLUMN "pharmacy_id" SET NOT NULL;
ALTER TABLE "mst_medicine_types" ALTER COLUMN "pharmacy_id" SET NOT NULL;

CREATE INDEX "mst_medicine_classes_pharmacy_id_idx" ON "mst_medicine_classes"("pharmacy_id");
CREATE INDEX "mst_medicine_shapes_pharmacy_id_idx" ON "mst_medicine_shapes"("pharmacy_id");
CREATE INDEX "mst_medicine_types_pharmacy_id_idx" ON "mst_medicine_types"("pharmacy_id");

ALTER TABLE "mst_medicine_shapes" ADD CONSTRAINT "mst_medicine_shapes_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "mst_pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "mst_medicine_types" ADD CONSTRAINT "mst_medicine_types_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "mst_pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "mst_medicine_classes" ADD CONSTRAINT "mst_medicine_classes_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "mst_pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── Business parameters every pharmacy needs (existing values untouched) ──
INSERT INTO mst_business_parameters (uuid, pharmacy_id, key, value, data_type, description, created_at, updated_at)
SELECT gen_random_uuid()::text, p.id, d.key,
       CASE WHEN d.key = 'RECEIPT_HEADER' THEN p.name ELSE d.value END,
       d.data_type::"DataType", d.description, NOW(), NOW()
FROM mst_pharmacies p
CROSS JOIN (VALUES
  ('MARGIN_PERCENTAGE',         '20',    'PERCENTAGE', 'Default selling price margin applied over purchase price'),
  ('PPN_PERCENTAGE_SELL',       '11',    'PERCENTAGE', 'PPN percentage charged to patients on sales (output VAT)'),
  ('PPN_PERCENTAGE_BUY',        '11',    'PERCENTAGE', 'PPN percentage on purchases from distributors (input VAT)'),
  ('MAX_DISCOUNT_PERCENTAGE',   '30',    'PERCENTAGE', 'Maximum discount percentage staff can apply to a sale item'),
  ('REORDER_LEVEL_DEFAULT',     '10',    'NUMBER',     'Default low-stock alert threshold in pieces'),
  ('LOW_STOCK_ALERT_THRESHOLD', '5',     'NUMBER',     'Critical stock threshold in pieces before urgent reorder alert'),
  ('ALLOW_FEFO_OVERRIDE',       'true',  'BOOLEAN',    'Allow staff to select non-FEFO batches during sale'),
  ('CREDIT_PAYMENT_DAYS',       '30',    'NUMBER',     'Default credit term in days for non-cash sales'),
  ('RETURN_POLICY_DAYS',        '7',     'NUMBER',     'Number of days after sale within which a return is accepted'),
  ('RECEIPT_HEADER',            '',      'STRING',     'Header text printed on patient receipts'),
  ('RECEIPT_FOOTER',            'Terima kasih atas kepercayaan Anda. Semoga lekas sembuh!', 'STRING', 'Footer text printed on patient receipts')
) AS d(key, value, data_type, description)
ON CONFLICT (pharmacy_id, key) DO NOTHING;

-- ── Walk-in customer (the POS falls back to it) ──
INSERT INTO mst_customers (uuid, pharmacy_id, customer_type, name, is_walk_in, status, created_at, updated_at)
SELECT gen_random_uuid()::text, p.id, 'PATIENT', 'Walk-in Patient', true, 'ACTIVE', NOW(), NOW()
FROM mst_pharmacies p
WHERE NOT EXISTS (SELECT 1 FROM mst_customers c WHERE c.pharmacy_id = p.id AND c.is_walk_in AND c.deleted_at IS NULL);
